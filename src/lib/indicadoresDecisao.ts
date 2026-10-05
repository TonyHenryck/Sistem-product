import { supabase } from './supabase'
import { buscarVencimentos, calcularUrgencia } from './vencimentos'

export interface TurnoverMes {
  competencia: string
  admissoes: number
  desligamentos: number
  headcountMedio: number
  taxa: number
}

export interface Conformidade {
  totalAtivos: number
  comPendencia: number
  percentualEmDia: number
  advertenciasNoPeriodo: number
}

export interface RiscoPonto {
  competencia: string
  registros: number
  comDivergencia: number
  divergenciaTotalHoras: number
  divergenciaMediaHoras: number
}

export interface LimitesDecisao {
  turnoverAlerta: number
  conformidadeAlerta: number
  divergenciaAlerta: number
}

export interface IndicadoresDecisao {
  turnover: TurnoverMes[]
  conformidade: Conformidade
  riscoPonto: RiscoPonto
  limites: LimitesDecisao
}

function fimDoMes(hoje: Date, mesesAtras: number): Date {
  return new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras + 1, 0)
}

function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

export async function buscarTurnover(unidadeId: string, meses = 6): Promise<TurnoverMes[]> {
  const { data, error } = await supabase
    .from('colaborador')
    .select('admissao, desligamento')
    .eq('unidade_id', unidadeId)
  if (error) throw error
  const lista = data ?? []

  const hoje = new Date()
  const resultado: TurnoverMes[] = []

  for (let i = meses - 1; i >= 0; i--) {
    const fim = fimDoMes(hoje, i)
    const competencia = competenciaDe(fim)
    const inicioMesISO = new Date(fim.getFullYear(), fim.getMonth(), 1).toISOString().slice(0, 10)
    const fimMesISO = fim.toISOString().slice(0, 10)
    const fimAnteriorISO = new Date(fim.getFullYear(), fim.getMonth(), 0).toISOString().slice(0, 10)

    const admissoes = lista.filter((c) => c.admissao && c.admissao >= inicioMesISO && c.admissao <= fimMesISO).length
    const desligamentos = lista.filter(
      (c) => c.desligamento && c.desligamento >= inicioMesISO && c.desligamento <= fimMesISO,
    ).length

    const headcountInicio = lista.filter(
      (c) => c.admissao && c.admissao <= fimAnteriorISO && (!c.desligamento || c.desligamento > fimAnteriorISO),
    ).length
    const headcountFim = lista.filter(
      (c) => c.admissao && c.admissao <= fimMesISO && (!c.desligamento || c.desligamento > fimMesISO),
    ).length
    const headcountMedio = (headcountInicio + headcountFim) / 2

    const taxa = headcountMedio > 0 ? ((admissoes + desligamentos) / 2 / headcountMedio) * 100 : 0

    resultado.push({
      competencia,
      admissoes,
      desligamentos,
      headcountMedio: Math.round(headcountMedio * 10) / 10,
      taxa: Math.round(taxa * 10) / 10,
    })
  }

  return resultado
}

export async function buscarConformidade(unidadeId: string, inicio: string, fim: string): Promise<Conformidade> {
  const [{ count: totalAtivos, error: erroHc }, vencimentos, { count: advertenciasNoPeriodo, error: erroAdv }] =
    await Promise.all([
      supabase.from('colaborador').select('id', { count: 'exact', head: true }).eq('unidade_id', unidadeId).eq('ativo', true),
      buscarVencimentos(unidadeId),
      supabase
        .from('advertencia')
        .select('id', { count: 'exact', head: true })
        .eq('unidade_id', unidadeId)
        .gte('data', inicio)
        .lte('data', fim),
    ])
  if (erroHc) throw erroHc
  if (erroAdv) throw erroAdv

  const hoje = new Date().toISOString().slice(0, 10)
  const comPendenciaSet = new Set(
    vencimentos.filter((v) => calcularUrgencia(v.venceEm, hoje) !== null).map((v) => v.colaboradorId),
  )

  const total = totalAtivos ?? 0
  const comPendencia = comPendenciaSet.size
  const percentualEmDia = total > 0 ? Math.round(((total - comPendencia) / total) * 100) : 100

  return { totalAtivos: total, comPendencia, percentualEmDia, advertenciasNoPeriodo: advertenciasNoPeriodo ?? 0 }
}

function intervaloParaHoras(valor: string | null): number {
  if (!valor) return 0
  const negativo = valor.trim().startsWith('-')
  const partes = valor.replace('-', '').split(':')
  const horas = Number(partes[0] ?? 0)
  const minutos = Number(partes[1] ?? 0)
  const total = horas + minutos / 60
  return negativo ? -total : total
}

export async function buscarRiscoPonto(unidadeId: string, competencia: string): Promise<RiscoPonto> {
  const { data, error } = await supabase
    .from('ponto_competencia')
    .select('divergencia')
    .eq('unidade_id', unidadeId)
    .eq('competencia', competencia)
  if (error) throw error

  const lista = data ?? []
  const horasAbs = lista.map((r) => Math.abs(intervaloParaHoras(r.divergencia)))
  const comDivergencia = horasAbs.filter((h) => h > 0.1).length
  const divergenciaTotalHoras = horasAbs.reduce((acc, h) => acc + h, 0)
  const divergenciaMediaHoras = lista.length > 0 ? divergenciaTotalHoras / lista.length : 0

  return {
    competencia,
    registros: lista.length,
    comDivergencia,
    divergenciaTotalHoras: Math.round(divergenciaTotalHoras * 10) / 10,
    divergenciaMediaHoras: Math.round(divergenciaMediaHoras * 10) / 10,
  }
}

async function buscarLimite(empresaId: string, unidadeId: string, chave: string, padrao: number): Promise<number> {
  const { data } = await supabase
    .from('config_regra')
    .select('valor, unidade_id')
    .eq('empresa_id', empresaId)
    .eq('chave', chave)
    .or(`unidade_id.eq.${unidadeId},unidade_id.is.null`)

  if (!data || data.length === 0) return padrao
  const linha = data.find((r) => r.unidade_id === unidadeId) ?? data[0]
  const numero = Number(linha.valor)
  return Number.isNaN(numero) ? padrao : numero
}

export async function buscarIndicadoresDecisao(unidadeId: string, empresaId: string): Promise<IndicadoresDecisao> {
  const hoje = new Date()
  const competenciaAtual = competenciaDe(hoje)
  const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().slice(0, 10)
  const hojeISO = hoje.toISOString().slice(0, 10)

  const [turnover, conformidade, riscoPonto, turnoverAlerta, conformidadeAlerta, divergenciaAlerta] =
    await Promise.all([
      buscarTurnover(unidadeId, 6),
      buscarConformidade(unidadeId, inicioJanela, hojeISO),
      buscarRiscoPonto(unidadeId, competenciaAtual),
      buscarLimite(empresaId, unidadeId, 'turnover_alerta_percentual', 5),
      buscarLimite(empresaId, unidadeId, 'conformidade_alerta_percentual', 90),
      buscarLimite(empresaId, unidadeId, 'ponto_divergencia_alerta_horas', 2),
    ])

  return {
    turnover,
    conformidade,
    riscoPonto,
    limites: { turnoverAlerta, conformidadeAlerta, divergenciaAlerta },
  }
}
