import { supabase } from './supabase'
import type { Database } from './database.types'
import type { Catalogo } from './colaboradores'

export type Diaria = Database['public']['Tables']['diaria']['Row']
export type DiariaInsert = Database['public']['Tables']['diaria']['Insert']
export type DiariaUpdate = Database['public']['Tables']['diaria']['Update']
export type DiariaBeneficiario = Database['public']['Tables']['diaria_beneficiario']['Row']
export type DiariaBeneficiarioInsert = Database['public']['Tables']['diaria_beneficiario']['Insert']

export async function buscarValorPadrao(
  empresaId: string,
  unidadeId: string,
  turno: 'Diurno' | 'Noturno',
): Promise<number | null> {
  const chave = turno === 'Diurno' ? 'diaria_diurna' : 'diaria_noturna'
  const { data } = await supabase
    .from('config_regra')
    .select('valor, unidade_id')
    .eq('empresa_id', empresaId)
    .eq('chave', chave)
    .or(`unidade_id.eq.${unidadeId},unidade_id.is.null`)

  if (!data || data.length === 0) return null
  const linha = data.find((r) => r.unidade_id === unidadeId) ?? data[0]
  const numero = Number(linha.valor)
  return Number.isNaN(numero) ? null : numero
}

export async function buscarMotivosAusencia(empresaId: string): Promise<Catalogo[]> {
  const { data } = await supabase
    .from('cat_motivo_ausencia')
    .select('id, nome')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
  return data ?? []
}

export async function listarDiarias(unidadeId: string): Promise<Diaria[]> {
  const { data, error } = await supabase
    .from('diaria')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function criarDiaria(
  dados: DiariaInsert,
  beneficiario?: Omit<DiariaBeneficiarioInsert, 'diaria_id' | 'empresa_id'>,
): Promise<Diaria> {
  const { data, error } = await supabase.from('diaria').insert(dados).select().single()
  if (error) throw error

  if (beneficiario && !dados.cobriu_id) {
    const { error: erroBenef } = await supabase.from('diaria_beneficiario').insert({
      diaria_id: data.id,
      empresa_id: dados.empresa_id,
      ...beneficiario,
    })
    if (erroBenef) throw erroBenef
  }

  return data
}

export async function buscarBeneficiario(diariaId: string): Promise<DiariaBeneficiario | null> {
  const { data, error } = await supabase
    .from('diaria_beneficiario')
    .select('*')
    .eq('diaria_id', diariaId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function atualizarDiaria(
  id: string,
  dados: DiariaUpdate,
  beneficiario?: Omit<DiariaBeneficiarioInsert, 'diaria_id' | 'empresa_id'>,
): Promise<Diaria> {
  const { data, error } = await supabase.from('diaria').update(dados).eq('id', id).select().single()
  if (error) throw error

  if (beneficiario && !dados.cobriu_id && dados.empresa_id) {
    const { error: erroBenef } = await supabase
      .from('diaria_beneficiario')
      .upsert({ diaria_id: id, empresa_id: dados.empresa_id, ...beneficiario }, { onConflict: 'diaria_id' })
    if (erroBenef) throw erroBenef
  }

  return data
}

export async function cancelarDiaria(id: string): Promise<void> {
  const { error } = await supabase.from('diaria').update({ status: 'Cancelado' }).eq('id', id)
  if (error) throw error
}

export async function excluirDiaria(id: string): Promise<void> {
  const { error } = await supabase.from('diaria').delete().eq('id', id)
  if (error) throw error
}
