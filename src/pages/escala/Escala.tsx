import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { buscarCatalogos, type Catalogo } from '../../lib/colaboradores'
import {
  buscarColaboradoresParaEscala,
  buscarExcecoesDoMes,
  gerarEscalaMes,
  type ColaboradorEscala,
  type DiaColaborador,
} from '../../lib/escala'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const ROTULO_MULTIPLOS = 'Múltiplos'

function montarSemanas(ano: number, mes: number): (string | null)[][] {
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay()
  const totalDias = new Date(ano, mes, 0).getDate()

  const celulas: (string | null)[] = Array(primeiroDiaSemana).fill(null)
  for (let d = 1; d <= totalDias; d++) {
    celulas.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (celulas.length % 7 !== 0) celulas.push(null)

  const semanas: (string | null)[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

function formatarDataLonga(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  const diaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][data.getDay()]
  return `${dia} de ${MESES[mes - 1].toLowerCase()} · ${diaSemana}`
}

export function Escala() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [localId, setLocalId] = useState('')
  const [locais, setLocais] = useState<Catalogo[]>([])
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const [colaboradores, setColaboradores] = useState<ColaboradorEscala[]>([])
  const [excecoes, setExcecoes] = useState<Awaited<ReturnType<typeof buscarExcecoesDoMes>>>({
    trocas: [],
    ferias: [],
    faltas: [],
  })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!unidade) return
    buscarCatalogos(unidade.empresa_id, unidade.id).then((c) => setLocais(c.locais))
  }, [unidade])

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setDiaSelecionado(null)
    Promise.all([
      buscarColaboradoresParaEscala(unidade.id, localId || null),
      buscarExcecoesDoMes(unidade.id, ano, mes),
    ])
      .then(([colabs, exc]) => {
        setColaboradores(colabs)
        setExcecoes(exc)
      })
      .finally(() => setCarregando(false))
  }, [unidade, localId, ano, mes])

  const escalaDoMes = useMemo(
    () => gerarEscalaMes(ano, mes, colaboradores, excecoes),
    [ano, mes, colaboradores, excecoes],
  )

  const semanas = useMemo(() => montarSemanas(ano, mes), [ano, mes])

  const nomeLocal = useMemo(() => new Map(locais.map((l) => [l.id, l.nome])), [locais])

  function rotuloLocal(id: string | null): string {
    if (!id) return ROTULO_MULTIPLOS
    return nomeLocal.get(id) ?? '—'
  }

  function resumoPorLocal(dia: DiaColaborador[]): { rotulo: string; total: number }[] {
    const contagem = new Map<string, number>()
    for (const c of dia) {
      const rotulo = rotuloLocal(c.localId)
      contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1)
    }
    return [...contagem.entries()]
      .map(([rotulo, total]) => ({ rotulo, total }))
      .sort((a, b) => b.total - a.total)
  }

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
  }

  const diaDetalhe = diaSelecionado ? (escalaDoMes.get(diaSelecionado) ?? []) : []
  const gruposDetalhe = useMemo(() => {
    const porLocal = new Map<string, DiaColaborador[]>()
    for (const c of diaDetalhe) {
      const rotulo = rotuloLocal(c.localId)
      if (!porLocal.has(rotulo)) porLocal.set(rotulo, [])
      porLocal.get(rotulo)!.push(c)
    }
    return [...porLocal.entries()].sort((a, b) => b[1].length - a[1].length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaDetalhe])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-100">Escala</h1>

        <div className="flex items-center gap-3">
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            className="rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="">Todos os locais</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarMes(-1)}
              className="rounded border border-white/10 px-2 py-1 text-sm text-slate-400 hover:bg-white/5"
            >
              ‹
            </button>
            <span className="w-36 text-center text-sm font-medium text-slate-300">
              {MESES[mes - 1]} {ano}
            </span>
            <button
              onClick={() => mudarMes(1)}
              className="rounded border border-white/10 px-2 py-1 text-sm text-slate-400 hover:bg-white/5"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {localId === '' && (
        <p className="mb-3 text-xs text-slate-500">
          Cada dia mostra quantas pessoas por local. Clique num dia pra ver os nomes. Selecione um local
          específico pra ver furos de escala (dias sem ninguém trabalhando).
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <th key={d} className="pb-2 text-left text-xs font-medium text-slate-500">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanas.map((semana, i) => (
                  <tr key={i}>
                    {semana.map((dataISO, j) => {
                      const dia = dataISO ? escalaDoMes.get(dataISO) ?? [] : []
                      const furo = Boolean(dataISO) && localId !== '' && dia.length === 0
                      const selecionado = dataISO === diaSelecionado
                      const resumo = resumoPorLocal(dia)

                      return (
                        <td
                          key={j}
                          onClick={() => dataISO && setDiaSelecionado(dataISO)}
                          className={`h-24 w-[14.28%] align-top border p-1.5 ${dataISO ? 'cursor-pointer' : ''} ${
                            selecionado
                              ? 'border-slate-100 border-2 bg-white/10'
                              : furo
                                ? 'border-red-500/20 bg-red-500/10'
                                : dataISO
                                  ? 'border-white/5 bg-slate-900/40 hover:bg-white/5'
                                  : 'border-white/5 bg-slate-950/50'
                          }`}
                        >
                          {dataISO && (
                            <>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs text-slate-500">{Number(dataISO.slice(8, 10))}</span>
                                {dia.length > 0 && (
                                  <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-medium text-slate-400">
                                    {dia.length}
                                  </span>
                                )}
                              </div>
                              {furo ? (
                                <div className="text-[11px] font-medium text-red-400">Furo de escala</div>
                              ) : (
                                <div className="space-y-0.5">
                                  {resumo.slice(0, 3).map((r) => (
                                    <div key={r.rotulo} className="truncate text-[11px] text-slate-400">
                                      {r.rotulo} <span className="font-medium text-slate-100">{r.total}</span>
                                    </div>
                                  ))}
                                  {resumo.length > 3 && (
                                    <div className="text-[11px] text-slate-500">+{resumo.length - 3} local(is)</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
            {!diaSelecionado ? (
              <p className="text-sm text-slate-500">Clique num dia do calendário pra ver quem trabalha.</p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">{formatarDataLonga(diaSelecionado)}</p>
                  <button
                    onClick={() => setDiaSelecionado(null)}
                    className="text-xs text-slate-500 hover:text-slate-400"
                  >
                    Fechar
                  </button>
                </div>

                {diaDetalhe.length === 0 && (
                  <p className="text-sm text-slate-500">Ninguém escalado neste dia.</p>
                )}

                <div className="space-y-4">
                  {gruposDetalhe.map(([rotulo, pessoas]) => (
                    <div key={rotulo}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {rotulo} · {pessoas.length}
                      </p>
                      <div className="space-y-1">
                        {pessoas.map((c) => (
                          <div
                            key={c.colaboradorId}
                            className={`flex items-center gap-2 text-sm ${
                              c.situacao === 'falta' ? 'text-red-400 line-through' : 'text-slate-300'
                            }`}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                            <span className="truncate">{c.nome}</span>
                            {c.turno === 'Noturno' && (
                              <span className="shrink-0 text-xs text-slate-500">Noturno</span>
                            )}
                            {c.situacao === 'cobrindo' && (
                              <span className="shrink-0 text-xs text-sky-400">↔ cobrindo troca</span>
                            )}
                            {c.situacao === 'falta' && <span className="shrink-0 text-xs">falta</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
