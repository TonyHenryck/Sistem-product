import { supabase } from './supabase'
import { listarNomesColaboradores } from './colaboradores'

export interface Vencimento {
  colaboradorId: string
  nome: string
  item: string
  venceEm: string
}

export type Urgencia = 'vencido' | '30' | '60'

export function calcularUrgencia(venceEm: string, hojeISO: string): Urgencia | null {
  const dias = Math.floor(
    (new Date(`${venceEm}T00:00:00`).getTime() - new Date(`${hojeISO}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  if (dias < 0) return 'vencido'
  if (dias <= 30) return '30'
  if (dias <= 60) return '60'
  return null
}

export async function buscarVencimentos(unidadeId: string): Promise<Vencimento[]> {
  const [view, ferias, nomes] = await Promise.all([
    supabase.from('v_vencimento').select('colaborador_id, nome, item, vence_em').eq('unidade_id', unidadeId),
    supabase
      .from('ferias_afastamento')
      .select('colaborador_id, inicio')
      .eq('unidade_id', unidadeId)
      .eq('tipo', 'Férias')
      .eq('status', 'Programada'),
    listarNomesColaboradores(unidadeId),
  ])

  const mapaNomes = new Map(nomes.map((n) => [n.id, n.nome]))

  const doView: Vencimento[] = (view.data ?? [])
    .filter((v) => v.vence_em)
    .map((v) => ({
      colaboradorId: v.colaborador_id,
      nome: v.nome,
      item: v.item,
      venceEm: v.vence_em as string,
    }))

  const deFerias: Vencimento[] = (ferias.data ?? []).map((f) => ({
    colaboradorId: f.colaborador_id,
    nome: mapaNomes.get(f.colaborador_id) ?? '—',
    item: 'Férias a programar',
    venceEm: f.inicio,
  }))

  return [...doView, ...deFerias]
}

export async function contarVencimentosUrgentes(unidadeId: string): Promise<number> {
  const hoje = new Date().toISOString().slice(0, 10)
  const todos = await buscarVencimentos(unidadeId)
  return todos.filter((v) => calcularUrgencia(v.venceEm, hoje) !== null).length
}
