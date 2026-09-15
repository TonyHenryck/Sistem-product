import { supabase } from './supabase'
import type { Database } from './database.types'

export type Troca = Database['public']['Tables']['troca_turno']['Row']
export type TrocaInsert = Database['public']['Tables']['troca_turno']['Insert']
export type TrocaUpdate = Database['public']['Tables']['troca_turno']['Update']

export async function listarTrocas(unidadeId: string): Promise<Troca[]> {
  const { data, error } = await supabase
    .from('troca_turno')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data_trocada', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarTroca(dados: TrocaInsert): Promise<Troca> {
  const { data, error } = await supabase.from('troca_turno').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function criarTrocaReciproca(base: {
  empresaId: string
  unidadeId: string
  pessoaAId: string
  dataA: string
  pessoaBId: string
  dataB: string
  motivo: string | null
  autorizadoPor: string | null
  obs: string | null
}): Promise<[Troca, Troca]> {
  const comum = {
    empresa_id: base.empresaId,
    unidade_id: base.unidadeId,
    motivo: base.motivo,
    autorizado_por: base.autorizadoPor,
    obs: base.obs,
    status: 'Concluída' as const,
    formalizada: true,
  }

  const pernaA = await criarTroca({
    ...comum,
    data_trocada: base.dataA,
    folgou_id: base.pessoaAId,
    assumiu_id: base.pessoaBId,
    data_devolucao: base.dataB,
  })
  const pernaB = await criarTroca({
    ...comum,
    data_trocada: base.dataB,
    folgou_id: base.pessoaBId,
    assumiu_id: base.pessoaAId,
    data_devolucao: base.dataA,
  })

  return [pernaA, pernaB]
}

export async function atualizarTroca(id: string, dados: TrocaUpdate): Promise<Troca> {
  const { data, error } = await supabase.from('troca_turno').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function cancelarTroca(id: string): Promise<void> {
  const { error } = await supabase.from('troca_turno').update({ status: 'Cancelada' }).eq('id', id)
  if (error) throw error
}

export async function excluirTroca(id: string): Promise<void> {
  const { error } = await supabase.from('troca_turno').delete().eq('id', id)
  if (error) throw error
}
