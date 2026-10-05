import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { buscarLinhaDoTempo, type EventoLinhaDoTempo } from '../../lib/linhaDoTempo'
import { formatarData } from '../../utils/data'

const CORES: Record<string, string> = {
  Admissão: '#cbd5e1',
  Desligamento: '#64748b',
  Falta: '#f87171',
  'Troca de turno': '#94a3b8',
  Advertência: '#f87171',
}

function corDoEvento(tipo: string): string {
  if (CORES[tipo]) return CORES[tipo]
  if (tipo.includes('Licença') || tipo === 'Férias' || tipo === 'Abono pecuniário' || tipo === 'Suspensão de contrato') {
    return '#475569'
  }
  return '#e2e8f0'
}

export function LinhaDoTempo() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [eventos, setEventos] = useState<EventoLinhaDoTempo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    buscarLinhaDoTempo(unidade.id)
      .then(setEventos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar a linha do tempo.'))
      .finally(() => setCarregando(false))
  }, [unidade])

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-100">Linha do tempo</h1>
      <p className="mb-4 text-sm text-slate-500">
        Admissões, desligamentos, faltas, trocas, advertências, férias e entradas do diário — mais recentes primeiro.
      </p>

      {erro && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}
      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}
      {!carregando && eventos.length === 0 && <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>}

      <div className="space-y-2">
        {eventos.map((e) => (
          <div
            key={e.id}
            className="flex gap-4 rounded border border-l-4 border-white/10 bg-slate-900/60 p-3 backdrop-blur-xl"
            style={{ borderLeftColor: corDoEvento(e.tipo) }}
          >
            <span className="w-20 shrink-0 text-xs text-slate-500">{formatarData(e.data)}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{e.tipo}</p>
              <p className="truncate text-sm text-slate-100">{e.titulo}</p>
              {e.detalhe && <p className="text-xs text-slate-500">{e.detalhe}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
