import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { buscarQuadroPessoal, type GrupoContagem, type QuadroPessoal as QuadroPessoalTipo } from '../../lib/quadroPessoal'

function ListaBarras({ titulo, grupos }: { titulo: string; grupos: GrupoContagem[] }) {
  const maximo = Math.max(1, ...grupos.map((g) => g.total))

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
      <p className="mb-3 text-sm font-medium text-slate-300">{titulo}</p>
      {grupos.length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
      <div className="space-y-2">
        {grupos.map((g) => (
          <div key={g.nome}>
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="text-slate-400">{g.nome}</span>
              <span className="font-medium text-slate-100">{g.total}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-slate-300"
                style={{ width: `${(g.total / maximo) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuadroPessoal() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [quadro, setQuadro] = useState<QuadroPessoalTipo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    buscarQuadroPessoal(unidade.id, unidade.empresa_id)
      .then(setQuadro)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar quadro de pessoal.'))
      .finally(() => setCarregando(false))
  }, [unidade])

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-100">Quadro de pessoal</h1>
      <p className="mb-4 text-sm text-slate-500">Composição do time ativo por função, local, escala e vínculo.</p>

      {erro && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}

      {quadro && (
        <>
          <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
            <p className="text-xs text-slate-500">Colaboradores ativos</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{quadro.totalAtivos}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListaBarras titulo="Por função" grupos={quadro.porFuncao} />
            <ListaBarras titulo="Por local" grupos={quadro.porLocal} />
            <ListaBarras titulo="Por escala" grupos={quadro.porEscala} />
            <ListaBarras titulo="Por vínculo" grupos={quadro.porVinculo} />
          </div>
        </>
      )}
    </div>
  )
}
