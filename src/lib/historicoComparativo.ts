import { supabase } from './supabase'

export interface HeadcountMes {
  competencia: string
  total: number
}

export interface AbsenteismoMesHistorico {
  competencia: string
  diasPerdidos: number
  faltasInjustificadas: number
}

function competenciaEFimDoMes(hoje: Date, mesesAtras: number): { competencia: string; fimDoMes: string } {
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras + 1, 0)
  const competencia = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}`
  const fimDoMes = fim.toISOString().slice(0, 10)
  return { competencia, fimDoMes }
}

export async function buscarHistoricoHeadcount(unidadeId: string, meses = 6): Promise<HeadcountMes[]> {
  const { data, error } = await supabase
    .from('colaborador')
    .select('admissao, desligamento')
    .eq('unidade_id', unidadeId)
    .not('admissao', 'is', null)
  if (error) throw error

  const lista = data ?? []
  const hoje = new Date()
  const resultado: HeadcountMes[] = []

  for (let i = meses - 1; i >= 0; i--) {
    const { competencia, fimDoMes } = competenciaEFimDoMes(hoje, i)
    const total = lista.filter(
      (c) => c.admissao! <= fimDoMes && (!c.desligamento || c.desligamento > fimDoMes),
    ).length
    resultado.push({ competencia, total })
  }

  return resultado
}

export async function buscarHistoricoAbsenteismo(unidadeId: string, meses = 6): Promise<AbsenteismoMesHistorico[]> {
  const { data, error } = await supabase
    .from('v_absenteismo_mes')
    .select('competencia, dias_perdidos, faltas_injustificadas')
    .eq('unidade_id', unidadeId)
    .order('competencia', { ascending: false })
    .limit(meses)
  if (error) throw error

  return (data ?? [])
    .map((r) => ({
      competencia: r.competencia,
      diasPerdidos: r.dias_perdidos ?? 0,
      faltasInjustificadas: r.faltas_injustificadas ?? 0,
    }))
    .reverse()
}
