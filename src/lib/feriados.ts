import { supabase } from './supabase'
import type { Database } from './database.types'

export type Feriado = Database['public']['Tables']['cat_feriado']['Row']

export async function listarFeriadosDoMes(empresaId: string, ano: number, mes: number): Promise<Feriado[]> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`
  const { data, error } = await supabase
    .from('cat_feriado')
    .select('*')
    .eq('empresa_id', empresaId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data')
  if (error) throw error
  return data ?? []
}

export async function criarFeriado(empresaId: string, data: string, nome: string): Promise<Feriado> {
  const { data: criado, error } = await supabase
    .from('cat_feriado')
    .insert({ empresa_id: empresaId, data, nome })
    .select()
    .single()
  if (error) throw error
  return criado
}
