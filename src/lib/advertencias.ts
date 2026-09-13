import { supabase } from './supabase'
import type { Database } from './database.types'

export type Advertencia = Database['public']['Tables']['advertencia']['Row']
export type AdvertenciaInsert = Database['public']['Tables']['advertencia']['Insert']

export async function listarAdvertencias(unidadeId: string): Promise<Advertencia[]> {
  const { data, error } = await supabase
    .from('advertencia')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarAdvertencia(dados: AdvertenciaInsert): Promise<Advertencia> {
  const { data, error } = await supabase.from('advertencia').insert(dados).select().single()
  if (error) throw error
  return data
}
