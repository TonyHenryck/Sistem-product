import { supabase } from './supabase'
import { normalizar, formatarIntervalo } from './ponto'
import { formatarData } from '../utils/data'
import { formatarMoeda } from '../utils/moeda'

export type TipoRelatorio = 'colaboradores' | 'faltas' | 'diarias' | 'trocas' | 'advertencias' | 'ponto_diario'

export const TIPOS_RELATORIO: { valor: TipoRelatorio; rotulo: string }[] = [
  { valor: 'colaboradores', rotulo: 'Colaboradores' },
  { valor: 'faltas', rotulo: 'Faltas' },
  { valor: 'diarias', rotulo: 'Diárias' },
  { valor: 'trocas', rotulo: 'Trocas de turno' },
  { valor: 'advertencias', rotulo: 'Advertências' },
  { valor: 'ponto_diario', rotulo: 'Ponto diário (FACEPONTO)' },
]

export interface FiltrosRelatorio {
  dataInicio: string
  dataFim: string
  funcaoId: string
  nomeBusca: string
  tipo: string
  status: string
}

export const FILTROS_VAZIOS: FiltrosRelatorio = {
  dataInicio: '',
  dataFim: '',
  funcaoId: '',
  nomeBusca: '',
  tipo: '',
  status: '',
}

export interface ColunaRelatorio {
  chave: string
  rotulo: string
}

export interface PontoGrafico {
  rotulo: string
  valor: number
}

export interface ResultadoRelatorio {
  colunas: ColunaRelatorio[]
  linhas: Record<string, string>[]
  grafico: { titulo: string; dados: PontoGrafico[] } | null
}

// Opções do filtro "Tipo / ocorrência" — mudam de acordo com o relatório
// escolhido, porque cada tabela tem seu próprio vocabulário de tipo.
export function opcoesTipoPara(tipoRelatorio: TipoRelatorio): { valor: string; rotulo: string }[] {
  switch (tipoRelatorio) {
    case 'faltas':
      return [
        'Falta injustificada',
        'Atestado médico',
        'Falta abonada',
        'Atraso',
        'Saída antecipada',
        'Suspensão',
      ].map((v) => ({ valor: v, rotulo: v }))
    case 'advertencias':
      return ['Verbal', 'Escrita', 'Suspensão'].map((v) => ({ valor: v, rotulo: v }))
    case 'diarias':
      return ['Diurno', 'Noturno'].map((v) => ({ valor: v, rotulo: v }))
    case 'trocas':
      return ['Devolução pendente', 'Concluída', 'Cancelada'].map((v) => ({ valor: v, rotulo: v }))
    case 'colaboradores':
      return ['CLT', 'Prestador'].map((v) => ({ valor: v, rotulo: v }))
    case 'ponto_diario':
      return []
  }
}

export function rotuloCampoTipo(tipoRelatorio: TipoRelatorio): string {
  switch (tipoRelatorio) {
    case 'colaboradores':
      return 'Vínculo'
    case 'trocas':
      return 'Status'
    case 'diarias':
      return 'Turno'
    case 'ponto_diario':
      return ''
    default:
      return 'Tipo'
  }
}

export function usaFiltroPeriodo(tipoRelatorio: TipoRelatorio): boolean {
  return tipoRelatorio !== 'colaboradores'
}

export function usaFiltroStatusAtivo(tipoRelatorio: TipoRelatorio): boolean {
  return tipoRelatorio === 'colaboradores'
}

// ---------------------------------------------------------------------
// Mapa colaborador -> nome/função, montado uma vez e reaproveitado pelos
// relatórios que só guardam colaborador_id (falta, diária, troca, advertência).
// Nunca inclui campos de colaborador_dado_sensivel — relatório geral não é
// lugar pra CPF/PIX/banco.
// ---------------------------------------------------------------------

interface RefColaborador {
  nome: string
  funcaoId: string | null
  funcaoNome: string | null
  ativo: boolean
}

async function buscarMapaColaboradores(unidadeId: string, empresaId: string): Promise<Map<string, RefColaborador>> {
  const [{ data: colaboradores, error: erroColab }, { data: funcoes, error: erroFuncao }] = await Promise.all([
    supabase.from('colaborador').select('id, nome, funcao_id, ativo').eq('unidade_id', unidadeId),
    supabase.from('cat_funcao').select('id, nome').eq('empresa_id', empresaId),
  ])
  if (erroColab) throw erroColab
  if (erroFuncao) throw erroFuncao

  const nomeFuncao = new Map<string, string>()
  for (const f of funcoes ?? []) nomeFuncao.set(f.id, f.nome)
  const mapa = new Map<string, RefColaborador>()
  for (const c of colaboradores ?? []) {
    mapa.set(c.id, {
      nome: c.nome,
      funcaoId: c.funcao_id,
      funcaoNome: c.funcao_id ? (nomeFuncao.get(c.funcao_id) ?? null) : null,
      ativo: c.ativo,
    })
  }
  return mapa
}

function passaFiltroNome(nome: string, nomeBusca: string): boolean {
  if (!nomeBusca.trim()) return true
  return normalizar(nome).includes(normalizar(nomeBusca))
}

function contarPorChave(linhas: { chave: string }[]): PontoGrafico[] {
  const contagem = new Map<string, number>()
  for (const l of linhas) contagem.set(l.chave, (contagem.get(l.chave) ?? 0) + 1)
  return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([rotulo, valor]) => ({ rotulo, valor }))
}

function mesDe(dataIso: string): string {
  return dataIso.slice(0, 7)
}

// ---------------------------------------------------------------------
// Colaboradores
// ---------------------------------------------------------------------

async function buscarRelatorioColaboradores(
  unidadeId: string,
  empresaId: string,
  filtros: FiltrosRelatorio,
): Promise<ResultadoRelatorio> {
  let query = supabase
    .from('colaborador')
    .select(
      'nome, matricula, funcao_id, faixa, area, registro_conselho, escala_id, turno, vinculo, nascimento, admissao, fim_contrato, aso_ultimo, telefone, cidade, uf, ativo, desligamento, motivo_saida',
    )
    .eq('unidade_id', unidadeId)
    .order('nome')

  if (filtros.funcaoId) query = query.eq('funcao_id', filtros.funcaoId)
  if (filtros.tipo) query = query.eq('vinculo', filtros.tipo as 'CLT' | 'Prestador')
  if (filtros.status === 'ativo') query = query.eq('ativo', true)
  if (filtros.status === 'desligado') query = query.eq('ativo', false)

  const [{ data, error }, { data: funcoes }, { data: escalas }] = await Promise.all([
    query,
    supabase.from('cat_funcao').select('id, nome').eq('empresa_id', empresaId),
    supabase.from('cat_escala').select('id, nome').eq('empresa_id', empresaId),
  ])
  if (error) throw error

  const nomeFuncao = new Map<string, string>()
  for (const f of funcoes ?? []) nomeFuncao.set(f.id, f.nome)
  const nomeEscala = new Map<string, string>()
  for (const e of escalas ?? []) nomeEscala.set(e.id, e.nome)

  const linhas = (data ?? [])
    .filter((c) => passaFiltroNome(c.nome, filtros.nomeBusca))
    .map((c) => ({
      nome: c.nome,
      matricula: c.matricula ?? '—',
      funcao: c.funcao_id ? (nomeFuncao.get(c.funcao_id) ?? '—') : '—',
      faixa: c.faixa ?? '—',
      area: c.area ?? '—',
      registro_conselho: c.registro_conselho ?? '—',
      escala: c.escala_id ? (nomeEscala.get(c.escala_id) ?? '—') : '—',
      turno: c.turno ?? '—',
      vinculo: c.vinculo,
      nascimento: formatarData(c.nascimento) || '—',
      admissao: formatarData(c.admissao) || '—',
      fim_contrato: formatarData(c.fim_contrato) || '—',
      aso_ultimo: formatarData(c.aso_ultimo) || '—',
      telefone: c.telefone ?? '—',
      cidade: c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : '—',
      status: c.ativo ? 'Ativo' : 'Desligado',
      desligamento: formatarData(c.desligamento) || '—',
      motivo_saida: c.motivo_saida ?? '—',
    }))

  const grafico = {
    titulo: 'Colaboradores por função',
    dados: contarPorChave(linhas.map((l) => ({ chave: l.funcao }))),
  }

  return {
    colunas: [
      { chave: 'nome', rotulo: 'Nome' },
      { chave: 'matricula', rotulo: 'Matrícula' },
      { chave: 'funcao', rotulo: 'Função' },
      { chave: 'faixa', rotulo: 'Faixa' },
      { chave: 'area', rotulo: 'Área' },
      { chave: 'registro_conselho', rotulo: 'Registro conselho' },
      { chave: 'escala', rotulo: 'Escala' },
      { chave: 'turno', rotulo: 'Turno' },
      { chave: 'vinculo', rotulo: 'Vínculo' },
      { chave: 'nascimento', rotulo: 'Nascimento' },
      { chave: 'admissao', rotulo: 'Admissão' },
      { chave: 'fim_contrato', rotulo: 'Fim de contrato' },
      { chave: 'aso_ultimo', rotulo: 'ASO' },
      { chave: 'telefone', rotulo: 'Telefone' },
      { chave: 'cidade', rotulo: 'Cidade/UF' },
      { chave: 'status', rotulo: 'Status' },
      { chave: 'desligamento', rotulo: 'Desligamento' },
      { chave: 'motivo_saida', rotulo: 'Motivo da saída' },
    ],
    linhas,
    grafico,
  }
}

// ---------------------------------------------------------------------
// Faltas
// ---------------------------------------------------------------------

async function buscarRelatorioFaltas(unidadeId: string, empresaId: string, filtros: FiltrosRelatorio): Promise<ResultadoRelatorio> {
  let query = supabase.from('falta').select('*').eq('unidade_id', unidadeId).order('data', { ascending: false })
  if (filtros.dataInicio) query = query.gte('data', filtros.dataInicio)
  if (filtros.dataFim) query = query.lte('data', filtros.dataFim)
  if (filtros.tipo) {
    query = query.eq(
      'tipo',
      filtros.tipo as
        | 'Falta injustificada'
        | 'Atestado médico'
        | 'Falta abonada'
        | 'Atraso'
        | 'Saída antecipada'
        | 'Suspensão',
    )
  }

  const [{ data, error }, mapaColab] = await Promise.all([query, buscarMapaColaboradores(unidadeId, empresaId)])
  if (error) throw error

  const linhas = (data ?? [])
    .map((f) => {
      const ref = mapaColab.get(f.colaborador_id)
      return {
        data: formatarData(f.data),
        dataIso: f.data,
        colaborador: ref?.nome ?? '—',
        funcao: ref?.funcaoNome ?? '—',
        funcaoId: ref?.funcaoId ?? '',
        tipo: f.tipo,
        dias: String(f.dias ?? ''),
        tempo_perdido: formatarIntervalo(f.tempo_perdido) || '—',
        atestado: f.atestado ?? '—',
        descontar: f.descontar ? 'Sim' : 'Não',
        perde_dsr: f.perde_dsr ? 'Sim' : 'Não',
        notificado: f.notificado ? 'Sim' : 'Não',
        obs: f.obs ?? '—',
      }
    })
    .filter((l) => passaFiltroNome(l.colaborador, filtros.nomeBusca))
    .filter((l) => !filtros.funcaoId || l.funcaoId === filtros.funcaoId)

  const grafico = {
    titulo: 'Faltas por tipo',
    dados: contarPorChave(linhas.map((l) => ({ chave: l.tipo }))),
  }

  return {
    colunas: [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'colaborador', rotulo: 'Colaborador' },
      { chave: 'funcao', rotulo: 'Função' },
      { chave: 'tipo', rotulo: 'Tipo' },
      { chave: 'dias', rotulo: 'Dias' },
      { chave: 'tempo_perdido', rotulo: 'Tempo perdido' },
      { chave: 'atestado', rotulo: 'Atestado' },
      { chave: 'descontar', rotulo: 'Descontar' },
      { chave: 'perde_dsr', rotulo: 'Perde DSR' },
      { chave: 'notificado', rotulo: 'Notificado' },
      { chave: 'obs', rotulo: 'Observação' },
    ],
    linhas: linhas.map((l) => ({
      data: l.data,
      colaborador: l.colaborador,
      funcao: l.funcao,
      tipo: l.tipo,
      dias: l.dias,
      tempo_perdido: l.tempo_perdido,
      atestado: l.atestado,
      descontar: l.descontar,
      perde_dsr: l.perde_dsr,
      notificado: l.notificado,
      obs: l.obs,
    })),
    grafico,
  }
}

// ---------------------------------------------------------------------
// Diárias
// ---------------------------------------------------------------------

async function buscarRelatorioDiarias(unidadeId: string, empresaId: string, filtros: FiltrosRelatorio): Promise<ResultadoRelatorio> {
  let query = supabase.from('diaria').select('*').eq('unidade_id', unidadeId).order('data', { ascending: false })
  if (filtros.dataInicio) query = query.gte('data', filtros.dataInicio)
  if (filtros.dataFim) query = query.lte('data', filtros.dataFim)
  if (filtros.tipo) query = query.eq('turno', filtros.tipo as 'Diurno' | 'Noturno')

  const [{ data, error }, mapaColab, { data: motivos }] = await Promise.all([
    query,
    buscarMapaColaboradores(unidadeId, empresaId),
    supabase.from('cat_motivo_ausencia').select('id, nome').eq('empresa_id', empresaId),
  ])
  if (error) throw error
  const nomeMotivo = new Map<string, string>()
  for (const m of motivos ?? []) nomeMotivo.set(m.id, m.nome)

  const linhas = (data ?? [])
    .map((d) => {
      const faltante = d.faltante_id ? mapaColab.get(d.faltante_id) : null
      const cobriu = d.cobriu_id ? mapaColab.get(d.cobriu_id) : null
      const nomeCobriu = cobriu?.nome ?? d.cobriu_nome ?? '—'
      return {
        data: formatarData(d.data),
        local: '—',
        turno: d.turno ?? '—',
        faltou: faltante?.nome ?? d.faltante_nome ?? '—',
        motivo: d.motivo_id ? (nomeMotivo.get(d.motivo_id) ?? '—') : '—',
        atestado: d.atestado ?? '—',
        cobriu: nomeCobriu,
        colaboradorBusca: `${faltante?.nome ?? d.faltante_nome ?? ''} ${nomeCobriu}`,
        funcaoId: faltante?.funcaoId ?? cobriu?.funcaoId ?? '',
        vinculo_cobriu: d.vinculo_cobriu ?? '—',
        funcao_exercida: d.funcao_exercida ?? '—',
        valor: formatarMoeda(d.valor),
        forma_pagamento: d.forma_pagamento ?? '—',
        recibo_assinado: d.recibo_assinado ? 'Sim' : 'Não',
        autorizado_por: d.autorizado_por ?? '—',
        status: d.status,
        obs: d.obs ?? '—',
      }
    })
    .filter((l) => passaFiltroNome(l.colaboradorBusca, filtros.nomeBusca))
    .filter((l) => !filtros.funcaoId || l.funcaoId === filtros.funcaoId)

  const grafico = {
    titulo: 'Diárias por status',
    dados: contarPorChave(linhas.map((l) => ({ chave: l.status }))),
  }

  return {
    colunas: [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'turno', rotulo: 'Turno' },
      { chave: 'faltou', rotulo: 'Quem faltou' },
      { chave: 'motivo', rotulo: 'Motivo' },
      { chave: 'atestado', rotulo: 'Atestado' },
      { chave: 'cobriu', rotulo: 'Quem cobriu' },
      { chave: 'vinculo_cobriu', rotulo: 'Vínculo' },
      { chave: 'funcao_exercida', rotulo: 'Função exercida' },
      { chave: 'valor', rotulo: 'Valor' },
      { chave: 'forma_pagamento', rotulo: 'Forma de pagamento' },
      { chave: 'recibo_assinado', rotulo: 'Recibo assinado' },
      { chave: 'autorizado_por', rotulo: 'Autorizado por' },
      { chave: 'status', rotulo: 'Status' },
      { chave: 'obs', rotulo: 'Observação' },
    ],
    linhas: linhas.map((l) => ({
      data: l.data,
      turno: l.turno,
      faltou: l.faltou,
      motivo: l.motivo,
      atestado: l.atestado,
      cobriu: l.cobriu,
      vinculo_cobriu: l.vinculo_cobriu,
      funcao_exercida: l.funcao_exercida,
      valor: l.valor,
      forma_pagamento: l.forma_pagamento,
      recibo_assinado: l.recibo_assinado,
      autorizado_por: l.autorizado_por,
      status: l.status,
      obs: l.obs,
    })),
    grafico,
  }
}

// ---------------------------------------------------------------------
// Trocas de turno
// ---------------------------------------------------------------------

async function buscarRelatorioTrocas(unidadeId: string, empresaId: string, filtros: FiltrosRelatorio): Promise<ResultadoRelatorio> {
  let query = supabase.from('troca_turno').select('*').eq('unidade_id', unidadeId).order('data_trocada', { ascending: false })
  if (filtros.dataInicio) query = query.gte('data_trocada', filtros.dataInicio)
  if (filtros.dataFim) query = query.lte('data_trocada', filtros.dataFim)
  if (filtros.tipo) query = query.eq('status', filtros.tipo as 'Devolução pendente' | 'Concluída' | 'Cancelada')

  const [{ data, error }, mapaColab] = await Promise.all([query, buscarMapaColaboradores(unidadeId, empresaId)])
  if (error) throw error

  const linhas = (data ?? [])
    .map((t) => {
      const folgou = mapaColab.get(t.folgou_id)
      const assumiu = mapaColab.get(t.assumiu_id)
      return {
        data: formatarData(t.data_trocada),
        folgou: folgou?.nome ?? '—',
        assumiu: assumiu?.nome ?? '—',
        colaboradorBusca: `${folgou?.nome ?? ''} ${assumiu?.nome ?? ''}`,
        funcaoId: folgou?.funcaoId ?? assumiu?.funcaoId ?? '',
        motivo: t.motivo ?? '—',
        data_devolucao: formatarData(t.data_devolucao) || '—',
        status: t.status,
        formalizada: t.formalizada ? 'Sim' : 'Não',
        autorizado_por: t.autorizado_por ?? '—',
        obs: t.obs ?? '—',
      }
    })
    .filter((l) => passaFiltroNome(l.colaboradorBusca, filtros.nomeBusca))
    .filter((l) => !filtros.funcaoId || l.funcaoId === filtros.funcaoId)

  const grafico = {
    titulo: 'Trocas por status',
    dados: contarPorChave(linhas.map((l) => ({ chave: l.status }))),
  }

  return {
    colunas: [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'folgou', rotulo: 'Quem folgou' },
      { chave: 'assumiu', rotulo: 'Quem assumiu' },
      { chave: 'motivo', rotulo: 'Motivo' },
      { chave: 'data_devolucao', rotulo: 'Devolução' },
      { chave: 'status', rotulo: 'Status' },
      { chave: 'formalizada', rotulo: 'Formalizada' },
      { chave: 'autorizado_por', rotulo: 'Autorizado por' },
      { chave: 'obs', rotulo: 'Observação' },
    ],
    linhas: linhas.map((l) => ({
      data: l.data,
      folgou: l.folgou,
      assumiu: l.assumiu,
      motivo: l.motivo,
      data_devolucao: l.data_devolucao,
      status: l.status,
      formalizada: l.formalizada,
      autorizado_por: l.autorizado_por,
      obs: l.obs,
    })),
    grafico,
  }
}

// ---------------------------------------------------------------------
// Advertências
// ---------------------------------------------------------------------

async function buscarRelatorioAdvertencias(
  unidadeId: string,
  empresaId: string,
  filtros: FiltrosRelatorio,
): Promise<ResultadoRelatorio> {
  let query = supabase.from('advertencia').select('*').eq('unidade_id', unidadeId).order('data', { ascending: false })
  if (filtros.dataInicio) query = query.gte('data', filtros.dataInicio)
  if (filtros.dataFim) query = query.lte('data', filtros.dataFim)
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo as 'Verbal' | 'Escrita' | 'Suspensão')

  const [{ data, error }, mapaColab] = await Promise.all([query, buscarMapaColaboradores(unidadeId, empresaId)])
  if (error) throw error

  const linhas = (data ?? [])
    .map((a) => {
      const ref = mapaColab.get(a.colaborador_id)
      return {
        data: formatarData(a.data),
        colaborador: ref?.nome ?? '—',
        funcao: ref?.funcaoNome ?? '—',
        funcaoId: ref?.funcaoId ?? '',
        tipo: a.tipo ?? '—',
        motivo: a.motivo ?? '—',
        descricao: a.descricao ?? '—',
        testemunha: a.testemunha ?? '—',
        assinada: a.assinada ? 'Sim' : 'Não',
      }
    })
    .filter((l) => passaFiltroNome(l.colaborador, filtros.nomeBusca))
    .filter((l) => !filtros.funcaoId || l.funcaoId === filtros.funcaoId)

  const grafico = {
    titulo: 'Advertências por tipo',
    dados: contarPorChave(linhas.map((l) => ({ chave: l.tipo }))),
  }

  return {
    colunas: [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'colaborador', rotulo: 'Colaborador' },
      { chave: 'funcao', rotulo: 'Função' },
      { chave: 'tipo', rotulo: 'Tipo' },
      { chave: 'motivo', rotulo: 'Motivo' },
      { chave: 'descricao', rotulo: 'Descrição' },
      { chave: 'testemunha', rotulo: 'Testemunha' },
      { chave: 'assinada', rotulo: 'Assinada' },
    ],
    linhas: linhas.map((l) => ({
      data: l.data,
      colaborador: l.colaborador,
      funcao: l.funcao,
      tipo: l.tipo,
      motivo: l.motivo,
      descricao: l.descricao,
      testemunha: l.testemunha,
      assinada: l.assinada,
    })),
    grafico,
  }
}

// ---------------------------------------------------------------------
// Ponto diário (FACEPONTO)
// ---------------------------------------------------------------------

async function buscarRelatorioPontoDiario(
  unidadeId: string,
  empresaId: string,
  filtros: FiltrosRelatorio,
): Promise<ResultadoRelatorio> {
  let query = supabase.from('ponto_registro_diario').select('*').eq('unidade_id', unidadeId).order('data', { ascending: false })
  if (filtros.dataInicio) query = query.gte('data', filtros.dataInicio)
  if (filtros.dataFim) query = query.lte('data', filtros.dataFim)

  const [{ data, error }, mapaColab] = await Promise.all([query, buscarMapaColaboradores(unidadeId, empresaId)])
  if (error) throw error

  const linhas = (data ?? [])
    .map((p) => {
      const ref = mapaColab.get(p.colaborador_id)
      return {
        data: formatarData(p.data),
        dataIso: p.data,
        colaborador: ref?.nome ?? p.nome_relatado,
        funcao: ref?.funcaoNome ?? p.funcao_relatada ?? '—',
        funcaoId: ref?.funcaoId ?? '',
        horas_trabalhadas: p.horas_trabalhadas != null ? String(p.horas_trabalhadas) : '—',
        horas_esperadas: p.horas_esperadas != null ? String(p.horas_esperadas) : '—',
        saldo_calculado: p.saldo_calculado != null ? String(p.saldo_calculado) : '—',
        reg_total_relatado: formatarIntervalo(p.reg_total_relatado) || '—',
        saldo_relatado: formatarIntervalo(p.saldo_relatado) || '—',
        esperado_relatado: formatarIntervalo(p.esperado_relatado) || '—',
        sem_batida_saida: p.sem_batida_saida ? 'Sim' : 'Não',
      }
    })
    .filter((l) => passaFiltroNome(l.colaborador, filtros.nomeBusca))
    .filter((l) => !filtros.funcaoId || l.funcaoId === filtros.funcaoId)

  const grafico = {
    titulo: 'Batidas por mês',
    dados: contarPorChave(linhas.map((l) => ({ chave: mesDe(l.dataIso) }))),
  }

  return {
    colunas: [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'colaborador', rotulo: 'Colaborador' },
      { chave: 'funcao', rotulo: 'Função' },
      { chave: 'horas_trabalhadas', rotulo: 'Horas trabalhadas' },
      { chave: 'horas_esperadas', rotulo: 'Horas esperadas' },
      { chave: 'saldo_calculado', rotulo: 'Saldo' },
      { chave: 'reg_total_relatado', rotulo: 'Total (FACEPONTO)' },
      { chave: 'saldo_relatado', rotulo: 'Saldo (FACEPONTO)' },
      { chave: 'esperado_relatado', rotulo: 'Esperado (FACEPONTO)' },
      { chave: 'sem_batida_saida', rotulo: 'Saída não registrada' },
    ],
    linhas: linhas.map((l) => ({
      data: l.data,
      colaborador: l.colaborador,
      funcao: l.funcao,
      horas_trabalhadas: l.horas_trabalhadas,
      horas_esperadas: l.horas_esperadas,
      saldo_calculado: l.saldo_calculado,
      reg_total_relatado: l.reg_total_relatado,
      saldo_relatado: l.saldo_relatado,
      esperado_relatado: l.esperado_relatado,
      sem_batida_saida: l.sem_batida_saida,
    })),
    grafico,
  }
}

export async function buscarRelatorio(
  tipoRelatorio: TipoRelatorio,
  unidadeId: string,
  empresaId: string,
  filtros: FiltrosRelatorio,
): Promise<ResultadoRelatorio> {
  switch (tipoRelatorio) {
    case 'colaboradores':
      return buscarRelatorioColaboradores(unidadeId, empresaId, filtros)
    case 'faltas':
      return buscarRelatorioFaltas(unidadeId, empresaId, filtros)
    case 'diarias':
      return buscarRelatorioDiarias(unidadeId, empresaId, filtros)
    case 'trocas':
      return buscarRelatorioTrocas(unidadeId, empresaId, filtros)
    case 'advertencias':
      return buscarRelatorioAdvertencias(unidadeId, empresaId, filtros)
    case 'ponto_diario':
      return buscarRelatorioPontoDiario(unidadeId, empresaId, filtros)
  }
}

export function exportarCsv(nomeArquivo: string, resultado: ResultadoRelatorio): void {
  const cabecalho = resultado.colunas.map((c) => `"${c.rotulo.replace(/"/g, '""')}"`).join(';')
  const linhasCsv = resultado.linhas.map((linha) =>
    resultado.colunas.map((c) => `"${(linha[c.chave] ?? '').replace(/"/g, '""')}"`).join(';'),
  )
  const conteudo = [cabecalho, ...linhasCsv].join('\r\n')
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
