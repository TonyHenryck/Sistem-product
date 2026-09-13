import { supabase } from './supabase'
import type { Database } from './database.types'
import { listarNomesColaboradores } from './colaboradores'

export type EnvioFopag = Database['public']['Tables']['envio_fopag']['Row']
export type PendenciaPagamento = Database['public']['Tables']['pendencia_pagamento']['Row']
export type Diaria = Database['public']['Tables']['diaria']['Row']

export async function buscarDiaLimite(empresaId: string, unidadeId: string): Promise<number | null> {
  const { data } = await supabase
    .from('config_regra')
    .select('valor, unidade_id')
    .eq('empresa_id', empresaId)
    .eq('chave', 'dia_fopag')
    .or(`unidade_id.eq.${unidadeId},unidade_id.is.null`)

  if (!data || data.length === 0) return null
  const linha = data.find((r) => r.unidade_id === unidadeId) ?? data[0]
  const numero = Number(linha.valor)
  return Number.isNaN(numero) ? null : numero
}

export async function buscarEnvio(unidadeId: string, competencia: string): Promise<EnvioFopag | null> {
  const { data, error } = await supabase
    .from('envio_fopag')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('competencia', competencia)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function salvarEnvio(dados: {
  empresaId: string
  unidadeId: string
  competencia: string
  status: EnvioFopag['status']
  dataEnvio?: string | null
  enviadoPor?: string | null
}): Promise<void> {
  const { error } = await supabase.from('envio_fopag').upsert(
    {
      empresa_id: dados.empresaId,
      unidade_id: dados.unidadeId,
      competencia: dados.competencia,
      status: dados.status,
      data_envio: dados.dataEnvio ?? null,
      enviado_por: dados.enviadoPor ?? null,
    },
    { onConflict: 'unidade_id,competencia' },
  )
  if (error) throw error
}

export async function listarPendenciasPagamento(
  unidadeId: string,
  competencia: string,
): Promise<PendenciaPagamento[]> {
  const { data, error } = await supabase
    .from('pendencia_pagamento')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('competencia', competencia)
    .neq('status', 'Pago')
  if (error) throw error
  return data ?? []
}

export async function listarDiariasEmAberto(unidadeId: string, competencia: string): Promise<Diaria[]> {
  const [ano, mes] = competencia.split('-').map(Number)
  const inicio = `${competencia}-01`
  const fim = `${competencia}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('diaria')
    .select('*')
    .eq('unidade_id', unidadeId)
    .gte('data', inicio)
    .lte('data', fim)
    .in('status', ['Registrado', 'Enviado à matriz'])
  if (error) throw error
  return data ?? []
}

export async function gerarCsvResumo(
  unidadeId: string,
  competencia: string,
  pendencias: PendenciaPagamento[],
  diarias: Diaria[],
): Promise<string> {
  const nomes = new Map((await listarNomesColaboradores(unidadeId)).map((c) => [c.id, c.nome]))
  const linhas: string[] = []

  linhas.push(`RESUMO FOPAG — COMPETÊNCIA ${competencia}`)
  linhas.push('')
  linhas.push('PENDÊNCIAS DE PAGAMENTO')
  linhas.push('Colaborador,Vínculo,Motivo,Referência,Valor total,Status')
  for (const p of pendencias) {
    const nome = p.colaborador_id ? (nomes.get(p.colaborador_id) ?? p.colaborador_nome ?? '') : (p.colaborador_nome ?? '')
    linhas.push(
      [nome, p.vinculo ?? '', p.motivo ?? '', p.referencia ?? '', p.valor_total ?? '', p.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
  }

  linhas.push('')
  linhas.push('DIÁRIAS EM ABERTO')
  linhas.push('Data,Turno,Faltou,Cobriu,Valor,Status')
  for (const d of diarias) {
    const faltou = d.faltante_id ? (nomes.get(d.faltante_id) ?? '') : (d.faltante_nome ?? '')
    const cobriu = d.cobriu_id ? (nomes.get(d.cobriu_id) ?? '') : (d.cobriu_nome ?? '')
    linhas.push(
      [d.data, d.turno ?? '', faltou, cobriu, d.valor ?? '', d.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
  }

  return linhas.join('\n')
}
