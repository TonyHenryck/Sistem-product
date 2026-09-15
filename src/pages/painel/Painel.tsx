import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import {
  buscarAbsenteismoMes,
  buscarHeadcount,
  buscarSerieCustoMensal,
  contarFurosEscalaMes,
  type AbsenteismoMes,
  type CustoMes,
} from '../../lib/painel'
import { contarVencimentosUrgentes } from '../../lib/vencimentos'
import { formatarMoeda } from '../../utils/moeda'

function competenciaAtual(): { competencia: string; ano: number; mes: number } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  return { competencia: `${ano}-${String(mes).padStart(2, '0')}`, ano, mes }
}

function Card({ titulo, valor, destaque, sub }: { titulo: string; valor: string; destaque?: boolean; sub?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${destaque ? 'text-red-600' : 'text-slate-800'}`}>{valor}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function Painel() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [headcount, setHeadcount] = useState<number | null>(null)
  const [absenteismo, setAbsenteismo] = useState<AbsenteismoMes | null>(null)
  const [furos, setFuros] = useState<number | null>(null)
  const [vencimentos, setVencimentos] = useState<number | null>(null)
  const [serieCusto, setSerieCusto] = useState<CustoMes[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!unidade) return
    const { competencia, ano, mes } = competenciaAtual()

    setCarregando(true)
    Promise.all([
      buscarHeadcount(unidade.id),
      buscarAbsenteismoMes(unidade.id, competencia),
      contarFurosEscalaMes(unidade.id, ano, mes),
      contarVencimentosUrgentes(unidade.id),
      buscarSerieCustoMensal(unidade.id, 6),
    ])
      .then(([hc, abs, f, v, serie]) => {
        setHeadcount(hc)
        setAbsenteismo(abs)
        setFuros(f)
        setVencimentos(v)
        setSerieCusto(serie)
      })
      .finally(() => setCarregando(false))
  }, [unidade])

  const { competencia: competenciaAtualStr } = competenciaAtual()
  const custoMesAtual = serieCusto.find((c) => c.competencia === competenciaAtualStr)?.custoTotal ?? 0

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Painel</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card titulo="Headcount ativo" valor={String(headcount ?? 0)} />
        <Card
          titulo="Absenteísmo (dias)"
          valor={String(absenteismo?.diasPerdidos ?? 0)}
          sub={`${absenteismo?.faltasInjustificadas ?? 0} falta(s) · ${absenteismo?.atestados ?? 0} atestado(s)`}
        />
        <Card titulo="Custo do mês" valor={formatarMoeda(custoMesAtual)} />
        <Card
          titulo="Furos de escala"
          valor={String(furos ?? 0)}
          destaque={Boolean(furos && furos > 0)}
        />
        <Card
          titulo="Documentos vencendo"
          valor={String(vencimentos ?? 0)}
          destaque={Boolean(vencimentos && vencimentos > 0)}
        />
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Custo mensal (últimos 6 meses)</p>
        {serieCusto.length === 0 ? (
          <p className="text-sm text-slate-400">Sem lançamentos de custo ainda.</p>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={serieCusto} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} tickFormatter={(v) => formatarMoeda(v)} />
                <Tooltip formatter={(v) => formatarMoeda(Number(v))} labelFormatter={(l) => `Competência ${l}`} />
                <Bar dataKey="custoTotal" name="Custo total" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
