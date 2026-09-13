import { supabase } from './supabase'
import type { Database } from './database.types'

export type Falta = Database['public']['Tables']['falta']['Row']
export type FaltaInsert = Database['public']['Tables']['falta']['Insert']

export async function listarFaltas(unidadeId: string): Promise<Falta[]> {
  const { data, error } = await supabase
    .from('falta')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarFalta(dados: FaltaInsert): Promise<Falta> {
  const { data, error } = await supabase.from('falta').insert(dados).select().single()
  if (error) throw error
  return data
}
