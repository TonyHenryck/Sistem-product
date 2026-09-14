export interface ItemNFe {
  codigoFornecedor: string | null
  descricao: string
  ncm: string | null
  unidadeMedida: string | null
  qtd: number | null
  valorUnit: number | null
  valorTotal: number | null
}

export interface NFeParseada {
  chaveAcesso: string | null
  numero: string | null
  serie: string | null
  emitenteCnpj: string | null
  emitenteNome: string | null
  dataEmissao: string | null
  valorTotal: number | null
  itens: ItemNFe[]
}

function texto(el: Element | Document, tag: string): string | null {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() || null
}

function numero(el: Element | Document, tag: string): number | null {
  const valor = texto(el, tag)
  if (!valor) return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
}

export function parseNFeXml(xmlTexto: string): NFeParseada | { erro: string } {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xmlTexto, 'application/xml')
  } catch {
    return { erro: 'Não foi possível ler o arquivo como XML.' }
  }

  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { erro: 'Arquivo XML inválido ou corrompido.' }
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0]
  if (!infNFe) {
    return { erro: 'XML não parece ser uma NFe (tag infNFe não encontrada).' }
  }

  let chaveAcesso: string | null = null
  const id = infNFe.getAttribute('Id')
  if (id) {
    const digitos = id.replace(/\D/g, '')
    if (digitos.length === 44) chaveAcesso = digitos
  }
  if (!chaveAcesso) chaveAcesso = texto(doc, 'chNFe')

  const emit = doc.getElementsByTagName('emit')[0]
  const total = doc.getElementsByTagName('ICMSTot')[0]

  const dhEmi = texto(doc, 'dhEmi') ?? texto(doc, 'dEmi')
  const dataEmissao = dhEmi ? dhEmi.slice(0, 10) : null

  const itens: ItemNFe[] = Array.from(doc.getElementsByTagName('det')).map((det) => {
    const prod = det.getElementsByTagName('prod')[0]
    return {
      codigoFornecedor: prod ? texto(prod, 'cProd') : null,
      descricao: (prod ? texto(prod, 'xProd') : null) ?? 'Item sem descrição',
      ncm: prod ? texto(prod, 'NCM') : null,
      unidadeMedida: prod ? texto(prod, 'uCom') : null,
      qtd: prod ? numero(prod, 'qCom') : null,
      valorUnit: prod ? numero(prod, 'vUnCom') : null,
      valorTotal: prod ? numero(prod, 'vProd') : null,
    }
  })

  return {
    chaveAcesso,
    numero: texto(doc, 'nNF'),
    serie: texto(doc, 'serie'),
    emitenteCnpj: emit ? texto(emit, 'CNPJ') : null,
    emitenteNome: emit ? texto(emit, 'xNome') : null,
    dataEmissao,
    valorTotal: total ? numero(total, 'vNF') : null,
    itens,
  }
}
