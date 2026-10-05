import { supabase } from './supabase'
import {
  buscarExcecoesDoMes,
  diasDoMes,
  diasNoMes,
  ehDomingo,
  escalaInvertidaNoMes,
  gerarEscalaMes,
  type ColaboradorEscala,
  type Situacao,
} from './escala'
import { listarFeriadosDoMes, type Feriado } from './feriados'

const NOMES_DIA_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const NOMES_DIA_SEMANA_LONGO = [
  'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado',
]
export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export interface DetalheColaboradorEscala {
  id: string
  nome: string
  empresaId: string
  unidadeId: string
  funcaoNome: string | null
  localNome: string | null
  atendeMultiplos: boolean
  horario: { descricao: string; horaInicio: string; horaFim: string; viraODia: boolean } | null
  escala: { nome: string; cor: string | null; trabalhaDiaPar: boolean | null } | null
}

export async function buscarDetalheColaboradorEscala(colaboradorId: string): Promise<DetalheColaboradorEscala | null> {
  const { data: colaborador, error } = await supabase
    .from('colaborador')
    .select('id, nome, empresa_id, unidade_id, funcao_id, local_id, atende_multiplos, horario_id, escala_id')
    .eq('id', colaboradorId)
    .maybeSingle()
  if (error) throw error
  if (!colaborador) return null

  const [funcao, local, horario, escala] = await Promise.all([
    colaborador.funcao_id
      ? supabase.from('cat_funcao').select('nome').eq('id', colaborador.funcao_id).maybeSingle()
      : Promise.resolve({ data: null }),
    colaborador.local_id
      ? supabase.from('local_operacional').select('nome').eq('id', colaborador.local_id).maybeSingle()
      : Promise.resolve({ data: null }),
    colaborador.horario_id
      ? supabase
          .from('cat_horario')
          .select('descricao, hora_inicio, hora_fim, vira_o_dia')
          .eq('id', colaborador.horario_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    colaborador.escala_id
      ? supabase.from('cat_escala').select('nome, cor, trabalha_dia_par').eq('id', colaborador.escala_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    id: colaborador.id,
    nome: colaborador.nome,
    empresaId: colaborador.empresa_id,
    unidadeId: colaborador.unidade_id,
    funcaoNome: funcao.data?.nome ?? null,
    localNome: local.data?.nome ?? null,
    atendeMultiplos: colaborador.atende_multiplos,
    horario: horario.data
      ? {
          descricao: horario.data.descricao,
          horaInicio: horario.data.hora_inicio,
          horaFim: horario.data.hora_fim,
          viraODia: horario.data.vira_o_dia,
        }
      : null,
    escala: escala.data
      ? { nome: escala.data.nome, cor: escala.data.cor, trabalhaDiaPar: escala.data.trabalha_dia_par }
      : null,
  }
}

export interface DiaIndividual {
  dataISO: string
  diaMes: number
  diaSemana: string
  trabalha: boolean
  situacao: Situacao | null
  domingo: boolean
  feriado: string | null
}

export interface ResumoEscalaIndividual {
  escalaLabel: string
  plantoesNoMes: number
  cargaEstimada: number | null
  domingosEscalados: number
  feriadosEscalados: { dataISO: string; nome: string }[]
}

export function duracaoHoras(horaInicio: string, horaFim: string, viraODia: boolean): number {
  const [hi, mi] = horaInicio.split(':').map(Number)
  const [hf, mf] = horaFim.split(':').map(Number)
  let minutos = hf * 60 + mf - (hi * 60 + mi)
  if (viraODia || minutos <= 0) minutos += 24 * 60
  return minutos / 60
}

export async function buscarEscalaIndividualMes(
  colaborador: DetalheColaboradorEscala,
  ano: number,
  mes: number,
): Promise<{ dias: DiaIndividual[]; resumo: ResumoEscalaIndividual; feriadosDoMes: Feriado[] }> {
  const colaboradorEscala: ColaboradorEscala = {
    id: colaborador.id,
    nome: colaborador.nome,
    turno: null,
    local_id: null,
    atende_multiplos: false,
    escala: colaborador.escala
      ? { nome: colaborador.escala.nome, cor: colaborador.escala.cor, trabalha_dia_par: colaborador.escala.trabalhaDiaPar }
      : null,
  }

  const [excecoes, feriadosDoMes] = await Promise.all([
    buscarExcecoesDoMes(colaborador.unidadeId, ano, mes),
    listarFeriadosDoMes(colaborador.empresaId, ano, mes),
  ])

  const mapa = gerarEscalaMes(ano, mes, [colaboradorEscala], excecoes)
  const feriadoPorData = new Map(feriadosDoMes.map((f) => [f.data, f.nome]))

  const dias: DiaIndividual[] = diasDoMes(ano, mes).map((dataISO) => {
    const entrada = (mapa.get(dataISO) ?? [])[0]
    return {
      dataISO,
      diaMes: Number(dataISO.slice(8, 10)),
      diaSemana: NOMES_DIA_SEMANA[new Date(`${dataISO}T00:00:00`).getDay()],
      trabalha: Boolean(entrada),
      situacao: entrada?.situacao ?? null,
      domingo: ehDomingo(dataISO),
      feriado: feriadoPorData.get(dataISO) ?? null,
    }
  })

  const diasTrabalhados = dias.filter((d) => d.trabalha)

  let escalaLabel = colaborador.escala?.nome ?? '—'
  if (colaborador.escala && typeof colaborador.escala.trabalhaDiaPar === 'boolean') {
    const invertido = escalaInvertidaNoMes(ano, mes)
    const trabalhaParDeFato = invertido ? !colaborador.escala.trabalhaDiaPar : colaborador.escala.trabalhaDiaPar
    escalaLabel = trabalhaParDeFato ? 'Dias pares' : 'Dias ímpares'
  }

  const resumo: ResumoEscalaIndividual = {
    escalaLabel,
    plantoesNoMes: diasTrabalhados.length,
    cargaEstimada: colaborador.horario
      ? Math.round(
          diasTrabalhados.length *
            duracaoHoras(colaborador.horario.horaInicio, colaborador.horario.horaFim, colaborador.horario.viraODia),
        )
      : null,
    domingosEscalados: diasTrabalhados.filter((d) => d.domingo).length,
    feriadosEscalados: diasTrabalhados
      .filter((d) => d.feriado)
      .map((d) => ({ dataISO: d.dataISO, nome: d.feriado! })),
  }

  return { dias, resumo, feriadosDoMes }
}

export function gerarAvisos(
  ano: number,
  mes: number,
  escala: DetalheColaboradorEscala['escala'],
  dias: DiaIndividual[],
): string[] {
  const avisos: string[] = []

  if (escala && typeof escala.trabalhaDiaPar === 'boolean') {
    let anoAnt = ano
    let mesAnt = mes - 1
    if (mesAnt < 1) {
      mesAnt = 12
      anoAnt--
    }
    const diasMesAnterior = diasNoMes(anoAnt, mesAnt)
    const virou = escalaInvertidaNoMes(ano, mes) !== escalaInvertidaNoMes(anoAnt, mesAnt)
    const nomeMesAnterior = MESES[mesAnt - 1]

    if (virou) {
      avisos.push(
        `A escala virou este mês. ${nomeMesAnterior} teve ${diasMesAnterior} dias (número ímpar) — pra ninguém trabalhar dois dias seguidos na virada do mês, a escala inverte.`,
      )
    } else {
      avisos.push(
        `A escala não virou este mês. ${nomeMesAnterior} teve ${diasMesAnterior} dias (número par), então o rodízio continua sem precisar inverter.`,
      )
    }
  }

  for (const dia of dias) {
    if (!dia.feriado) continue
    const diaSemanaLongo = NOMES_DIA_SEMANA_LONGO[new Date(`${dia.dataISO}T00:00:00`).getDay()]
    const dataFormatada = `${dia.diaMes} de ${MESES[mes - 1].toLowerCase()}`
    avisos.push(
      `${dataFormatada} é feriado de ${dia.feriado}, numa ${diaSemanaLongo}${
        dia.trabalha
          ? '; o serviço não para e quem está escalado trabalha normalmente.'
          : '; cai na sua folga.'
      }`,
    )
  }

  avisos.push('Troca de plantão só com autorização da coordenação e registro por escrito.')
  avisos.push('Falta deve ser avisada à coordenação, com atestado entregue ao RH em até 48 horas.')

  return avisos
}

export interface Coordenador {
  nome: string
  cargo: string
}

export async function buscarCoordenador(empresaId: string, unidadeId: string): Promise<Coordenador | null> {
  const { data } = await supabase
    .from('config_regra')
    .select('chave, valor, unidade_id')
    .eq('empresa_id', empresaId)
    .in('chave', ['coordenador_nome', 'coordenador_cargo'])
    .or(`unidade_id.eq.${unidadeId},unidade_id.is.null`)

  if (!data || data.length === 0) return null

  function valorDe(chave: string): string | undefined {
    const linhas = data!.filter((r) => r.chave === chave)
    return (linhas.find((r) => r.unidade_id === unidadeId) ?? linhas.find((r) => r.unidade_id === null))?.valor
  }

  const nome = valorDe('coordenador_nome')
  if (!nome) return null
  return { nome, cargo: valorDe('coordenador_cargo') ?? 'Coordenação' }
}

export async function salvarCoordenador(
  empresaId: string,
  unidadeId: string,
  nome: string,
  cargo: string,
): Promise<void> {
  const { error } = await supabase.from('config_regra').upsert(
    [
      { empresa_id: empresaId, unidade_id: unidadeId, chave: 'coordenador_nome', valor: nome },
      { empresa_id: empresaId, unidade_id: unidadeId, chave: 'coordenador_cargo', valor: cargo },
    ],
    { onConflict: 'empresa_id,unidade_id,chave' },
  )
  if (error) throw error
}
