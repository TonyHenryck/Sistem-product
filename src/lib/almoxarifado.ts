import { supabase } from './supabase'
import type { Database } from './database.types'

export type Produto = Database['public']['Tables']['produto']['Row']
export type ProdutoInsert = Database['public']['Tables']['produto']['Insert']
export type MovimentoEstoque = Database['public']['Tables']['movimento_estoque']['Row']
export type MovimentoEstoqueInsert = Database['public']['Tables']['movimento_estoque']['Insert']
export type Contagem = Database['public']['Tables']['contagem']['Row']
export type ContagemInsert = Database['public']['Tables']['contagem']['Insert']
export type ContagemItem = Database['public']['Tables']['contagem_item']['Row']
export type Requisicao = Database['public']['Tables']['requisicao']['Row']
export type RequisicaoInsert = Database['public']['Tables']['requisicao']['Insert']

// ---------- produto / saldo ----------

export async function listarProdutos(empresaId: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produto')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data ?? []
}

export async function criarProduto(dados: ProdutoInsert): Promise<Produto> {
  const { data, error } = await supabase.from('produto').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function buscarSaldos(unidadeId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('v_saldo_produto')
    .select('produto_id, saldo')
    .eq('unidade_id', unidadeId)
  if (error) throw error
  return new Map((data ?? []).map((s) => [s.produto_id, s.saldo ?? 0]))
}

export async function buscarSaldoProduto(unidadeId: string, produtoId: string): Promise<number> {
  const { data } = await supabase
    .from('v_saldo_produto')
    .select('saldo')
    .eq('unidade_id', unidadeId)
    .eq('produto_id', produtoId)
    .maybeSingle()
  return data?.saldo ?? 0
}

// ---------- movimento ----------

export async function listarMovimentos(unidadeId: string): Promise<MovimentoEstoque[]> {
  const { data, error } = await supabase
    .from('movimento_estoque')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarMovimento(dados: MovimentoEstoqueInsert): Promise<MovimentoEstoque> {
  const { data, error } = await supabase.from('movimento_estoque').insert(dados).select().single()
  if (error) throw error
  return data
}

// ---------- contagem ----------

export async function listarContagens(unidadeId: string): Promise<Contagem[]> {
  const { data, error } = await supabase
    .from('contagem')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function criarContagem(dados: ContagemInsert): Promise<Contagem> {
  const { data, error } = await supabase.from('contagem').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function fecharContagem(id: string): Promise<void> {
  const { error } = await supabase
    .from('contagem')
    .update({ status: 'Fechada', fechada_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function listarItensContagem(contagemId: string): Promise<ContagemItem[]> {
  const { data, error } = await supabase.from('contagem_item').select('*').eq('contagem_id', contagemId)
  if (error) throw error
  return data ?? []
}

export async function adicionarItemContagem(
  contagemId: string,
  produtoId: string,
  qtdSistema: number,
  qtdContada: number,
): Promise<void> {
  const { error } = await supabase.from('contagem_item').upsert(
    { contagem_id: contagemId, produto_id: produtoId, qtd_sistema: qtdSistema, qtd_contada: qtdContada },
    { onConflict: 'contagem_id,produto_id' },
  )
  if (error) throw error
}

// ---------- requisição ----------

export async function listarRequisicoes(unidadeId: string): Promise<Requisicao[]> {
  const { data, error } = await supabase
    .from('requisicao')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarRequisicao(dados: RequisicaoInsert): Promise<Requisicao> {
  const { data, error } = await supabase.from('requisicao').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function atenderRequisicao(
  id: string,
  qtdEntregue: number,
  entreguePorId: string | null,
  qtdPedida: number,
): Promise<void> {
  const { error } = await supabase
    .from('requisicao')
    .update({
      qtd_entregue: qtdEntregue,
      entregue_por_id: entreguePorId,
      status: qtdEntregue >= qtdPedida ? 'Atendida' : 'Atendida em parte',
    })
    .eq('id', id)
  if (error) throw error
}
