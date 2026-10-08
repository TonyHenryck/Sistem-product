import { normalizar } from './ponto'
import type { Produto } from './almoxarifado'

// ---------------------------------------------------------------------
// Leitura do PDF "Posição de Estoque" (EST31100) exportado do Teknisa.
//
// Esse PDF é bem mais simples que o do FACEPONTO: usa fontes padrão
// (Helvetica/Helvetica-Bold, WinAnsiEncoding), sem CMap/ToUnicode — os
// bytes das strings literais já são o texto certo, só precisa decodificar
// como latin1. O que é diferente aqui é a estrutura do arquivo: o Teknisa
// gera um PDF 1.5+ com a página e os objetos dentro de um Object Stream
// comprimido (/Type /ObjStm), não como "N 0 obj ... endobj" soltos — por
// isso o parser precisa expandir esse stream antes de achar o conteúdo
// das páginas.
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

function extrairObjetosTopo(texto: string): Map<number, ObjetoPdf> {
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

// Resolve todos os objetos do PDF (topo + os que vêm empacotados dentro de
// Object Streams) num único mapa numero -> texto do dicionário/corpo, mais
// um mapa separado numero -> bytes decodificados de quem tem stream próprio
// (usado pros content streams das páginas).
async function resolverObjetos(bytes: Uint8Array, texto: string) {
  const topo = extrairObjetosTopo(texto)
  const corpos = new Map<number, string>()
  const streams = new Map<number, string>()

  for (const [num, info] of topo) {
    corpos.set(num, info.header)
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
    streams.set(num, new TextDecoder('latin1').decode(inflated))
  }

  for (const [num, info] of topo) {
    if (!/\/Type\s*\/ObjStm\b/.test(info.header)) continue
    const n = Number(/\/N\s+(\d+)/.exec(info.header)?.[1] ?? '0')
    const first = Number(/\/First\s+(\d+)/.exec(info.header)?.[1] ?? '0')
    const textoObjStm = streams.get(num)
    if (!textoObjStm || n === 0) continue

    const cabecalho = textoObjStm.slice(0, first).trim().split(/\s+/).map(Number)
    const pares: [number, number][] = []
    for (let i = 0; i < cabecalho.length; i += 2) pares.push([cabecalho[i], cabecalho[i + 1]])

    for (let i = 0; i < pares.length; i++) {
      const [objNum, offset] = pares[i]
      const fimRel = i + 1 < pares.length ? pares[i + 1][1] : textoObjStm.length - first
      corpos.set(objNum, textoObjStm.slice(first + offset, first + fimRel))
    }
  }

  return { corpos, streams }
}

interface Fragmento {
  x: number
  y: number
  texto: string
}

// Esse gerador (BIRT/iText) posiciona cada trecho de texto com "cm" (muda a
// origem) seguido de "Tm 0 0" (zera dentro dessa origem) — não acumula com
// Td como o parser do FACEPONTO fazia. Por isso track separado de origem
// (ox,oy, setada por cm) e posição dentro dela (tx,ty, setada por Tm/Td).
function renderizarPosicoes(content: string): Fragmento[] {
  const tokenRe = /(-?\d+\.?\d*)|(\((?:[^()\\]|\\.)*\))|(<[0-9A-Fa-f]+>)|(\[)|(\])|([A-Za-z*'"]+)/g
  let ox = 0
  let oy = 0
  let tx = 0
  let ty = 0
  let pendingNums: number[] = []
  const frags: Fragmento[] = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(content))) {
    if (m[1] !== undefined) {
      pendingNums.push(parseFloat(m[1]))
    } else if (m[2] !== undefined) {
      const raw = m[2].slice(1, -1).replace(/\\(.)/g, '$1')
      frags.push({ x: ox + tx, y: oy + ty, texto: raw })
    } else if (m[6] !== undefined) {
      const op = m[6]
      if ((op === 'Td' || op === 'TD') && pendingNums.length >= 2) {
        tx += pendingNums[pendingNums.length - 2]
        ty += pendingNums[pendingNums.length - 1]
      } else if (op === 'Tm' && pendingNums.length >= 6) {
        tx = pendingNums[pendingNums.length - 2]
        ty = pendingNums[pendingNums.length - 1]
      } else if (op === 'cm' && pendingNums.length >= 6) {
        ox = pendingNums[pendingNums.length - 2]
        oy = pendingNums[pendingNums.length - 1]
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
    .sort((a, b) => b[0] - a[0])
    .map(([y, celulas]) => ({ y, celulas: celulas.sort((a, b) => a.x - b.x) }))
}

const CODIGO_RE = /^\d+(?:\.\d+)+$/

function parseNumeroBr(texto: string): number {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isNaN(n) ? 0 : n
}

// "1.01.01.005.00" -> "10101005" — tira o último grupo (variante, "00" na
// imensa maioria dos casos) e junta o resto sem ponto. Esse é exatamente o
// formato do codigo em seed/produtos.csv (conferido contra o PDF real).
export function codigoDerivadoDe(codigoTeknisa: string): string {
  return codigoTeknisa.replace(/\.\d+$/, '').replace(/\./g, '')
}

export interface LinhaEstoqueTeknisa {
  codigoTeknisa: string
  codigoDerivado: string
  nomeProduto: string
  unidade: string
  qtde: number
  valorUnitario: number
  valorTotal: number
  produtoId: string | null
}

interface LinhaBrutaProduto {
  codigo: string
  nome: string
  unidade: string
  qtde: number
  valorUnitario: number
  valorTotal: number
}

function dataBrParaIso(dataBr: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr.trim())
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

interface ExtracaoBruta {
  dataPosicao: string | null
  unidadeNome: string | null
  linhas: LinhaBrutaProduto[]
}

async function extrairBruto(arquivo: File): Promise<ExtracaoBruta> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const texto = new TextDecoder('latin1').decode(bytes)
  const { corpos, streams } = await resolverObjetos(bytes, texto)

  const paginas: number[] = []
  for (const [, corpo] of corpos) {
    if (!/\/Type\s*\/Page(?!s)/.test(corpo)) continue
    const cm = /\/Contents\s+(\d+)\s+0\s+R/.exec(corpo)
    if (cm) paginas.push(Number(cm[1]))
  }

  if (paginas.length === 0) {
    throw new Error('Não consegui achar o conteúdo das páginas nesse PDF. Confira se é o relatório de Posição de Estoque (EST31100) do Teknisa.')
  }

  const linhas: LinhaBrutaProduto[] = []
  let dataPosicao: string | null = null
  let unidadeNome: string | null = null

  for (const numConteudo of paginas) {
    const content = streams.get(numConteudo)
    if (!content) continue
    const frags = renderizarPosicoes(content)
    const sublinhas = agruparLinhas(frags)

    for (const linha of sublinhas) {
      const primeira = linha.celulas[0]?.texto.trim()

      if (linha.celulas.length === 7 && CODIGO_RE.test(primeira ?? '')) {
        const [codigo, nome, , unidade, qtde, valorUnitario, valorTotal] = linha.celulas
        linhas.push({
          codigo: codigo.texto.trim(),
          nome: nome.texto.trim(),
          unidade: unidade.texto.trim(),
          qtde: parseNumeroBr(qtde.texto),
          valorUnitario: parseNumeroBr(valorUnitario.texto),
          valorTotal: parseNumeroBr(valorTotal.texto),
        })
        continue
      }

      if (!dataPosicao && primeira === 'Data da Posição' && linha.celulas[1]) {
        dataPosicao = dataBrParaIso(linha.celulas[1].texto)
      }
      if (!unidadeNome && /^\d{4}$/.test(primeira ?? '') && linha.celulas[1]) {
        unidadeNome = linha.celulas[1].texto.trim()
      }
    }
  }

  return { dataPosicao, unidadeNome, linhas }
}

function casarProduto(
  linha: LinhaBrutaProduto,
  codigoDerivado: string,
  produtos: Pick<Produto, 'id' | 'codigo' | 'nome'>[],
  porCodigo: Map<string, string>,
): string | null {
  const porCod = porCodigo.get(codigoDerivado)
  if (porCod) return porCod

  const nomeNorm = normalizar(linha.nome)
  const direto = produtos.find((p) => normalizar(p.nome) === nomeNorm)
  if (direto) return direto.id

  const parcial = produtos.find((p) => {
    const pNorm = normalizar(p.nome)
    return nomeNorm.includes(pNorm) || pNorm.includes(nomeNorm)
  })
  return parcial?.id ?? null
}

export interface PosicaoEstoqueTeknisa {
  dataPosicao: string | null
  unidadeNome: string | null
  linhas: LinhaEstoqueTeknisa[]
}

export async function extrairPosicaoEstoqueTeknisa(
  arquivo: File,
  produtos: Pick<Produto, 'id' | 'codigo' | 'nome'>[],
): Promise<PosicaoEstoqueTeknisa> {
  const bruto = await extrairBruto(arquivo)
  const porCodigo = new Map<string, string>()
  for (const p of produtos) if (p.codigo) porCodigo.set(p.codigo, p.id)

  const linhas = bruto.linhas.map((linha) => {
    const codigoDerivado = codigoDerivadoDe(linha.codigo)
    return {
      codigoTeknisa: linha.codigo,
      codigoDerivado,
      nomeProduto: linha.nome,
      unidade: linha.unidade,
      qtde: linha.qtde,
      valorUnitario: linha.valorUnitario,
      valorTotal: linha.valorTotal,
      produtoId: casarProduto(linha, codigoDerivado, produtos, porCodigo),
    }
  })

  return { dataPosicao: bruto.dataPosicao, unidadeNome: bruto.unidadeNome, linhas }
}
