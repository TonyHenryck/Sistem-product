import { useEffect, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import { useContagemAnimada } from '../../hooks/useContagemAnimada'
import { buscarResumoAlmoxarifado, type ResumoAlmoxarifado } from '../../lib/painelAlmoxarifado'
import { mensagemErro } from '../../utils/erro'

const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
}

function Card({
  titulo,
  valor,
  sub,
  alerta,
  atraso = 0,
}: {
  titulo: string
  valor: number
  sub?: string
  alerta?: boolean
  atraso?: number
}) {
  const animado = useContagemAnimada(valor)
  const cor = alerta && valor > 0 ? '#f87171' : '#e2e8f0'
  return (
    <div
      className="animar-entrada relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${cor}, transparent)` }} />
      <p className="text-xs text-slate-400">{titulo}</p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${alerta && valor > 0 ? 'text-red-400' : 'text-slate-50'}`}
        style={!(alerta && valor > 0) ? { textShadow: `0 0 24px ${cor}40` } : undefined}
      >
        {animado}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Grafico({ titulo, children, atraso = 0 }: { titulo: string; children: ReactNode; atraso?: number }) {
  return (
    <div className="animar-entrada rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl" style={{ animationDelay: `${atraso}ms` }}>
      <p className="mb-3 text-sm font-medium text-slate-300">{titulo}</p>
      {children}
    </div>
  )
}

export function PainelTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [resumo, setResumo] = useState<ResumoAlmoxarifado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    buscarResumoAlmoxarifado(unidade.empresa_id, unidade.id)
      .then(setResumo)
      .catch((e) => setErro(mensagemErro(e, 'Erro ao carregar o painel do almoxarifado.')))
      .finally(() => setCarregando(false))
  }, [unidade])

  if (carregando) return <p className="text-slate-400">Carregando...</p>
  if (erro) return <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>
  if (!resumo) return null

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card titulo="Produtos cadastrados" valor={resumo.totalProdutos} atraso={0} />
        <Card titulo="Sem estoque" valor={resumo.semEstoque} alerta atraso={60} />
        <Card titulo="Sem categoria" valor={resumo.semCategoria} alerta atraso={120} />
        <Card titulo="Movimentações este mês" valor={resumo.movimentosMes} atraso={180} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Grafico titulo="Produtos por categoria" atraso={220}>
          {resumo.produtosPorCategoria.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={resumo.produtosPorCategoria} margin={{ left: 8, right: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="rotulo"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={32} allowDecimals={false} />
                  <Tooltip {...ESTILO_TOOLTIP} />
                  <Bar dataKey="valor" name="Produtos" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Grafico>

        <Grafico titulo="Movimentações do mês, por tipo" atraso={260}>
          {resumo.movimentosPorTipo.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma movimentação neste mês ainda.</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={resumo.movimentosPorTipo} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={32} allowDecimals={false} />
                  <Tooltip {...ESTILO_TOOLTIP} />
                  <Bar dataKey="valor" name="Lançamentos" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Grafico>
      </div>

      {resumo.produtosSemEstoque.length > 0 && (
        <div className="animar-entrada mt-6 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <p className="px-4 pt-4 text-sm font-medium text-slate-300">Produtos sem estoque</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
              </tr>
            </thead>
            <tbody>
              {resumo.produtosSemEstoque.map((p) => (
                <tr key={p.nome} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2 text-slate-100">{p.nome}</td>
                  <td className="px-3 py-2 text-slate-400">{p.categoria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
