import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { buscarVencimentos, calcularUrgencia, type Urgencia, type Vencimento } from '../../lib/vencimentos'
import { formatarData } from '../../utils/data'

const GRUPOS: { chave: Urgencia; titulo: string; classe: string }[] = [
  { chave: 'vencido', titulo: 'Vencido', classe: 'border-red-200 bg-red-50' },
  { chave: '30', titulo: 'Até 30 dias', classe: 'border-amber-200 bg-amber-50' },
  { chave: '60', titulo: 'Até 60 dias', classe: 'border-slate-200 bg-slate-50' },
]

function diasLabel(venceEm: string, hojeISO: string): string {
  const dias = Math.floor(
    (new Date(`${venceEm}T00:00:00`).getTime() - new Date(`${hojeISO}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  if (dias < 0) return `${Math.abs(dias)} dia(s) atrás`
  if (dias === 0) return 'hoje'
  return `em ${dias} dia(s)`
}

export function Vencimentos() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [vencimentos, setVencimentos] = useState<Vencimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    buscarVencimentos(unidade.id)
      .then(setVencimentos)
      .finally(() => setCarregando(false))
  }, [unidade])

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const urgentes = useMemo(
    () => vencimentos.filter((v) => calcularUrgencia(v.venceEm, hoje) !== null),
    [vencimentos, hoje],
  )

  const contagemPorTipo = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const v of urgentes) mapa.set(v.item, (mapa.get(v.item) ?? 0) + 1)
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [urgentes])

  const grupos = useMemo(() => {
    const mapa = new Map<Urgencia, Vencimento[]>([
      ['vencido', []],
      ['30', []],
      ['60', []],
    ])
    for (const v of vencimentos) {
      if (filtroTipo && v.item !== filtroTipo) continue
      const urgencia = calcularUrgencia(v.venceEm, hoje)
      if (urgencia) mapa.get(urgencia)!.push(v)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.venceEm.localeCompare(b.venceEm))
    return mapa
  }, [vencimentos, hoje, filtroTipo])

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Vencimentos e alertas</h1>

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          {urgentes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroTipo(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filtroTipo === null
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos ({urgentes.length})
              </button>
              {contagemPorTipo.map(([tipo, n]) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    filtroTipo === tipo
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tipo} ({n})
                </button>
              ))}
            </div>
          )}
          <div className="space-y-6">
          {GRUPOS.map((grupo) => {
            const itens = grupos.get(grupo.chave) ?? []
            return (
              <div key={grupo.chave}>
                <h2 className="mb-2 text-sm font-medium text-slate-600">
                  {grupo.titulo} <span className="text-slate-400">({itens.length})</span>
                </h2>
                {itens.length === 0 ? (
                  <p className="text-sm text-slate-400">Nada por aqui.</p>
                ) : (
                  <div className={`overflow-hidden rounded border ${grupo.classe}`}>
                    <table className="w-full text-sm">
                      <tbody>
                        {itens.map((v, i) => (
                          <tr key={`${v.colaboradorId}-${v.item}-${i}`} className="border-b border-black/5 last:border-0">
                            <td className="px-3 py-2 font-medium text-slate-800">{v.nome}</td>
                            <td className="px-3 py-2 text-slate-600">{v.item}</td>
                            <td className="px-3 py-2 text-slate-600">{formatarData(v.venceEm)}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{diasLabel(v.venceEm, hoje)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </>
      )}
    </div>
  )
}
