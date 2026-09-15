import { supabase } from './supabase'
import { buscarColaboradoresParaEscala, buscarExcecoesDoMes, gerarEscalaMes } from './escala'
import type { Database } from './database.types'

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

export type TipoFalta = Database['public']['Tables']['falta']['Row']['tipo']

export const TIPOS_FALTA: TipoFalta[] = [
  'Falta injustificada',
  'Atestado médico',
  'Falta abonada',
  'Atraso',
  'Saída antecipada',
  'Suspensão',
]

export interface RankingFaltaColaborador {
  colaboradorId: string
  nome: string
  funcao: string
  total: number
  diasPerdidos: number
  porTipo: Record<TipoFalta, number>
}

export interface FaltaPorFuncao {
  funcao: string
  total: number
  diasPerdidos: number
  porTipo: Record<TipoFalta, number>
}

function tipoVazio(): Record<TipoFalta, number> {
  return Object.fromEntries(TIPOS_FALTA.map((t) => [t, 0])) as Record<TipoFalta, number>
}

export type PeriodoIndicador = 'mes' | '3m' | '6m'

export function intervaloPeriodo(periodo: PeriodoIndicador): { inicio: string; fim: string } {
  const hoje = new Date()
  const mesesAtras = periodo === 'mes' ? 0 : periodo === '3m' ? 2 : 5
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1).toISOString().slice(0, 10)
  const fim = hoje.toISOString().slice(0, 10)
  return { inicio, fim }
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

export async function buscarIndicadoresFaltas(
  unidadeId: string,
  empresaId: string,
  inicio: string,
  fim: string,
): Promise<{ ranking: RankingFaltaColaborador[]; porFuncao: FaltaPorFuncao[] }> {
  const [{ data: faltas, error }, { data: colaboradores }, { data: funcoes }] = await Promise.all([
    supabase.from('falta').select('colaborador_id, tipo, dias').eq('unidade_id', unidadeId).gte('data', inicio).lte('data', fim),
    supabase.from('colaborador').select('id, nome, funcao_id').eq('unidade_id', unidadeId),
    supabase.from('cat_funcao').select('id, nome').eq('empresa_id', empresaId),
  ])
  if (error) throw error

  const mapaColaborador = new Map((colaboradores ?? []).map((c) => [c.id, c]))
  const mapaFuncao = new Map((funcoes ?? []).map((f) => [f.id, f.nome]))

  const porColaborador = new Map<string, RankingFaltaColaborador>()
  const porFuncaoMap = new Map<string, FaltaPorFuncao>()

  for (const f of faltas ?? []) {
    const colaborador = mapaColaborador.get(f.colaborador_id)
    const nomeFuncao = (colaborador?.funcao_id && mapaFuncao.get(colaborador.funcao_id)) || 'Sem função'
    const dias = f.dias ?? 0
    const tipo = f.tipo as TipoFalta

    if (!porColaborador.has(f.colaborador_id)) {
      porColaborador.set(f.colaborador_id, {
        colaboradorId: f.colaborador_id,
        nome: colaborador?.nome ?? '—',
        funcao: nomeFuncao,
        total: 0,
        diasPerdidos: 0,
        porTipo: tipoVazio(),
      })
    }
    const registroColaborador = porColaborador.get(f.colaborador_id)!
    registroColaborador.total += 1
    registroColaborador.diasPerdidos += dias
    registroColaborador.porTipo[tipo] += 1

    if (!porFuncaoMap.has(nomeFuncao)) {
      porFuncaoMap.set(nomeFuncao, { funcao: nomeFuncao, total: 0, diasPerdidos: 0, porTipo: tipoVazio() })
    }
    const registroFuncao = porFuncaoMap.get(nomeFuncao)!
    registroFuncao.total += 1
    registroFuncao.diasPerdidos += dias
    registroFuncao.porTipo[tipo] += 1
  }

  return {
    ranking: [...porColaborador.values()].sort((a, b) => b.total - a.total),
    porFuncao: [...porFuncaoMap.values()].sort((a, b) => b.total - a.total),
  }
}
