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

export function Escala() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [localId, setLocalId] = useState('')
  const [locais, setLocais] = useState<Catalogo[]>([])

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

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Escala</h1>

        <div className="flex items-center gap-3">
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
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
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              ‹
            </button>
            <span className="w-36 text-center text-sm font-medium text-slate-700">
              {MESES[mes - 1]} {ano}
            </span>
            <button
              onClick={() => mudarMes(1)}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {localId === '' && (
        <p className="mb-3 text-xs text-slate-400">
          Selecione um local específico para ver furos de escala (dias sem ninguém trabalhando).
        </p>
      )}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <th key={d} className="pb-2 text-left text-xs font-medium text-slate-400">
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

                    return (
                      <td
                        key={j}
                        className={`h-28 w-[14.28%] align-top border border-slate-100 p-1.5 ${
                          furo ? 'bg-red-50' : dataISO ? 'bg-white' : 'bg-slate-50'
                        }`}
                      >
                        {dataISO && (
                          <>
                            <div className="mb-1 text-xs text-slate-400">
                              {Number(dataISO.slice(8, 10))}
                            </div>
                            {furo && (
                              <div className="mb-1 text-[11px] font-medium text-red-600">
                                Furo de escala
                              </div>
                            )}
                            <div className="space-y-0.5">
                              {dia.map((c: DiaColaborador) => (
                                <div
                                  key={c.colaboradorId}
                                  className={`flex items-center gap-1 truncate text-[11px] ${
                                    c.situacao === 'falta' ? 'text-red-600 line-through' : 'text-slate-700'
                                  }`}
                                  title={`${c.nome}${c.turno ? ` — ${c.turno}` : ''}${
                                    c.situacao === 'cobrindo' ? ' (cobrindo troca)' : ''
                                  }${c.situacao === 'falta' ? ' (falta)' : ''}`}
                                >
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: c.cor }}
                                  />
                                  <span className="truncate">
                                    {c.nome}
                                    {c.turno === 'Noturno' ? ' (N)' : ''}
                                    {c.situacao === 'cobrindo' ? ' ↔' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
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
      )}
    </div>
  )
}
