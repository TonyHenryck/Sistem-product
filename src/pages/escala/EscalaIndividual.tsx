import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { mensagemErro } from '../../utils/erro'
import {
  buscarCoordenador,
  buscarDetalheColaboradorEscala,
  buscarEscalaIndividualMes,
  gerarAvisos,
  MESES,
  salvarCoordenador,
  type Coordenador,
  type DetalheColaboradorEscala,
  type DiaIndividual,
  type ResumoEscalaIndividual,
} from '../../lib/escalaIndividual'

const DOW_SEGUNDA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

function montarSemanas(ano: number, mes: number, dias: DiaIndividual[]): (DiaIndividual | null)[][] {
  const primeiroDiaSemana = (new Date(ano, mes - 1, 1).getDay() + 6) % 7 // 0 = segunda
  const celulas: (DiaIndividual | null)[] = Array(primeiroDiaSemana).fill(null)
  celulas.push(...dias)
  while (celulas.length % 7 !== 0) celulas.push(null)

  const semanas: (DiaIndividual | null)[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

function classeCelula(dia: DiaIndividual): string {
  if (dia.situacao === 'falta') return 'bg-rose-50 border-rose-300'
  if (dia.trabalha) return 'bg-emerald-50 border-emerald-400'
  if (dia.feriado) return 'bg-rose-50 border-rose-300'
  if (dia.domingo) return 'bg-orange-50 border-orange-300'
  return 'bg-slate-50 border-slate-200'
}

function rotuloCelula(dia: DiaIndividual): string {
  if (dia.situacao === 'falta') return 'falta'
  if (dia.trabalha) return dia.situacao === 'cobrindo' ? 'plantão ↔' : 'plantão'
  if (dia.feriado) return 'feriado'
  return 'folga'
}

function corTextoCelula(dia: DiaIndividual): string {
  if (dia.situacao === 'falta') return 'text-rose-700'
  if (dia.trabalha) return 'text-emerald-700'
  if (dia.feriado) return 'text-rose-700'
  if (dia.domingo) return 'text-orange-700'
  return 'text-slate-400'
}

export function EscalaIndividual() {
  const { id } = useParams()
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  const [colaborador, setColaborador] = useState<DetalheColaboradorEscala | null>(null)
  const [dias, setDias] = useState<DiaIndividual[]>([])
  const [resumo, setResumo] = useState<ResumoEscalaIndividual | null>(null)
  const [coordenador, setCoordenador] = useState<Coordenador | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [editandoCoordenador, setEditandoCoordenador] = useState(false)
  const [formCoordenador, setFormCoordenador] = useState({ nome: '', cargo: 'Coordenadora Regional' })
  const [salvandoCoordenador, setSalvandoCoordenador] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    buscarDetalheColaboradorEscala(id)
      .then(setColaborador)
      .catch((e) => setErro(mensagemErro(e, 'Erro ao carregar colaborador.')))
  }, [id])

  useEffect(() => {
    if (!colaborador) return
    setCarregando(true)
    setErro(null)
    Promise.all([
      buscarEscalaIndividualMes(colaborador, ano, mes),
      buscarCoordenador(colaborador.empresaId, colaborador.unidadeId),
    ])
      .then(([escalaDados, coord]) => {
        setDias(escalaDados.dias)
        setResumo(escalaDados.resumo)
        setCoordenador(coord)
      })
      .catch((e) => setErro(mensagemErro(e, 'Erro ao carregar a escala do mês.')))
      .finally(() => setCarregando(false))
  }, [colaborador, ano, mes])

  const semanas = useMemo(() => montarSemanas(ano, mes, dias), [ano, mes, dias])
  const avisos = useMemo(
    () => (colaborador ? gerarAvisos(ano, mes, colaborador.escala, dias) : []),
    [colaborador, ano, mes, dias],
  )
  const diasDePlantao = dias.filter((d) => d.trabalha || d.situacao === 'falta')

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
  }

  async function salvarCoordenadorForm() {
    if (!colaborador || !formCoordenador.nome.trim()) return
    setSalvandoCoordenador(true)
    try {
      await salvarCoordenador(colaborador.empresaId, colaborador.unidadeId, formCoordenador.nome.trim(), formCoordenador.cargo.trim())
      setCoordenador({ nome: formCoordenador.nome.trim(), cargo: formCoordenador.cargo.trim() })
      setEditandoCoordenador(false)
    } finally {
      setSalvandoCoordenador(false)
    }
  }

  if (!colaborador && !erro) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Carregando...</p>
      </div>
    )
  }

  if (!colaborador) {
    return (
      <div className="p-6">
        <Link to={`/colaboradores/${id}`} className="text-sm text-slate-600 hover:underline">
          ‹ Voltar pro colaborador
        </Link>
        <p className="mt-3 text-sm text-red-600">{erro}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[860px] items-center justify-between px-4 print:hidden">
        <Link to={`/colaboradores/${id}`} className="text-sm text-slate-600 hover:underline">
          ‹ Voltar pro colaborador
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-white">
            ‹
          </button>
          <span className="w-32 text-center text-sm font-medium text-slate-700">
            {carregando ? 'Carregando...' : `${MESES[mes - 1]} ${ano}`}
          </span>
          <button onClick={() => mudarMes(1)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-white">
            ›
          </button>
          <button
            onClick={() => window.print()}
            className="ml-3 rounded bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Imprimir
          </button>
        </div>
      </div>

      {erro && (
        <p className="mx-auto mb-4 max-w-[860px] px-4 text-sm text-red-600 print:hidden">{erro}</p>
      )}

      <div className="mx-auto max-w-[860px] bg-white p-8 shadow print:shadow-none print:p-0">
        <div className="mb-4 flex items-center gap-4 border-b-[3px] border-[#1F3864] pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F3864]">
              ESCALA INDIVIDUAL · {MESES[mes - 1].toUpperCase()} {ano}
            </h1>
            <p className="mt-0.5 text-[11px] tracking-wide text-slate-500">
              {unidade?.nome?.toUpperCase() ?? ''}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Colaborador(a)', colaborador.nome],
            ['Função', colaborador.funcaoNome ?? '—'],
            ['Local', colaborador.atendeMultiplos ? 'Múltiplos' : colaborador.localNome ?? '—'],
            ['Horário', colaborador.horario?.descricao ?? '—'],
          ].map(([label, valor]) => (
            <div key={label} className="rounded border border-slate-200 p-2.5">
              <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
              <div className="text-[13px] font-bold leading-tight text-[#1F3864]">{valor}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-600">
              Calendário de {MESES[mes - 1].toLowerCase()}
            </p>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DOW_SEGUNDA.map((d) => (
                <span key={d} className="text-center text-[9px] font-bold text-slate-400">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {semanas.flatMap((semana, i) =>
                semana.map((dia, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded border px-0.5 py-1 text-center ${
                      dia ? classeCelula(dia) : 'border-transparent'
                    }`}
                  >
                    {dia && (
                      <>
                        <b className="text-base leading-none text-slate-700">{dia.diaMes}</b>
                        <span className={`text-[8px] font-semibold ${corTextoCelula(dia)}`}>{rotuloCelula(dia)}</span>
                      </>
                    )}
                  </div>
                )),
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[9px] text-slate-500">
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-emerald-400 bg-emerald-50 align-[-1px]" />plantão</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-50 align-[-1px]" />folga</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-orange-300 bg-orange-50 align-[-1px]" />domingo</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-rose-300 bg-rose-50 align-[-1px]" />feriado / falta</span>
            </div>
          </div>

          <div>
            {resumo && (
              <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
                {[
                  ['Escala', resumo.escalaLabel],
                  ['Plantões no mês', String(resumo.plantoesNoMes)],
                  ['Carga estimada', resumo.cargaEstimada != null ? `${resumo.cargaEstimada} horas` : '—'],
                  ['Domingos escalados', String(resumo.domingosEscalados)],
                  [
                    'Feriados escalados',
                    resumo.feriadosEscalados.length === 0
                      ? 'nenhum'
                      : resumo.feriadosEscalados.map((f) => f.nome).join(', '),
                  ],
                ].map(([label, valor]) => (
                  <div key={label} className="flex justify-between border-b border-slate-200 py-1 text-[11px] last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <b className="text-[#1F3864]">{valor}</b>
                  </div>
                ))}
              </div>
            )}

            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-orange-600">Seus dias de plantão</p>
            <div className="rounded border border-slate-200">
              {diasDePlantao.length === 0 && (
                <p className="p-3 text-center text-xs text-slate-400">Nenhum plantão neste mês.</p>
              )}
              {diasDePlantao.map((dia) => (
                <div
                  key={dia.dataISO}
                  className={`flex items-baseline gap-2 border-b border-slate-100 px-2.5 py-1.5 text-[11px] last:border-0 ${
                    dia.situacao === 'falta' ? 'rounded bg-rose-50' : ''
                  }`}
                >
                  <b className="min-w-[42px] text-[#1F3864]">
                    {String(dia.diaMes).padStart(2, '0')}/{String(mes).padStart(2, '0')}
                  </b>
                  <span className="min-w-[56px] text-slate-500">
                    {['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][
                      new Date(`${dia.dataISO}T00:00:00`).getDay()
                    ]}
                  </span>
                  <em
                    className={`ml-auto not-italic ${
                      dia.situacao === 'falta' ? 'font-bold text-rose-700' : 'text-slate-400'
                    }`}
                  >
                    {dia.situacao === 'falta' ? 'falta' : colaborador.horario?.descricao ?? ''}
                  </em>
                </div>
              ))}
            </div>
          </div>
        </div>

        {avisos.length > 0 && (
          <div className="mt-5 rounded border border-slate-200 p-3 text-justify text-[10px] leading-relaxed text-slate-600">
            {avisos.map((a, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-14 px-4">
          <div className="flex-1 border-t border-slate-400 pt-1.5 text-center text-[10px] text-slate-600">
            Ciente — {colaborador.nome}
          </div>
          <div className="flex-1 border-t border-slate-400 pt-1.5 text-center text-[10px] text-slate-600">
            {coordenador ? `${coordenador.nome} — ${coordenador.cargo}` : 'Coordenação'}
          </div>
        </div>

        {!coordenador && (
          <div className="mt-3 print:hidden">
            {!editandoCoordenador ? (
              <button onClick={() => setEditandoCoordenador(true)} className="text-xs text-slate-400 hover:text-slate-600">
                + Definir nome do(a) coordenador(a) pra assinatura
              </button>
            ) : (
              <div className="mt-1 flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Nome</label>
                  <input
                    value={formCoordenador.nome}
                    onChange={(e) => setFormCoordenador((f) => ({ ...f, nome: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Cargo</label>
                  <input
                    value={formCoordenador.cargo}
                    onChange={(e) => setFormCoordenador((f) => ({ ...f, cargo: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={salvarCoordenadorForm}
                  disabled={salvandoCoordenador || !formCoordenador.nome.trim()}
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {salvandoCoordenador ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
