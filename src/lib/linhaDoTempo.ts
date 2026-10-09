import { supabase } from './supabase'

export interface EventoLinhaDoTempo {
  id: string
  data: string
  tipo: string
  titulo: string
  detalhe?: string | null
}

export async function buscarLinhaDoTempo(unidadeId: string, limite = 30): Promise<EventoLinhaDoTempo[]> {
  const [admissoes, desligamentos, faltas, trocas, advertencias, ferias, diario] = await Promise.all([
    supabase
      .from('colaborador')
      .select('id, nome, admissao')
      .eq('unidade_id', unidadeId)
      .not('admissao', 'is', null)
      .order('admissao', { ascending: false })
      .limit(limite),
    supabase
      .from('colaborador')
      .select('id, nome, desligamento, motivo_saida')
      .eq('unidade_id', unidadeId)
      .eq('ativo', false)
      .not('desligamento', 'is', null)
      .order('desligamento', { ascending: false })
      .limit(limite),
    supabase
      .from('falta')
      .select('id, data, tipo, colaborador_id')
      .eq('unidade_id', unidadeId)
      .eq('ativo', true)
      .order('data', { ascending: false })
      .limit(limite),
    supabase
      .from('troca_turno')
      .select('id, data_trocada, folgou_id, assumiu_id, status')
      .eq('unidade_id', unidadeId)
      .order('data_trocada', { ascending: false })
      .limit(limite),
    supabase
      .from('advertencia')
      .select('id, data, tipo, colaborador_id')
      .eq('unidade_id', unidadeId)
      .order('data', { ascending: false })
      .limit(limite),
    supabase
      .from('ferias_afastamento')
      .select('id, inicio, tipo, colaborador_id')
      .eq('unidade_id', unidadeId)
      .order('inicio', { ascending: false })
      .limit(limite),
    supabase
      .from('diario_bordo')
      .select('id, data, tipo, titulo, descricao')
      .eq('unidade_id', unidadeId)
      .order('data', { ascending: false })
      .limit(limite),
  ])

  const idsColaborador = new Set<string>()
  for (const f of faltas.data ?? []) idsColaborador.add(f.colaborador_id)
  for (const t of trocas.data ?? []) {
    idsColaborador.add(t.folgou_id)
    idsColaborador.add(t.assumiu_id)
  }
  for (const a of advertencias.data ?? []) idsColaborador.add(a.colaborador_id)
  for (const f of ferias.data ?? []) idsColaborador.add(f.colaborador_id)

  const { data: nomesData } = await supabase
    .from('colaborador')
    .select('id, nome')
    .in('id', idsColaborador.size ? [...idsColaborador] : ['00000000-0000-0000-0000-000000000000'])
  const nome = new Map((nomesData ?? []).map((n) => [n.id, n.nome]))

  const eventos: EventoLinhaDoTempo[] = []

  for (const c of admissoes.data ?? []) {
    eventos.push({ id: `adm-${c.id}`, data: c.admissao!, tipo: 'Admissão', titulo: `${c.nome} foi admitido(a)` })
  }
  for (const c of desligamentos.data ?? []) {
    eventos.push({
      id: `desl-${c.id}`,
      data: c.desligamento!,
      tipo: 'Desligamento',
      titulo: `${c.nome} foi desligado(a)`,
      detalhe: c.motivo_saida,
    })
  }
  for (const f of faltas.data ?? []) {
    eventos.push({
      id: `falta-${f.id}`,
      data: f.data,
      tipo: 'Falta',
      titulo: `${f.tipo} — ${nome.get(f.colaborador_id) ?? '—'}`,
    })
  }
  for (const t of trocas.data ?? []) {
    eventos.push({
      id: `troca-${t.id}`,
      data: t.data_trocada,
      tipo: 'Troca de turno',
      titulo: `${nome.get(t.folgou_id) ?? '—'} ↔ ${nome.get(t.assumiu_id) ?? '—'}`,
      detalhe: t.status,
    })
  }
  for (const a of advertencias.data ?? []) {
    eventos.push({
      id: `adv-${a.id}`,
      data: a.data,
      tipo: 'Advertência',
      titulo: `${a.tipo ?? 'Advertência'} — ${nome.get(a.colaborador_id) ?? '—'}`,
    })
  }
  for (const f of ferias.data ?? []) {
    eventos.push({
      id: `ferias-${f.id}`,
      data: f.inicio,
      tipo: f.tipo,
      titulo: `${f.tipo} — ${nome.get(f.colaborador_id) ?? '—'}`,
    })
  }
  for (const d of diario.data ?? []) {
    eventos.push({
      id: `diario-${d.id}`,
      data: d.data,
      tipo: d.tipo || 'Diário do RH',
      titulo: d.titulo,
      detalhe: d.descricao,
    })
  }

  return eventos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).slice(0, limite)
}
