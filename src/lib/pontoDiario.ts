import { supabase } from './supabase'
import type { Database } from './database.types'
import { normalizar, parseSaldo } from './ponto'
import { buscarExcecoesDoMes, gerarEscalaMes, type ColaboradorEscala, type DiaColaborador } from './escala'
import { buscarDetalheColaboradorEscala, duracaoHoras, type DetalheColaboradorEscala } from './escalaIndividual'

export type PontoRegistroDiario = Database['public']['Tables']['ponto_registro_diario']['Row']

export interface BatidaPonto {
  tipo: 'E' | 'S'
  hora: string // HH:MM
  data: string // aaaa-mm-dd — data real da batida (pode ser o dia seguinte ao da âncora, turno vira o dia)
}

export interface LinhaPontoDiario {
  nomeRelatado: string
  colaboradorId: string | null
  data: string
  funcaoRelatada: string | null
  batidas: BatidaPonto[]
  registroBruto: string
  semBatidaSaida: boolean
  regTotalRelatado: string | null
  saldoRelatado: string | null
  esperadoRelatado: string | null
  horasTrabalhadas: number
  horasEsperadas: number | null
  saldoCalculado: number | null
  // null = não deu pra calcular (colaborador sem horário/escala cadastrado);
  // false com horasEsperadas 0 = colaborador bateu ponto num dia em que não estava escalado.
  escalado: boolean | null
}

// ---------------------------------------------------------------------
// Extração de texto do PDF do FACEPONTO ("Relatório de Pontos Geral").
//
// Mesma técnica de src/lib/pdfNFe.ts (sem libs externas, DecompressionStream +
// parsing manual de objetos/streams do PDF), com uma correção importante: o
// ToUnicode desse relatório usa beginbfrange na forma de lista de destinos
// (`<lo> <hi> [<d1> <d2> ...]`), não só a forma linear (`<lo> <hi> <destino>`).
// Ignorar a forma de lista faz o parser casar hex errado com destino errado
// e sair lixo — o mesmo bug existia (e foi corrigido) em pdfNFe.ts.
// ---------------------------------------------------------------------

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate')
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

interface ObjetoPdf {
  header: string
  streamRange: [number, number] | null
}

function extrairObjetos(texto: string): Map<number, ObjetoPdf> {
  const objs = new Map<number, ObjetoPdf>()
  const re = /(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    const num = Number(m[1])
    const body = m[2]
    const bodyStart = m.index + (m[0].length - body.length - 'endobj'.length)
    const idxStreamRel = body.indexOf('stream')
    if (idxStreamRel < 0) {
      objs.set(num, { header: body, streamRange: null })
      continue
    }
    let streamStart = bodyStart + idxStreamRel + 'stream'.length
    while (texto[streamStart] === '\r' || texto[streamStart] === '\n') streamStart++
    const streamEndRel = body.indexOf('endstream', idxStreamRel)
    objs.set(num, { header: body.slice(0, idxStreamRel), streamRange: [streamStart, bodyStart + streamEndRel] })
  }
  return objs
}

function parseToUnicode(cmapText: string): Map<number, string> {
  const mapping = new Map<number, string>()
  for (const m of cmapText.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const par of m[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const src = parseInt(par[1], 16)
      const dstHex = par[2]
      let chars = ''
      for (let i = 0; i < dstHex.length; i += 4) chars += String.fromCharCode(parseInt(dstHex.slice(i, i + 4), 16))
      mapping.set(src, chars)
    }
  }
  for (const m of cmapText.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const entradaRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[((?:\s*<[0-9A-Fa-f]+>\s*)+)\])/g
    for (const par of m[1].matchAll(entradaRe)) {
      const lo = parseInt(par[1], 16)
      const hi = parseInt(par[2], 16)
      if (par[3] !== undefined) {
        const dstLo = parseInt(par[3], 16)
        for (let code = lo; code <= hi; code++) mapping.set(code, String.fromCharCode(dstLo + (code - lo)))
      } else if (par[4] !== undefined) {
        const destinos = [...par[4].matchAll(/<([0-9A-Fa-f]+)>/g)].map((d) => d[1])
        for (let i = 0; i < destinos.length && lo + i <= hi; i++) {
          const dstHex = destinos[i]
          let chars = ''
          for (let j = 0; j < dstHex.length; j += 4) chars += String.fromCharCode(parseInt(dstHex.slice(j, j + 4), 16))
          mapping.set(lo + i, chars)
        }
      }
    }
  }
  return mapping
}

interface Fragmento {
  x: number
  y: number
  texto: string
}

function renderizarPosicoes(content: string, cmap: Map<number, string>): Fragmento[] {
  const tokenRe = /(-?\d+\.?\d*)|(\((?:[^()\\]|\\.)*\))|(<[0-9A-Fa-f]+>)|(\[)|(\])|([A-Za-z*'"]+)/g
  let tx = 0
  let ty = 0
  let pendingNums: number[] = []
  const frags: Fragmento[] = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(content))) {
    if (m[1] !== undefined) {
      pendingNums.push(parseFloat(m[1]))
    } else if (m[3] !== undefined) {
      const hex = m[3].slice(1, -1)
      let s = ''
      for (let i = 0; i < hex.length; i += 4) s += cmap.get(parseInt(hex.slice(i, i + 4), 16)) ?? ''
      frags.push({ x: tx, y: ty, texto: s })
    } else if (m[6] !== undefined) {
      const op = m[6]
      if ((op === 'Td' || op === 'TD') && pendingNums.length >= 2) {
        tx += pendingNums[pendingNums.length - 2]
        ty += pendingNums[pendingNums.length - 1]
      } else if (op === 'Tm' && pendingNums.length >= 6) {
        tx = pendingNums[pendingNums.length - 2]
        ty = pendingNums[pendingNums.length - 1]
      } else if (op === 'BT') {
        tx = 0
        ty = 0
      }
      pendingNums = []
    }
  }
  return frags
}

interface LinhaBruta {
  y: number
  celulas: { x: number; texto: string }[]
}

function agruparLinhas(frags: Fragmento[]): LinhaBruta[] {
  const chaves: number[] = []
  const porY = new Map<number, { x: number; texto: string }[]>()
  for (const f of frags) {
    const ry = Math.round(f.y * 10) / 10
    let chave = chaves.find((k) => Math.abs(k - ry) <= 0.5)
    if (chave === undefined) {
      chave = ry
      chaves.push(chave)
    }
    if (!porY.has(chave)) porY.set(chave, [])
    porY.get(chave)!.push({ x: f.x, texto: f.texto })
  }
  return [...porY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, celulas]) => ({ y, celulas: celulas.sort((a, b) => a.x - b.x) }))
}

// Faixas de x (na escala do content stream) de cada coluna do relatório —
// layout fixo do gerador de relatório da FACEPONTO, não varia de empresa pra
// empresa nem de mês pra mês.
const COL_NOME: [number, number] = [80, 270]
const COL_FUNCAO: [number, number] = [271, 347]
const COL_REGISTRO: [number, number] = [348, 586]
const COL_REG_TOTAL: [number, number] = [587, 679]
const COL_SALDO: [number, number] = [680, 739]
const COL_ESPERADO: [number, number] = [740, 900]

function textoNaFaixa(celulas: { x: number; texto: string }[], faixa: [number, number]): string {
  return celulas
    .filter((c) => c.x >= faixa[0] && c.x < faixa[1])
    .sort((a, b) => a.x - b.x)
    .map((c) => c.texto)
    .join('')
}

const DATA_RE = /^(\d{2})\/(\d{2})\/(\d{4})/

function paraIso(dataBr: string): string {
  const [d, mes, a] = dataBr.split('/')
  return `${a}-${mes}-${d}`
}

interface LinhaExtraidaBruta {
  data: string
  nome: string
  funcao: string
  registroBruto: string
  regTotal: string
  saldo: string
  esperado: string
}

async function extrairLinhasBrutas(arquivo: File): Promise<LinhaExtraidaBruta[]> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const texto = new TextDecoder('latin1').decode(bytes)
  const objs = extrairObjetos(texto)

  const decoded = new Map<number, string>()
  for (const [num, info] of objs) {
    if (!info.streamRange) continue
    let [s, e] = info.streamRange
    while (e > s && (bytes[e - 1] === 0x0d || bytes[e - 1] === 0x0a)) e--
    const raw = bytes.slice(s, e)
    let inflated: Uint8Array
    try {
      inflated = await inflate(raw)
    } catch {
      inflated = raw
    }
    decoded.set(num, new TextDecoder('latin1').decode(inflated))
  }

  // Resolve o ToUnicode de cada fonte (/Type /Font) em vez de misturar cmaps
  // de fontes diferentes — ver nota no topo do arquivo.
  const cmap = new Map<number, string>()
  const toUnicodeVistos = new Set<number>()
  for (const [, info] of objs) {
    if (!/\/Type\s*\/Font\b/.test(info.header)) continue
    const tu = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(info.header)
    if (!tu) continue
    const objToUnicode = Number(tu[1])
    if (toUnicodeVistos.has(objToUnicode)) continue
    toUnicodeVistos.add(objToUnicode)
    for (const [k, v] of parseToUnicode(decoded.get(objToUnicode) ?? '')) cmap.set(k, v)
  }
  if (cmap.size === 0) {
    for (const t of decoded.values()) {
      if (t.includes('beginbfchar') || t.includes('beginbfrange')) {
        for (const [k, v] of parseToUnicode(t)) cmap.set(k, v)
      }
    }
  }

  const paginas: number[][] = []
  for (const [, info] of objs) {
    if (/\/Type\s*\/Page(?!s)/.test(info.header)) {
      const cm = /\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/.exec(info.header)
      if (cm) paginas.push([...cm[1].matchAll(/(\d+)\s+0\s+R/g)].map((rm) => Number(rm[1])))
    }
  }

  const linhas: LinhaExtraidaBruta[] = []

  for (const pagina of paginas) {
    const content = pagina.map((n) => decoded.get(n) ?? '').join('\n')
    const frags = renderizarPosicoes(content, cmap)
    const sublinhas = agruparLinhas(frags)

    // O relatório imprime Nome/Função só na primeira linha do bloco de cada
    // colaborador (como uma célula mesclada visualmente); as linhas de data
    // seguintes do mesmo bloco, e os fragmentos de continuação de turno que
    // vira a noite, não repetem nome nem função. Tentar "adivinhar" esse
    // vínculo por proximidade de y produz atribuição errada (testado e
    // descartado) — então só lemos o nome/função quando estão na própria
    // linha da data; o resto fica marcado como não identificado pra revisão
    // manual na tela de importação, em vez de arriscar juntar gente errada.
    for (const linha of sublinhas) {
      const textoLinha = linha.celulas.map((c) => c.texto).join('')
      const m = DATA_RE.exec(textoLinha)
      if (!m) continue

      linhas.push({
        data: paraIso(m[0]),
        nome: textoNaFaixa(linha.celulas, COL_NOME).trim(),
        funcao: textoNaFaixa(linha.celulas, COL_FUNCAO).trim(),
        registroBruto: textoNaFaixa(linha.celulas, COL_REGISTRO).trim(),
        regTotal: textoNaFaixa(linha.celulas, COL_REG_TOTAL).trim(),
        saldo: textoNaFaixa(linha.celulas, COL_SALDO).trim(),
        esperado: textoNaFaixa(linha.celulas, COL_ESPERADO).trim(),
      })
    }
  }

  return linhas
}

// ---------------------------------------------------------------------
// Parsing da coluna "Registro": pares E:hh:mm / S:hh:mm separados por "-",
// com "*dd/mm/aaaa -" marcando que as batidas seguintes já são do dia
// seguinte (turno que vira a noite), e "Saída não reg." quando falta bater.
// ---------------------------------------------------------------------

const TOKEN_REGISTRO_RE = /([ES]):(\d{2}):(\d{2})|\*(\d{2})\/(\d{2})\/(\d{4})|Saída não reg\./g

interface RegistroParseado {
  batidas: BatidaPonto[]
  semBatidaSaida: boolean
}

function parseRegistro(registroBruto: string, dataAncoraIso: string): RegistroParseado {
  const batidas: BatidaPonto[] = []
  let semBatidaSaida = false
  let dataAtual = dataAncoraIso

  for (const m of registroBruto.matchAll(TOKEN_REGISTRO_RE)) {
    if (m[4] !== undefined) {
      dataAtual = `${m[6]}-${m[5]}-${m[4]}`
    } else if (m[1] !== undefined) {
      batidas.push({ tipo: m[1] as 'E' | 'S', hora: `${m[2]}:${m[3]}`, data: dataAtual })
    } else if (m[0] === 'Saída não reg.') {
      semBatidaSaida = true
    }
  }

  return { batidas, semBatidaSaida }
}

function calcularHorasTrabalhadas(batidas: BatidaPonto[]): number {
  const ordenadas = [...batidas].sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))
  let total = 0
  let entradaAberta: BatidaPonto | null = null
  for (const b of ordenadas) {
    if (b.tipo === 'E') {
      entradaAberta = b
    } else if (b.tipo === 'S' && entradaAberta) {
      const ini = new Date(`${entradaAberta.data}T${entradaAberta.hora}:00`).getTime()
      const fim = new Date(`${b.data}T${b.hora}:00`).getTime()
      if (fim > ini) total += (fim - ini) / 3600000
      entradaAberta = null
    }
  }
  return Math.round(total * 100) / 100
}

// ---------------------------------------------------------------------
// Casa o nome relatado com o colaborador cadastrado (mesma normalização
// usada em src/lib/ponto.ts).
// ---------------------------------------------------------------------

function casarColaborador(nome: string, colaboradores: { id: string; nome: string }[]): string | null {
  const mapa = new Map(colaboradores.map((c) => [normalizar(c.nome), c.id]))
  return mapa.get(normalizar(nome)) ?? null
}

// ---------------------------------------------------------------------
// Horas esperadas: vem da jornada real cadastrada (cat_escala/cat_horario),
// não do que a FACEPONTO calculou — ela cadastra quem faz 12h como se fosse
// 8h e o "Esperado" dela sai errado (armadilha conhecida, ver CLAUDE.md).
// ---------------------------------------------------------------------

export interface InfoEsperado {
  escalado: boolean
  horas: number | null
}

export async function calcularHorasEsperadas(
  unidadeId: string,
  pares: { colaboradorId: string; data: string }[],
): Promise<Map<string, InfoEsperado>> {
  const resultado = new Map<string, InfoEsperado>()
  if (pares.length === 0) return resultado

  const colaboradorIds = [...new Set(pares.map((p) => p.colaboradorId))]
  const detalhesLista = await Promise.all(colaboradorIds.map((id) => buscarDetalheColaboradorEscala(id)))
  const detalhes = new Map<string, DetalheColaboradorEscala>()
  detalhesLista.forEach((d, i) => {
    if (d) detalhes.set(colaboradorIds[i], d)
  })

  const colaboradoresEscala: ColaboradorEscala[] = colaboradorIds
    .map((id) => detalhes.get(id))
    .filter((d): d is DetalheColaboradorEscala => Boolean(d))
    .map((d) => ({
      id: d.id,
      nome: d.nome,
      turno: null,
      local_id: null,
      atende_multiplos: false,
      escala: d.escala ? { nome: d.escala.nome, cor: d.escala.cor, trabalha_dia_par: d.escala.trabalhaDiaPar } : null,
    }))

  const meses = [...new Set(pares.map((p) => p.data.slice(0, 7)))]
  const mapasPorMes = new Map<string, Map<string, DiaColaborador[]>>()
  for (const chaveMes of meses) {
    const [anoStr, mesStr] = chaveMes.split('-')
    const ano = Number(anoStr)
    const mes = Number(mesStr)
    const excecoes = await buscarExcecoesDoMes(unidadeId, ano, mes)
    mapasPorMes.set(chaveMes, gerarEscalaMes(ano, mes, colaboradoresEscala, excecoes))
  }

  for (const { colaboradorId, data } of pares) {
    const chave = `${colaboradorId}|${data}`
    if (resultado.has(chave)) continue

    const detalhe = detalhes.get(colaboradorId)
    if (!detalhe || !detalhe.horario) {
      resultado.set(chave, { escalado: false, horas: null })
      continue
    }

    const diaEntry = mapasPorMes.get(data.slice(0, 7))?.get(data)?.find((d) => d.colaboradorId === colaboradorId)
    if (diaEntry) {
      const horas = duracaoHoras(detalhe.horario.horaInicio, detalhe.horario.horaFim, detalhe.horario.viraODia)
      resultado.set(chave, { escalado: true, horas: Math.round(horas * 100) / 100 })
    } else {
      resultado.set(chave, { escalado: false, horas: 0 })
    }
  }

  return resultado
}

// ---------------------------------------------------------------------
// Função principal: lê o PDF, casa com colaboradores e calcula esperado/saldo.
// ---------------------------------------------------------------------

export async function extrairRelatorioFaceponto(
  arquivo: File,
  colaboradores: { id: string; nome: string }[],
  unidadeId: string,
): Promise<LinhaPontoDiario[]> {
  const brutas = await extrairLinhasBrutas(arquivo)
  if (brutas.length === 0) {
    throw new Error('Não consegui reconhecer o formato desse PDF. Confira se é o "Relatório de Pontos Geral" do FACEPONTO.')
  }

  const parciais = brutas
    .map((l) => {
      const { batidas, semBatidaSaida } = parseRegistro(l.registroBruto, l.data)
      return {
        ...l,
        colaboradorId: casarColaborador(l.nome, colaboradores),
        batidas,
        semBatidaSaida,
        horasTrabalhadas: calcularHorasTrabalhadas(batidas),
      }
    })
    .filter((l) => l.batidas.length > 0 || l.semBatidaSaida)

  const resolvidas = parciais.filter((l): l is typeof l & { colaboradorId: string } => Boolean(l.colaboradorId))
  const mapaEsperado = await calcularHorasEsperadas(
    unidadeId,
    resolvidas.map((l) => ({ colaboradorId: l.colaboradorId, data: l.data })),
  )

  return parciais.map((l) => {
    const info = l.colaboradorId ? mapaEsperado.get(`${l.colaboradorId}|${l.data}`) : undefined
    const horasEsperadas = info?.horas ?? null
    const saldoCalculado = horasEsperadas != null ? Math.round((l.horasTrabalhadas - horasEsperadas) * 100) / 100 : null

    return {
      nomeRelatado: l.nome,
      colaboradorId: l.colaboradorId,
      data: l.data,
      funcaoRelatada: l.funcao || null,
      batidas: l.batidas,
      registroBruto: l.registroBruto,
      semBatidaSaida: l.semBatidaSaida,
      regTotalRelatado: parseSaldo(l.regTotal),
      saldoRelatado: parseSaldo(l.saldo),
      esperadoRelatado: parseSaldo(l.esperado),
      horasTrabalhadas: l.horasTrabalhadas,
      horasEsperadas,
      saldoCalculado,
      escalado: info?.escalado ?? null,
    }
  })
}

export async function importarPontoDiario(
  empresaId: string,
  unidadeId: string,
  linhas: LinhaPontoDiario[],
  arquivoOrigem: string,
): Promise<number> {
  const registros = linhas
    .filter((l): l is LinhaPontoDiario & { colaboradorId: string } => Boolean(l.colaboradorId))
    .map((l) => ({
      empresa_id: empresaId,
      unidade_id: unidadeId,
      colaborador_id: l.colaboradorId,
      data: l.data,
      nome_relatado: l.nomeRelatado,
      funcao_relatada: l.funcaoRelatada,
      batidas: l.batidas,
      registro_bruto: l.registroBruto,
      sem_batida_saida: l.semBatidaSaida,
      reg_total_relatado: l.regTotalRelatado,
      saldo_relatado: l.saldoRelatado,
      esperado_relatado: l.esperadoRelatado,
      horas_trabalhadas: l.horasTrabalhadas,
      horas_esperadas: l.horasEsperadas,
      saldo_calculado: l.saldoCalculado,
      arquivo_origem: arquivoOrigem,
    }))

  if (registros.length === 0) return 0

  const { error } = await supabase.from('ponto_registro_diario').upsert(registros, { onConflict: 'colaborador_id,data' })
  if (error) throw error
  return registros.length
}

export async function listarPontoRegistroDiario(
  unidadeId: string,
  inicio: string,
  fim: string,
): Promise<PontoRegistroDiario[]> {
  const { data, error } = await supabase
    .from('ponto_registro_diario')
    .select('*')
    .eq('unidade_id', unidadeId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })
  if (error) throw error
  return data ?? []
}
