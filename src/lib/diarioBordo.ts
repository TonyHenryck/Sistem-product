import { supabase } from './supabase'
import type { Database } from './database.types'

export type EntradaDiario = Database['public']['Tables']['diario_bordo']['Row']
export type EntradaDiarioInsert = Database['public']['Tables']['diario_bordo']['Insert']

export async function listarDiarioBordo(unidadeId: string): Promise<EntradaDiario[]> {
  const { data, error } = await supabase
    .from('diario_bordo')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarEntradaDiario(dados: EntradaDiarioInsert): Promise<EntradaDiario> {
  const { data, error } = await supabase.from('diario_bordo').insert(dados).select().single()
  if (error) throw error
  return data
}
