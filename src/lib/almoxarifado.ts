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
export type CategoriaProduto = Database['public']['Tables']['cat_categoria_produto']['Row']
export type UnidadeMedida = Database['public']['Tables']['cat_unidade_medida']['Row']

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

export async function listarCategoriasProduto(empresaId: string): Promise<CategoriaProduto[]> {
  const { data, error } = await supabase
    .from('cat_categoria_produto')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data ?? []
}

// Upsert por (empresa_id, nome): se já existia uma categoria com esse nome
// desativada (excluída antes), reativa em vez de bater no unique e falhar.
export async function criarCategoriaProduto(empresaId: string, nome: string): Promise<CategoriaProduto> {
  const { data, error } = await supabase
    .from('cat_categoria_produto')
    .upsert({ empresa_id: empresaId, nome, ativo: true }, { onConflict: 'empresa_id,nome' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCategoriaProduto(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('cat_categoria_produto').update({ nome }).eq('id', id)
  if (error) throw error
}

// Soft delete (ativo = false) — FK de produto.categoria_id não tem cascade,
// então não dá pra apagar de vez sem risco; some da lista, mas o histórico
// de quem já usava essa categoria não quebra.
export async function excluirCategoriaProduto(id: string): Promise<void> {
  const { error } = await supabase.from('cat_categoria_produto').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

export async function listarUnidadesMedida(empresaId: string): Promise<UnidadeMedida[]> {
  const { data, error } = await supabase
    .from('cat_unidade_medida')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data ?? []
}

// Upsert por (empresa_id, nome): se já existia uma unidade com esse nome
// desativada (excluída antes), reativa em vez de bater no unique e falhar.
export async function criarUnidadeMedida(empresaId: string, nome: string, sigla: string): Promise<UnidadeMedida> {
  const { data, error } = await supabase
    .from('cat_unidade_medida')
    .upsert({ empresa_id: empresaId, nome, sigla, ativo: true }, { onConflict: 'empresa_id,nome' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarUnidadeMedida(id: string, nome: string, sigla: string): Promise<void> {
  const { error } = await supabase.from('cat_unidade_medida').update({ nome, sigla }).eq('id', id)
  if (error) throw error
}

// Soft delete (ativo = false) — FK de produto.unidade_medida_id não tem
// cascade, então some da lista, mas o histórico de quem já usava não quebra.
export async function excluirUnidadeMedida(id: string): Promise<void> {
  const { error } = await supabase.from('cat_unidade_medida').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

export async function criarProduto(dados: ProdutoInsert): Promise<Produto> {
  const { data, error } = await supabase.from('produto').insert(dados).select().single()
  if (error) throw error
  return data
}

export async function atualizarProdutoCategoria(id: string, categoriaId: string | null): Promise<void> {
  const { error } = await supabase.from('produto').update({ categoria_id: categoriaId }).eq('id', id)
  if (error) throw error
}

export async function atualizarProdutoUnidade(id: string, unidadeMedidaId: string | null): Promise<void> {
  const { error } = await supabase.from('produto').update({ unidade_medida_id: unidadeMedidaId }).eq('id', id)
  if (error) throw error
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

export async function buscarMovimentosPeriodo(
  unidadeId: string,
  dataInicio: string,
  dataFim: string,
): Promise<MovimentoEstoque[]> {
  const { data, error } = await supabase
    .from('movimento_estoque')
    .select('*')
    .eq('unidade_id', unidadeId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
  if (error) throw error
  return data ?? []
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

// Fechar a contagem lança em movimento_estoque o ajuste de cada item com
// diferença (qtd_contada - qtd_sistema): é isso que faz o saldo real
// (v_saldo_produto, somado a partir de movimento_estoque) refletir o que
// foi contado, e não só guardar o número pra conferência.
export async function fecharContagem(id: string): Promise<void> {
  const { data: contagem, error: erroContagem } = await supabase.from('contagem').select('*').eq('id', id).single()
  if (erroContagem) throw erroContagem

  const itens = await listarItensContagem(id)
  const ajustes = itens
    .filter((i) => i.diferenca != null && i.diferenca !== 0)
    .map((i) => ({
      empresa_id: contagem.empresa_id,
      unidade_id: contagem.unidade_id,
      produto_id: i.produto_id,
      data: contagem.data,
      tipo: 'Ajuste' as const,
      qtd: i.diferenca as number,
      origem: 'contagem',
      origem_id: contagem.id,
      obs: 'Ajuste de estoque pela contagem física.',
    }))

  if (ajustes.length > 0) {
    const { error: erroAjuste } = await supabase.from('movimento_estoque').insert(ajustes)
    if (erroAjuste) throw erroAjuste
  }

  const { error } = await supabase
    .from('contagem')
    .update({ status: 'Fechada', fechada_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Apaga a contagem (contagem_item cai junto via cascade) e desfaz qualquer
// ajuste de estoque que ela tenha lançado ao ser fechada — pra limpar
// contagem de teste sem deixar saldo errado pra trás.
export async function excluirContagem(id: string): Promise<void> {
  const { error: erroAjuste } = await supabase
    .from('movimento_estoque')
    .delete()
    .eq('origem', 'contagem')
    .eq('origem_id', id)
  if (erroAjuste) throw erroAjuste

  const { error } = await supabase.from('contagem').delete().eq('id', id)
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
