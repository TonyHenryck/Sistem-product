import type { ItemNFe, NFeParseada } from './nfeXml'

// Extrai o texto de um DANFE (o PDF impresso da NFe) sem nenhuma biblioteca externa,
// usando so a API nativa do navegador (TextDecoder + DecompressionStream). O DANFE
// nao tem estrutura de dados como o XML - o que existe e texto posicionado numa pagina,
// entao aqui reconstruimos a tabela de itens usando a posicao (x,y) de cada trecho de
// texto e os rotulos das colunas (DESCRIÇÃO, UNID, QTD., VLR.UNIT., VLR.TOTAL), que sao
// padronizados por lei em todo DANFE modelo 1/1-A. NCM/CST/CFOP saem colados sem separador
// nesse tipo de PDF e nao tem como separar com certeza - mas tambem nao sao usados no
// almoxarifado, entao nem tentamos.

interface ObjInfo {
  header: string
  streamRange: [number, number] | null
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate')
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

function extrairObjetos(texto: string): Map<number, ObjInfo> {
  const objs = new Map<number, ObjInfo>()
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
    for (const par of m[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const lo = parseInt(par[1], 16)
      const hi = parseInt(par[2], 16)
      const dstLo = parseInt(par[3], 16)
      for (let code = lo; code <= hi; code++) mapping.set(code, String.fromCharCode(dstLo + (code - lo)))
    }
  }
  return mapping
}

interface Frag {
  x: number
  y: number
  text: string
}

function renderizarPosicoes(content: string, cmap: Map<number, string>): Frag[] {
  const tokenRe = /(-?\d+\.?\d*)|(\((?:[^()\\]|\\.)*\))|(<[0-9A-Fa-f]+>)|(\[)|(\])|([A-Za-z*'"]+)/g
  let tx = 0
  let ty = 0
  let pendingNums: number[] = []
  const frags: Frag[] = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(content))) {
    if (m[1] !== undefined) {
      pendingNums.push(parseFloat(m[1]))
    } else if (m[2] !== undefined) {
      frags.push({ x: tx, y: ty, text: m[2].slice(1, -1) })
    } else if (m[3] !== undefined) {
      const hex = m[3].slice(1, -1)
      let s = ''
      for (let i = 0; i < hex.length; i += 4) s += cmap.get(parseInt(hex.slice(i, i + 4), 16)) ?? ''
      frags.push({ x: tx, y: ty, text: s })
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

interface Celula {
  x: number
  texto: string
}

interface Linha {
  y: number
  celulas: Celula[]
}

function agruparLinhas(frags: Frag[]): Linha[] {
  const chaves: number[] = []
  const porY = new Map<number, Celula[]>()
  for (const f of frags) {
    const ry = Math.round(f.y * 10) / 10
    let chave = chaves.find((k) => Math.abs(k - ry) <= 0.5)
    if (chave === undefined) {
      chave = ry
      chaves.push(chave)
    }
    if (!porY.has(chave)) porY.set(chave, [])
    porY.get(chave)!.push({ x: f.x, texto: f.text })
  }
  return [...porY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, celulas]) => ({ y, celulas: celulas.sort((a, b) => a.x - b.x) }))
}

function mesclarCelulas(celulas: Celula[]): Celula[] {
  const mescladas: Celula[] = []
  for (const c of celulas) {
    const ultima = mescladas[mescladas.length - 1]
    if (ultima && Math.abs(ultima.x - c.x) < 0.5) {
      ultima.texto += c.texto
    } else {
      mescladas.push({ ...c })
    }
  }
  return mescladas
}

function normChave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function numeroPtBr(s: string): number | null {
  const limpo = s.replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  const n = Number(limpo)
  return Number.isNaN(n) ? null : n
}

const REGEX_UNID_QTD_VLR = /^([A-Za-zÀ-ÿ]+)\s*([\d.]+,\d{4})([\d.]+,\d{2})$/

function camposDaLinha(linha: Linha, bucket: (x: number) => string): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const c of mesclarCelulas(linha.celulas)) {
    const nome = bucket(c.x)
    campos[nome] = (campos[nome] ?? '') + c.texto
  }
  return campos
}

function finalizarItem(
  campos: Record<string, string>,
  descricaoKey: string,
  unidKey: string | undefined,
  totalKey: string | undefined,
): ItemNFe {
  const descricao = (campos[descricaoKey] ?? '').trim()
  const fusao = (unidKey ? (campos[unidKey] ?? '') : '').trim()
  const m = REGEX_UNID_QTD_VLR.exec(fusao)
  const valorTotalTexto = (totalKey ? (campos[totalKey] ?? '') : '').trim()
  return {
    codigoFornecedor: null,
    descricao: descricao || 'Item sem descrição',
    ncm: null,
    unidadeMedida: m ? m[1] : null,
    qtd: m ? numeroPtBr(m[2]) : null,
    valorUnit: m ? numeroPtBr(m[3]) : null,
    valorTotal: numeroPtBr(valorTotalTexto),
  }
}

function coletarItens(
  linhas: Linha[],
  headerIdx: number,
  passo: 1 | -1,
  bucket: (x: number) => string,
  descricaoKey: string,
  unidKey: string | undefined,
  totalKey: string | undefined,
): ItemNFe[] {
  let i = headerIdx + passo
  let semDescricao = 0
  let achouAlgum = false
  let ultimoValido = headerIdx
  while (i >= 0 && i < linhas.length) {
    const campos = camposDaLinha(linhas[i], bucket)
    const descricao = (campos[descricaoKey] ?? '').trim()
    if (descricao) {
      achouAlgum = true
      semDescricao = 0
      ultimoValido = i
    } else {
      semDescricao++
      if (achouAlgum && semDescricao > 6) break
      if (!achouAlgum && semDescricao > 8) break
      if (achouAlgum) ultimoValido = i
    }
    i += passo
  }
  if (!achouAlgum) return []

  const lo = Math.min(headerIdx + passo, ultimoValido)
  const hi = Math.max(headerIdx + passo, ultimoValido)
  const grupos: Record<string, string>[] = []
  let atual: Record<string, string> | null = null
  for (let idx = lo; idx <= hi; idx++) {
    const campos = camposDaLinha(linhas[idx], bucket)
    const descricao = (campos[descricaoKey] ?? '').trim()
    if (descricao) {
      if (atual) grupos.push(atual)
      atual = campos
    } else if (atual) {
      for (const [k, v] of Object.entries(campos)) atual[k] = (atual[k] ?? '') + v
    }
  }
  if (atual) grupos.push(atual)

  return grupos
    .map((g) => finalizarItem(g, descricaoKey, unidKey, totalKey))
    .filter((it) => it.qtd != null || it.valorUnit != null)
}

export async function parseNFePdf(arquivo: File): Promise<NFeParseada | { erro: string }> {
  try {
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

    const cmap = new Map<number, string>()
    for (const t of decoded.values()) {
      if (t.includes('beginbfchar') || t.includes('beginbfrange')) {
        for (const [k, v] of parseToUnicode(t)) cmap.set(k, v)
      }
    }

    let contentNums: number[] = []
    for (const [, info] of objs) {
      if (/\/Type\s*\/Page(?!s)/.test(info.header)) {
        const cm = /\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/.exec(info.header)
        if (cm) {
          contentNums = [...cm[1].matchAll(/(\d+)\s+0\s+R/g)].map((rm) => Number(rm[1]))
          break
        }
      }
    }
    if (contentNums.length === 0) {
      return { erro: 'Não consegui localizar o conteúdo desse PDF. Ele pode não ser um DANFE (PDF da NFe).' }
    }

    const content = contentNums.map((n) => decoded.get(n) ?? '').join('\n')
    const frags = renderizarPosicoes(content, cmap)
    const linhas = agruparLinhas(frags)

    let headerIdx = -1
    for (let i = 0; i < linhas.length; i++) {
      if (mesclarCelulas(linhas[i].celulas).some((c) => normChave(c.texto).includes('DESCRICAODOPRODUTO'))) {
        headerIdx = i
        break
      }
    }
    if (headerIdx < 0) {
      return {
        erro: 'Não encontrei a tabela de itens nesse PDF. Se for um romaneio ou outro documento (não o DANFE da NFe), anexe pelo XML ou pela opção de anexo depois de importar.',
      }
    }

    const colunas = mesclarCelulas(linhas[headerIdx].celulas)
      .map((c) => ({ nome: normChave(c.texto), x: c.x }))
      .sort((a, b) => a.x - b.x)

    function bucket(x: number): string {
      for (let i = 0; i < colunas.length; i++) {
        const proximo = colunas[i + 1]
        const limite = proximo ? (colunas[i].x + proximo.x) / 2 : Infinity
        if (x < limite) return colunas[i].nome
      }
      return colunas[colunas.length - 1]?.nome ?? ''
    }

    const descricaoKey = colunas.find((c) => c.nome.includes('DESCRICAODOPRODUTO'))?.nome
    const unidKey = colunas.find((c) => c.nome.includes('UNID'))?.nome
    const totalKey = colunas.find((c) => c.nome.includes('TOTAL'))?.nome
    if (!descricaoKey) {
      return { erro: 'Não consegui separar as colunas da tabela de itens desse PDF.' }
    }

    const itensFrente = coletarItens(linhas, headerIdx, 1, bucket, descricaoKey, unidKey, totalKey)
    const itensTras = coletarItens(linhas, headerIdx, -1, bucket, descricaoKey, unidKey, totalKey)
    const itens = itensFrente.length >= itensTras.length ? itensFrente : itensTras

    if (itens.length === 0) {
      return { erro: 'Encontrei a tabela de itens, mas não consegui ler nenhum item. Tente importar pelo XML.' }
    }

    const textoCompleto = linhas
      .map((l) => mesclarCelulas(l.celulas).map((c) => c.texto).join(' '))
      .join('\n')

    const chaveDigits = textoCompleto.replace(/\D/g, ' ').match(/\d{44}/)
    const numero = /N[ºo]\s*:?\s*(\d{3,9})/i.exec(textoCompleto)?.[1] ?? null
    const serie = /S[ée]rie\s*:?\s*(\d{1,3})/i.exec(textoCompleto)?.[1] ?? null
    const emitenteNome = /RECEBEMOS DE\s*(.+?)\s*(?:OS|DOS) PRODUTOS/i.exec(textoCompleto)?.[1]?.trim() ?? null

    const cnpjs = [...new Set([...textoCompleto.matchAll(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)].map((m) => m[0]))]
    const linhaComData = linhas.find((l) => {
      const t = mesclarCelulas(l.celulas).map((c) => c.texto).join(' ')
      return /\d{2}[-/]\d{2}[-/]\d{4}/.test(t) && /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(t)
    })
    const destinatarioCnpj = linhaComData
      ? /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.exec(
          mesclarCelulas(linhaComData.celulas).map((c) => c.texto).join(' '),
        )?.[0]
      : null
    const emitenteCnpj = cnpjs.find((c) => c !== destinatarioCnpj) ?? cnpjs[0] ?? null

    const valorTotalTexto = /VALOR TOTAL:\s*R\$\s*([\d.,]+)/i.exec(textoCompleto)?.[1]
    const valorTotal = valorTotalTexto ? numeroPtBr(valorTotalTexto) : null

    const emissaoMatch = /EMISS[ÃA]O:\s*(\d{2})-(\d{2})-(\d{4})/i.exec(textoCompleto)
    const dataEmissao = emissaoMatch ? `${emissaoMatch[3]}-${emissaoMatch[2]}-${emissaoMatch[1]}` : null

    return {
      chaveAcesso: chaveDigits?.[0] ?? null,
      numero,
      serie,
      emitenteCnpj,
      emitenteNome,
      dataEmissao,
      valorTotal,
      itens,
    }
  } catch {
    return { erro: 'Não consegui ler esse PDF. Tente importar pelo XML da NFe.' }
  }
}
