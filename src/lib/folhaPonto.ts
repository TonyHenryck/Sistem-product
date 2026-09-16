import * as XLSX from 'xlsx'
import type { NomeSaldo } from './ponto'

const ROTULO_COLABORADOR = /^colaborador:?$/i
const ROTULO_SALDO_BANCO = /^saldo do banco de horas:?$/i

function primeiroValorApos(celulas: string[], indice: number): string | null {
  for (let i = indice + 1; i < celulas.length; i++) {
    if (celulas[i]) return celulas[i]
  }
  return null
}

// Extrai pares (colaborador, saldo do banco de horas) de uma folha de ponto do
// FACEPONTO: um bloco por colaborador, com rótulo e valor lado a lado na mesma
// linha (ex: "Colaborador" | "FULANO DA SILVA"). Não tenta ler os batimentos
// diários, só o saldo final de cada bloco.
export function extrairSaldosFolhaPonto(linhas: unknown[][]): NomeSaldo[] {
  const resultado: NomeSaldo[] = []
  let nomeAtual: string | null = null

  for (const linhaBruta of linhas) {
    const celulas = linhaBruta.map((c) => (c == null ? '' : String(c).trim()))

    const idxColaborador = celulas.findIndex((c) => ROTULO_COLABORADOR.test(c))
    if (idxColaborador >= 0) {
      nomeAtual = primeiroValorApos(celulas, idxColaborador)
      continue
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

export async function lerFolhaPonto(arquivo: File): Promise<NomeSaldo[]> {
  const buffer = await arquivo.arrayBuffer()
  const pasta = XLSX.read(buffer, { type: 'array' })

  const encontrados: NomeSaldo[] = []
  for (const nomeAba of pasta.SheetNames) {
    const aba = pasta.Sheets[nomeAba]
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: '' })
    encontrados.push(...extrairSaldosFolhaPonto(linhas))
  }
  return encontrados
}
