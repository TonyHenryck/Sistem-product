import { supabase } from './supabase'
import type { Database } from './database.types'

export type Falta = Database['public']['Tables']['falta']['Row']
export type FaltaInsert = Database['public']['Tables']['falta']['Insert']
export type FaltaUpdate = Database['public']['Tables']['falta']['Update']

export async function listarFaltas(unidadeId: string): Promise<Falta[]> {
  const { data, error } = await supabase
    .from('falta')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
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

export async function atualizarFalta(id: string, dados: FaltaUpdate): Promise<void> {
  const { error } = await supabase.from('falta').update(dados).eq('id', id)
  if (error) throw error
}

// Soft delete (ativo = false) -- falta tem valor documental (prova de
// desconto, perda de DSR, notificacao), entao nunca DELETE de verdade.
export async function excluirFalta(id: string): Promise<void> {
  const { error } = await supabase.from('falta').update({ ativo: false }).eq('id', id)
  if (error) throw error
}
