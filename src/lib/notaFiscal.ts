import { supabase } from './supabase'
import type { Database } from './database.types'
import type { NFeParseada } from './nfeXml'
import type { Catalogo } from './colaboradores'

export type NotaFiscal = Database['public']['Tables']['nota_fiscal']['Row']
export type NotaItem = Database['public']['Tables']['nota_item']['Row']

export async function listarNotas(unidadeId: string): Promise<NotaFiscal[]> {
  const { data, error } = await supabase
    .from('nota_fiscal')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listarItensNota(notaId: string): Promise<NotaItem[]> {
  const { data, error } = await supabase.from('nota_item').select('*').eq('nota_id', notaId)
  if (error) throw error
  return data ?? []
}

export async function buscarCategoriasCusto(empresaId: string): Promise<Catalogo[]> {
  const { data } = await supabase.from('cat_categoria_custo').select('id, nome').eq('empresa_id', empresaId)
  return data ?? []
}

export interface ResultadoImportacao {
  ok: boolean
  mensagem: string
  notaId?: string
}

export async function importarNFe(
  empresaId: string,
  unidadeId: string,
  nfe: NFeParseada,
): Promise<ResultadoImportacao> {
  const { data: nota, error } = await supabase
    .from('nota_fiscal')
    .insert({
      empresa_id: empresaId,
      unidade_id: unidadeId,
      chave_acesso: nfe.chaveAcesso,
      numero: nfe.numero,
      serie: nfe.serie,
      emitente_cnpj: nfe.emitenteCnpj,
      emitente_nome: nfe.emitenteNome,
      data_emissao: nfe.dataEmissao,
      valor_total: nfe.valorTotal,
      origem_arquivo: 'xml',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, mensagem: 'Essa nota fiscal já foi lançada antes (chave de acesso duplicada).' }
    }
    return { ok: false, mensagem: error.message }
  }

  if (nfe.itens.length > 0) {
    const { error: erroItens } = await supabase.from('nota_item').insert(
      nfe.itens.map((item) => ({
        nota_id: nota.id,
        codigo_fornecedor: item.codigoFornecedor,
        descricao: item.descricao,
        ncm: item.ncm,
        unidade_medida: item.unidadeMedida,
        qtd: item.qtd,
        valor_unit: item.valorUnit,
        valor_total: item.valorTotal,
      })),
    )
    if (erroItens) return { ok: false, mensagem: erroItens.message }
  }

  return { ok: true, mensagem: 'Nota importada. Falta conferir antes de virar movimento de estoque.', notaId: nota.id }
}

export async function vincularProdutoItem(itemId: string, produtoId: string | null): Promise<void> {
  const { error } = await supabase.from('nota_item').update({ produto_id: produtoId }).eq('id', itemId)
  if (error) throw error
}

export async function confirmarConferencia(
  nota: NotaFiscal,
  itens: NotaItem[],
  categoriaId: string | null,
  usuarioId: string,
): Promise<void> {
  const semProduto = itens.some((i) => !i.produto_id)
  if (semProduto) throw new Error('Todo item precisa estar vinculado a um produto do catálogo antes de confirmar.')

  const movimentos = itens.map((i) => ({
    empresa_id: nota.empresa_id,
    unidade_id: nota.unidade_id,
    produto_id: i.produto_id as string,
    data: nota.data_emissao ?? new Date().toISOString().slice(0, 10),
    tipo: 'Entrada' as const,
    qtd: i.qtd ?? 0,
    origem: 'nfe',
    origem_id: nota.id,
    obs: `NF ${nota.numero ?? ''} — ${i.descricao}`,
  }))

  const { error: erroMov } = await supabase.from('movimento_estoque').insert(movimentos)
  if (erroMov) throw erroMov

  const { error: erroCusto } = await supabase.from('custo_lancamento').insert({
    empresa_id: nota.empresa_id,
    unidade_id: nota.unidade_id,
    competencia: (nota.data_emissao ?? new Date().toISOString().slice(0, 10)).slice(0, 7),
    categoria_id: categoriaId,
    tipo: 'Variável',
    descricao: `NF ${nota.numero ?? ''} — ${nota.emitente_nome ?? ''}`,
    valor: nota.valor_total ?? 0,
    origem: 'nfe',
    origem_id: nota.id,
  })
  if (erroCusto) throw erroCusto

  const { error: erroNota } = await supabase
    .from('nota_fiscal')
    .update({ status: 'Conferida', conferida_por: usuarioId, conferida_em: new Date().toISOString() })
    .eq('id', nota.id)
  if (erroNota) throw erroNota
}

export async function rejeitarNota(notaId: string): Promise<void> {
  const { error } = await supabase.from('nota_fiscal').update({ status: 'Rejeitada' }).eq('id', notaId)
  if (error) throw error
}
