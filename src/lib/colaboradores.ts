import { supabase } from './supabase'
import type { Database } from './database.types'

export type Colaborador = Database['public']['Tables']['colaborador']['Row']
export type ColaboradorInsert = Database['public']['Tables']['colaborador']['Insert']
export type ColaboradorUpdate = Database['public']['Tables']['colaborador']['Update']
export type DadoSensivel = Database['public']['Tables']['colaborador_dado_sensivel']['Row']
export type DadoSensivelInsert = Database['public']['Tables']['colaborador_dado_sensivel']['Insert']

export interface Catalogo {
  id: string
  nome: string
}

export interface Catalogos {
  funcoes: Catalogo[]
  escalas: Catalogo[]
  locais: Catalogo[]
  beneficios: Catalogo[]
  jornadas: Catalogo[]
}

export interface FiltrosColaborador {
  funcaoId?: string
  escalaId?: string
  localId?: string
  area?: string
  incluirDesligados?: boolean
}

export async function listarColaboradoresAtivos(unidadeId: string): Promise<Catalogo[]> {
  const { data, error } = await supabase
    .from('colaborador')
    .select('id, nome')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data ?? []
}

export async function listarNomesColaboradores(unidadeId: string): Promise<Catalogo[]> {
  const { data, error } = await supabase.from('colaborador').select('id, nome').eq('unidade_id', unidadeId).order('nome')
  if (error) throw error
  return data ?? []
}

export async function buscarCatalogos(empresaId: string, unidadeId: string): Promise<Catalogos> {
  const [funcoes, escalas, locais, beneficios, jornadas] = await Promise.all([
    supabase.from('cat_funcao').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true),
    supabase.from('cat_escala').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true),
    supabase.from('local_operacional').select('id, nome').eq('unidade_id', unidadeId).eq('ativo', true),
    supabase.from('cat_beneficio').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true),
    supabase.from('cat_jornada').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true),
  ])

  return {
    funcoes: funcoes.data ?? [],
    escalas: escalas.data ?? [],
    locais: locais.data ?? [],
    beneficios: beneficios.data ?? [],
    jornadas: jornadas.data ?? [],
  }
}

export async function listarColaboradores(
  unidadeId: string,
  filtros: FiltrosColaborador,
): Promise<Colaborador[]> {
  let query = supabase.from('colaborador').select('*').eq('unidade_id', unidadeId)

  if (!filtros.incluirDesligados) query = query.eq('ativo', true)
  if (filtros.funcaoId) query = query.eq('funcao_id', filtros.funcaoId)
  if (filtros.escalaId) query = query.eq('escala_id', filtros.escalaId)
  if (filtros.localId) query = query.eq('local_id', filtros.localId)
  if (filtros.area) query = query.ilike('area', `%${filtros.area}%`)

  const { data, error } = await query.order('nome')
  if (error) throw error
  return data ?? []
}

export async function buscarColaborador(id: string): Promise<Colaborador | null> {
  const { data, error } = await supabase.from('colaborador').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function criarColaborador(dados: ColaboradorInsert): Promise<Colaborador> {
  const { data, error } = await supabase.from('colaborador').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function atualizarColaborador(id: string, dados: ColaboradorUpdate): Promise<Colaborador> {
  const { data, error } = await supabase.from('colaborador').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function desligarColaborador(
  id: string,
  dados: { desligamento: string; motivo_saida: string; aviso_previo: ColaboradorUpdate['aviso_previo'] },
): Promise<void> {
  const { error } = await supabase
    .from('colaborador')
    .update({ ativo: false, ...dados })
    .eq('id', id)
  if (error) throw error
}

// Registro cadastrado por engano ou que nao e um colaborador de fato.
// Nao apaga a linha (historico como falta, ponto e troca referenciam o id) -
// so tira o registro da lista ativa.
export async function excluirColaborador(id: string): Promise<void> {
  const { error } = await supabase
    .from('colaborador')
    .update({ ativo: false, motivo_saida: 'Registro excluído (cadastro incorreto)' })
    .eq('id', id)
  if (error) throw error
}

export async function criarJornada(dados: {
  empresa_id: string
  nome: string
  carga_mensal: number | null
  carga_semanal: number | null
}): Promise<void> {
  const { error } = await supabase.from('cat_jornada').insert(dados)
  if (error) throw error
}

export async function buscarDadoSensivel(colaboradorId: string): Promise<DadoSensivel | null> {
  const { data, error } = await supabase
    .from('colaborador_dado_sensivel')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function salvarDadoSensivel(dados: DadoSensivelInsert): Promise<void> {
  const { error } = await supabase.from('colaborador_dado_sensivel').upsert(dados)
  if (error) throw error
}
