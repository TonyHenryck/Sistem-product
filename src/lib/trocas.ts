import { supabase } from './supabase'
import type { Database } from './database.types'

export type Troca = Database['public']['Tables']['troca_turno']['Row']
export type TrocaInsert = Database['public']['Tables']['troca_turno']['Insert']

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
