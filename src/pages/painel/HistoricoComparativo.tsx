import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import { buscarSerieCustoMensal, type CustoMes } from '../../lib/painel'
import {
  buscarHistoricoAbsenteismo,
  buscarHistoricoHeadcount,
  type AbsenteismoMesHistorico,
  type HeadcountMes,
} from '../../lib/historicoComparativo'
import { formatarMoeda } from '../../utils/moeda'

function competenciaAtualStr(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function Comparativo({ titulo, atual, anterior, formatar }: { titulo: string; atual: number; anterior: number; formatar: (v: number) => string }) {
  const diferenca = atual - anterior
  const percentual = anterior !== 0 ? (diferenca / anterior) * 100 : null
  const subiu = diferenca > 0
  const desceu = diferenca < 0

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{formatar(atual)}</p>
      <p className={`mt-1 text-xs ${subiu ? 'text-red-600' : desceu ? 'text-emerald-600' : 'text-slate-400'}`}>
        {percentual === null
          ? 'sem comparação anterior'
          : `${subiu ? '▲' : desceu ? '▼' : '—'} ${Math.abs(percentual).toFixed(0)}% vs mês anterior`}
      </p>
    </div>
  )
}

export function HistoricoComparativo() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [custo, setCusto] = useState<CustoMes[]>([])
  const [headcount, setHeadcount] = useState<HeadcountMes[]>([])
  const [absenteismo, setAbsenteismo] = useState<AbsenteismoMesHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    Promise.all([
      buscarSerieCustoMensal(unidade.id, 6),
      buscarHistoricoHeadcount(unidade.id, 6),
      buscarHistoricoAbsenteismo(unidade.id, 6),
    ])
      .then(([c, h, a]) => {
        setCusto(c)
        setHeadcount(h)
        setAbsenteismo(a)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar o histórico.'))
      .finally(() => setCarregando(false))
  }, [unidade])

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  const competencia = competenciaAtualStr()
  const idxAtual = headcount.findIndex((h) => h.competencia === competencia)
  const headcountAtual = idxAtual >= 0 ? headcount[idxAtual].total : 0
  const headcountAnterior = idxAtual > 0 ? headcount[idxAtual - 1].total : 0

  const custoAtual = custo.find((c) => c.competencia === competencia)?.custoTotal ?? 0
  const custoIdx = custo.findIndex((c) => c.competencia === competencia)
  const custoAnterior = custoIdx > 0 ? custo[custoIdx - 1].custoTotal : 0

  const absAtual = absenteismo.find((a) => a.competencia === competencia)?.diasPerdidos ?? 0
  const absIdx = absenteismo.findIndex((a) => a.competencia === competencia)
  const absAnterior = absIdx > 0 ? absenteismo[absIdx - 1].diasPerdidos : 0

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Histórico e comparativo</h1>
      <p className="mb-4 text-sm text-slate-500">Mês atual contra o mês anterior, e a série dos últimos 6 meses.</p>

      {erro && <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Comparativo titulo="Headcount ativo" atual={headcountAtual} anterior={headcountAnterior} formatar={(v) => String(v)} />
        <Comparativo titulo="Custo do mês" atual={custoAtual} anterior={custoAnterior} formatar={formatarMoeda} />
        <Comparativo titulo="Dias perdidos (absenteísmo)" atual={absAtual} anterior={absAnterior} formatar={(v) => String(v)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Headcount (6 meses)</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={headcount} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={32} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" name="Headcount" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Custo mensal (6 meses)</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={custo} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} tickFormatter={(v) => formatarMoeda(v)} />
                <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
                <Bar dataKey="custoTotal" name="Custo total" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4 md:col-span-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Absenteísmo — dias perdidos (6 meses)</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={absenteismo} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={32} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="diasPerdidos" name="Dias perdidos" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
