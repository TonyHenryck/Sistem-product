import { supabase } from './supabase'
import type { Database } from './database.types'

export type PontoCompetencia = Database['public']['Tables']['ponto_competencia']['Row']

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Aceita "8:30", "-2:15", "8" (horas inteiras) ou "8,5" / "8.5" (decimal).
// Retorna no formato de intervalo do Postgres ('HH:MM:SS') ou null se invalido.
export function parseSaldo(texto: string): string | null {
  const valor = texto.trim().replace(',', '.')
  if (!valor) return null

  const comHoraMinuto = valor.match(/^(-)?(\d{1,4}):(\d{2})$/)
  if (comHoraMinuto) {
    const [, sinal, horas, minutos] = comHoraMinuto
    return `${sinal ?? ''}${horas.padStart(2, '0')}:${minutos}:00`
  }

  const decimal = Number(valor)
  if (!Number.isNaN(decimal)) {
    const sinal = decimal < 0 ? '-' : ''
    const abs = Math.abs(decimal)
    const horas = Math.floor(abs)
    const minutos = Math.round((abs - horas) * 60)
    return `${sinal}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`
  }

  return null
}

// Converte o intervalo vindo do Postgres (ex: '08:30:00', '-02:15:00') para 'HH:MM'.
export function formatarIntervalo(valor: string | null): string {
  if (!valor) return ''
  const negativo = valor.trim().startsWith('-')
  const partes = valor.replace('-', '').split(':')
  const horas = partes[0]?.padStart(2, '0') ?? '00'
  const minutos = partes[1]?.padStart(2, '0') ?? '00'
  return `${negativo ? '-' : ''}${horas}:${minutos}`
}

export interface LinhaImportada {
  nomeOriginal: string
  colaboradorId: string | null
  saldoTexto: string
  saldoIntervalo: string | null
}

export function processarTexto(
  texto: string,
  colaboradores: { id: string; nome: string }[],
): LinhaImportada[] {
  const mapaNomes = new Map(colaboradores.map((c) => [normalizar(c.nome), c.id]))

  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const separador = linhas[0]?.includes('\t') ? '\t' : linhas[0]?.includes(';') ? ';' : ','

  return linhas.map((linha) => {
    const idx = linha.lastIndexOf(separador)
    const nome = idx >= 0 ? linha.slice(0, idx).trim() : linha.trim()
    const saldoTexto = idx >= 0 ? linha.slice(idx + 1).trim() : ''

    return {
      nomeOriginal: nome,
      colaboradorId: mapaNomes.get(normalizar(nome)) ?? null,
      saldoTexto,
      saldoIntervalo: parseSaldo(saldoTexto),
    }
  })
}

export async function importarSaldosSistema(
  empresaId: string,
  unidadeId: string,
  competencia: string,
  linhas: { colaboradorId: string; saldoIntervalo: string }[],
): Promise<void> {
  const registros = linhas.map((l) => ({
    empresa_id: empresaId,
    unidade_id: unidadeId,
    colaborador_id: l.colaboradorId,
    competencia,
    saldo_sistema: l.saldoIntervalo,
  }))

  const { error } = await supabase
    .from('ponto_competencia')
    .upsert(registros, { onConflict: 'colaborador_id,competencia' })
  if (error) throw error
}

export async function listarPontoCompetencia(
  unidadeId: string,
  competencia: string,
): Promise<PontoCompetencia[]> {
  const { data, error } = await supabase
    .from('ponto_competencia')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('competencia', competencia)
  if (error) throw error
  return data ?? []
}

export async function atualizarSaldoConferido(id: string, saldoIntervalo: string | null): Promise<void> {
  const { error } = await supabase
    .from('ponto_competencia')
    .update({ saldo_conferido: saldoIntervalo })
    .eq('id', id)
  if (error) throw error
}
