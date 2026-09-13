import { supabase } from './supabase'

export interface ColaboradorEscala {
  id: string
  nome: string
  turno: 'Diurno' | 'Noturno' | null
  local_id: string | null
  atende_multiplos: boolean
  escala: { nome: string; cor: string | null; trabalha_dia_par: boolean | null } | null
}

export type Situacao = 'trabalha' | 'cobrindo' | 'falta'

export interface DiaColaborador {
  colaboradorId: string
  nome: string
  cor: string
  turno: 'Diurno' | 'Noturno' | null
  situacao: Situacao
}

function diasDoMes(ano: number, mes: number): string[] {
  const dias: string[] = []
  const ultimoDia = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= ultimoDia; d++) {
    dias.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dias
}

function ehDomingo(dataISO: string): boolean {
  return new Date(`${dataISO}T00:00:00`).getDay() === 0
}

function ehDiaPar(dataISO: string): boolean {
  return Number(dataISO.slice(8, 10)) % 2 === 0
}

function trabalhaNoDiaBase(escala: ColaboradorEscala['escala'], dataISO: string): boolean {
  if (!escala) return false
  if (escala.trabalha_dia_par === true) return ehDiaPar(dataISO)
  if (escala.trabalha_dia_par === false) return !ehDiaPar(dataISO)
  if (escala.nome.toUpperCase() === 'DIARISTA') return !ehDomingo(dataISO)
  return false
}

export async function buscarColaboradoresParaEscala(
  unidadeId: string,
  localId: string | null,
): Promise<ColaboradorEscala[]> {
  const { data: colaboradores, error } = await supabase
    .from('colaborador')
    .select('id, nome, turno, local_id, atende_multiplos, escala_id')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .not('escala_id', 'is', null)

  if (error) throw error
  if (!colaboradores) return []

  const filtrados = localId
    ? colaboradores.filter((c) => c.local_id === localId || c.atende_multiplos)
    : colaboradores

  const escalaIds = [...new Set(filtrados.map((c) => c.escala_id).filter(Boolean))] as string[]
  const { data: escalas } = await supabase
    .from('cat_escala')
    .select('id, nome, cor, trabalha_dia_par')
    .in('id', escalaIds.length ? escalaIds : ['00000000-0000-0000-0000-000000000000'])

  const mapaEscalas = new Map((escalas ?? []).map((e) => [e.id, e]))

  return filtrados.map((c) => ({
    id: c.id,
    nome: c.nome,
    turno: c.turno,
    local_id: c.local_id,
    atende_multiplos: c.atende_multiplos,
    escala: c.escala_id ? (mapaEscalas.get(c.escala_id) ?? null) : null,
  }))
}

export async function buscarExcecoesDoMes(unidadeId: string, ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`

  const [trocas, ferias, faltas] = await Promise.all([
    supabase
      .from('troca_turno')
      .select('data_trocada, folgou_id, assumiu_id, status')
      .eq('unidade_id', unidadeId)
      .neq('status', 'Cancelada')
      .gte('data_trocada', inicio)
      .lte('data_trocada', fim),
    supabase
      .from('ferias_afastamento')
      .select('colaborador_id, inicio, fim, status')
      .eq('unidade_id', unidadeId)
      .in('status', ['Programada', 'Em curso'])
      .lte('inicio', fim),
    supabase
      .from('falta')
      .select('colaborador_id, data')
      .eq('unidade_id', unidadeId)
      .gte('data', inicio)
      .lte('data', fim),
  ])

  return {
    trocas: trocas.data ?? [],
    ferias: (ferias.data ?? []).filter((f) => !f.fim || f.fim >= inicio),
    faltas: faltas.data ?? [],
  }
}

export function gerarEscalaMes(
  ano: number,
  mes: number,
  colaboradores: ColaboradorEscala[],
  excecoes: Awaited<ReturnType<typeof buscarExcecoesDoMes>>,
): Map<string, DiaColaborador[]> {
  const mapa = new Map<string, DiaColaborador[]>()

  for (const dataISO of diasDoMes(ano, mes)) {
    const doDia: DiaColaborador[] = []

    for (const colaborador of colaboradores) {
      const emFerias = excecoes.ferias.some(
        (f) => f.colaborador_id === colaborador.id && f.inicio <= dataISO && (!f.fim || f.fim >= dataISO),
      )
      if (emFerias) continue

      const trocaComoFolga = excecoes.trocas.find(
        (t) => t.data_trocada === dataISO && t.folgou_id === colaborador.id,
      )
      const trocaComoCobertura = excecoes.trocas.find(
        (t) => t.data_trocada === dataISO && t.assumiu_id === colaborador.id,
      )

      let trabalha = trabalhaNoDiaBase(colaborador.escala, dataISO)
      let situacao: Situacao = 'trabalha'

      if (trocaComoFolga) trabalha = false
      if (trocaComoCobertura) {
        trabalha = true
        situacao = 'cobrindo'
      }

      if (!trabalha) continue

      const faltou = excecoes.faltas.some(
        (f) => f.colaborador_id === colaborador.id && f.data === dataISO,
      )
      if (faltou) situacao = 'falta'

      doDia.push({
        colaboradorId: colaborador.id,
        nome: colaborador.nome,
        cor: colaborador.escala?.cor ?? '#94a3b8',
        turno: colaborador.turno,
        situacao,
      })
    }

    mapa.set(dataISO, doDia)
  }

  return mapa
}
