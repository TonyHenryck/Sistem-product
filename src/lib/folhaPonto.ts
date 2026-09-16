import * as XLSX from 'xlsx'
import { normalizar, type NomeSaldo } from './ponto'

const ROTULO_SALDO_BANCO = /^saldo do banco de horas:?$/i

function primeiroValorApos(celulas: string[], indice: number): string | null {
  for (let i = indice + 1; i < celulas.length; i++) {
    if (celulas[i]) return celulas[i]
  }
  return null
}

// Extrai pares (colaborador, saldo do banco de horas) de uma folha de ponto do
// FACEPONTO: um bloco por colaborador, com os batimentos diários e, no fim,
// "Saldo do Banco de Horas". Não existe um rótulo confiável marcando o início
// de cada bloco (o rótulo "Colaborador" aparece só uma vez, como cabeçalho),
// então o início do bloco é reconhecido pelo nome bater com um colaborador já
// cadastrado no sistema.
export function extrairSaldosFolhaPonto(
  linhas: unknown[][],
  colaboradores: { id: string; nome: string }[],
): NomeSaldo[] {
  const nomesConhecidos = new Map(colaboradores.map((c) => [normalizar(c.nome), c.nome]))

  const resultado: NomeSaldo[] = []
  let nomeAtual: string | null = null

  for (const linhaBruta of linhas) {
    const celulas = linhaBruta.map((c) => (c == null ? '' : String(c).trim()))

    for (const celula of celulas) {
      if (!celula) continue
      const conhecido = nomesConhecidos.get(normalizar(celula))
      if (conhecido) nomeAtual = conhecido
    }

    const idxSaldo = celulas.findIndex((c) => ROTULO_SALDO_BANCO.test(c))
    if (idxSaldo >= 0 && nomeAtual) {
      const valor = primeiroValorApos(celulas, idxSaldo)
      if (valor) {
        resultado.push({ nome: nomeAtual, saldoTexto: valor })
        nomeAtual = null
      }
    }
  }

  return resultado
}

export async function lerFolhaPonto(
  arquivo: File,
  colaboradores: { id: string; nome: string }[],
): Promise<NomeSaldo[]> {
  const buffer = await arquivo.arrayBuffer()
  const pasta = XLSX.read(buffer, { type: 'array' })

  const encontrados: NomeSaldo[] = []
  for (const nomeAba of pasta.SheetNames) {
    const aba = pasta.Sheets[nomeAba]
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: '' })
    encontrados.push(...extrairSaldosFolhaPonto(linhas, colaboradores))
  }
  return encontrados
}
