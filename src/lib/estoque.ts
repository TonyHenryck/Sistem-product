import { supabase } from './supabase'
import type { Database } from './database.types'

export type ItemEstoque = Database['public']['Tables']['item_estoque']['Row']
export type ItemEstoqueInsert = Database['public']['Tables']['item_estoque']['Insert']

export async function listarItensEstoque(unidadeId: string): Promise<ItemEstoque[]> {
  const { data, error } = await supabase
    .from('item_estoque')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data ?? []
}

export async function criarItemEstoque(dados: ItemEstoqueInsert): Promise<ItemEstoque> {
  const { data, error } = await supabase.from('item_estoque').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function atualizarQtdAtual(id: string, qtdAtual: number): Promise<void> {
  const { error } = await supabase.from('item_estoque').update({ qtd_atual: qtdAtual }).eq('id', id)
  if (error) throw error
}

export type ItemEstoqueUpdate = Database['public']['Tables']['item_estoque']['Update']

export async function atualizarItemEstoque(id: string, dados: ItemEstoqueUpdate): Promise<void> {
  const { error } = await supabase.from('item_estoque').update(dados).eq('id', id)
  if (error) throw error
}

// Soft delete (ativo = false) -- mesmo padrao dos outros catalogos do
// sistema, mantem o historico em vez de apagar de vez.
export async function excluirItemEstoque(id: string): Promise<void> {
  const { error } = await supabase.from('item_estoque').update({ ativo: false }).eq('id', id)
  if (error) throw error
}
