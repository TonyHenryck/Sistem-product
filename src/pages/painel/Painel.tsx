import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import {
  buscarAbsenteismoMes,
  buscarHeadcount,
  buscarIndicadoresFaltas,
  buscarSerieCustoMensal,
  contarFurosEscalaMes,
  intervaloPeriodo,
  TIPOS_FALTA,
  type AbsenteismoMes,
  type CustoMes,
  type FaltaPorFuncao,
  type PeriodoIndicador,
  type RankingFaltaColaborador,
  type TipoFalta,
} from '../../lib/painel'
import { contarVencimentosUrgentes } from '../../lib/vencimentos'
import { formatarMoeda } from '../../utils/moeda'

const ROTULO_TIPO: Record<TipoFalta, string> = {
  'Falta injustificada': 'Injustificada',
  'Atestado médico': 'Atestado',
  'Falta abonada': 'Abonada',
  Atraso: 'Atraso',
  'Saída antecipada': 'Saída antec.',
  Suspensão: 'Suspensão',
}

const COR_TIPO: Record<TipoFalta, string> = {
  'Falta injustificada': '#2a78d6',
  'Atestado médico': '#eb6834',
  'Falta abonada': '#1baf7a',
  Atraso: '#eda100',
  'Saída antecipada': '#e87ba4',
  Suspensão: '#008300',
}

const OPCOES_PERIODO: { valor: PeriodoIndicador; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Mês atual' },
  { valor: '3m', rotulo: 'Últimos 3 meses' },
  { valor: '6m', rotulo: 'Últimos 6 meses' },
]

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

  const [periodo, setPeriodo] = useState<PeriodoIndicador>('mes')
  const [ranking, setRanking] = useState<RankingFaltaColaborador[]>([])
  const [porFuncao, setPorFuncao] = useState<FaltaPorFuncao[]>([])
  const [carregandoFaltas, setCarregandoFaltas] = useState(true)

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

  useEffect(() => {
    if (!unidade) return
    const { inicio, fim } = intervaloPeriodo(periodo)

    setCarregandoFaltas(true)
    buscarIndicadoresFaltas(unidade.id, unidade.empresa_id, inicio, fim)
      .then(({ ranking, porFuncao }) => {
        setRanking(ranking)
        setPorFuncao(porFuncao)
      })
      .finally(() => setCarregandoFaltas(false))
  }, [unidade, periodo])

  const { competencia: competenciaAtualStr } = competenciaAtual()
  const custoMesAtual = serieCusto.find((c) => c.competencia === competenciaAtualStr)?.custoTotal ?? 0
  const dadosGraficoFuncao = porFuncao.map((f) => ({ funcao: f.funcao, ...f.porTipo }))

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

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Indicadores de faltas</h2>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoIndicador)}
          className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
        >
          {OPCOES_PERIODO.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Faltas por função</p>
        {carregandoFaltas ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : dadosGraficoFuncao.length === 0 ? (
          <p className="text-sm text-slate-400">Sem faltas registradas no período.</p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={dadosGraficoFuncao} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="funcao" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={32} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {TIPOS_FALTA.map((tipo) => (
                  <Bar key={tipo} dataKey={tipo} name={ROTULO_TIPO[tipo]} stackId="faltas" fill={COR_TIPO[tipo]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white">
        <p className="px-4 pt-4 text-sm font-medium text-slate-700">Colaboradores com mais faltas</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Função</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Dias perdidos</th>
              {TIPOS_FALTA.map((tipo) => (
                <th key={tipo} className="px-3 py-2 font-medium">
                  {ROTULO_TIPO[tipo]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregandoFaltas && (
              <tr>
                <td colSpan={4 + TIPOS_FALTA.length} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregandoFaltas && ranking.length === 0 && (
              <tr>
                <td colSpan={4 + TIPOS_FALTA.length} className="px-3 py-4 text-center text-slate-400">
                  Sem faltas registradas no período.
                </td>
              </tr>
            )}
            {ranking.slice(0, 10).map((r) => (
              <tr key={r.colaboradorId} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{r.nome}</td>
                <td className="px-3 py-2 text-slate-600">{r.funcao}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{r.total}</td>
                <td className="px-3 py-2 text-slate-600">{r.diasPerdidos}</td>
                {TIPOS_FALTA.map((tipo) => (
                  <td key={tipo} className="px-3 py-2 text-slate-600">
                    {r.porTipo[tipo] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
