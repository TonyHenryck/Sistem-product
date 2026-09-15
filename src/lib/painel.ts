import { supabase } from './supabase'
import { buscarColaboradoresParaEscala, buscarExcecoesDoMes, gerarEscalaMes } from './escala'

export interface CustoMes {
  competencia: string
  custoFixo: number
  custoVariavel: number
  custoTotal: number
}

export interface AbsenteismoMes {
  faltasInjustificadas: number
  atestados: number
  atrasos: number
  diasPerdidos: number
}

export async function buscarHeadcount(unidadeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('colaborador')
    .select('id', { count: 'exact', head: true })
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
  if (error) throw error
  return count ?? 0
}

export async function buscarAbsenteismoMes(unidadeId: string, competencia: string): Promise<AbsenteismoMes> {
  const { data } = await supabase
    .from('v_absenteismo_mes')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('competencia', competencia)
    .maybeSingle()

  return {
    faltasInjustificadas: data?.faltas_injustificadas ?? 0,
    atestados: data?.atestados ?? 0,
    atrasos: data?.atrasos ?? 0,
    diasPerdidos: data?.dias_perdidos ?? 0,
  }
}

export async function buscarSerieCustoMensal(unidadeId: string, meses = 6): Promise<CustoMes[]> {
  const { data, error } = await supabase
    .from('v_custo_mes')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('competencia', { ascending: false })
    .limit(meses)
  if (error) throw error

  return (data ?? [])
    .map((r) => ({
      competencia: r.competencia,
      custoFixo: r.custo_fixo ?? 0,
      custoVariavel: r.custo_variavel ?? 0,
      custoTotal: r.custo_total ?? 0,
    }))
    .reverse()
}

export async function contarFurosEscalaMes(unidadeId: string, ano: number, mes: number): Promise<number> {
  const { data: locais } = await supabase
    .from('local_operacional')
    .select('id')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)

  if (!locais || locais.length === 0) return 0

  const excecoes = await buscarExcecoesDoMes(unidadeId, ano, mes)
  let furos = 0

  for (const local of locais) {
    const colaboradores = await buscarColaboradoresParaEscala(unidadeId, local.id)
    const mapa = gerarEscalaMes(ano, mes, colaboradores, excecoes)
    for (const dia of mapa.values()) {
      if (dia.length === 0) furos++
    }
  }

  return furos
}
