import { useEffect, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import { mensagemErro } from '../../utils/erro'
import { useContagemAnimada } from '../../hooks/useContagemAnimada'
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
  'Falta injustificada': '#f8fafc',
  'Atestado médico': '#cbd5e1',
  'Falta abonada': '#94a3b8',
  Atraso: '#64748b',
  'Saída antecipada': '#475569',
  Suspensão: '#f87171',
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

function IconeIndicador({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      {children}
    </svg>
  )
}

const ICONE_PESSOAS = (
  <IconeIndicador>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </IconeIndicador>
)
const ICONE_ALERTA = (
  <IconeIndicador>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </IconeIndicador>
)
const ICONE_CARTEIRA = (
  <IconeIndicador>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h-4a3 3 0 0 0 0 6h4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <circle cx="16" cy="12" r="1" />
  </IconeIndicador>
)
const ICONE_CALENDARIO = (
  <IconeIndicador>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </IconeIndicador>
)
const ICONE_DOCUMENTO = (
  <IconeIndicador>
    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6M9 17h6M9 9h2" />
  </IconeIndicador>
)

function Card({
  titulo,
  valor,
  cor,
  icone,
  destaque,
  sub,
  atraso = 0,
}: {
  titulo: string
  valor: string
  cor: string
  icone: ReactNode
  destaque?: boolean
  sub?: string
  atraso?: number
}) {
  return (
    <div
      className="animar-entrada relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${cor}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{titulo}</p>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${cor}22`, color: cor }}
        >
          {icone}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${destaque ? 'text-red-400' : 'text-slate-50'}`}
        style={!destaque ? { textShadow: `0 0 24px ${cor}40` } : undefined}
      >
        {valor}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function PainelGrafico({ titulo, children, atraso = 0 }: { titulo: string; children: ReactNode; atraso?: number }) {
  return (
    <div
      className="animar-entrada rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <p className="mb-3 text-sm font-medium text-slate-300">{titulo}</p>
      {children}
    </div>
  )
}

const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
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
  const [erro, setErro] = useState<string | null>(null)

  const [periodo, setPeriodo] = useState<PeriodoIndicador>('mes')
  const [ranking, setRanking] = useState<RankingFaltaColaborador[]>([])
  const [porFuncao, setPorFuncao] = useState<FaltaPorFuncao[]>([])
  const [carregandoFaltas, setCarregandoFaltas] = useState(true)
  const [erroFaltas, setErroFaltas] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    const { competencia, ano, mes } = competenciaAtual()

    setCarregando(true)
    setErro(null)
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
      .catch((e) => setErro(mensagemErro(e, 'Erro ao carregar o painel.')))
      .finally(() => setCarregando(false))
  }, [unidade])

  useEffect(() => {
    if (!unidade) return
    const { inicio, fim } = intervaloPeriodo(periodo)

    setCarregandoFaltas(true)
    setErroFaltas(null)
    buscarIndicadoresFaltas(unidade.id, unidade.empresa_id, inicio, fim)
      .then(({ ranking, porFuncao }) => {
        setRanking(ranking)
        setPorFuncao(porFuncao)
      })
      .catch((e) => setErroFaltas(mensagemErro(e, 'Erro ao carregar indicadores de faltas.')))
      .finally(() => setCarregandoFaltas(false))
  }, [unidade, periodo])

  const { competencia: competenciaAtualStr } = competenciaAtual()
  const custoMesAtual = serieCusto.find((c) => c.competencia === competenciaAtualStr)?.custoTotal ?? 0
  const dadosGraficoFuncao = porFuncao.map((f) => ({ funcao: f.funcao, ...f.porTipo }))

  const headcountAnimado = useContagemAnimada(headcount ?? 0)
  const diasAnimado = useContagemAnimada(absenteismo?.diasPerdidos ?? 0)
  const custoAnimado = useContagemAnimada(Math.round(custoMesAtual))
  const furosAnimado = useContagemAnimada(furos ?? 0)
  const vencimentosAnimado = useContagemAnimada(vencimentos ?? 0)

  if (carregando) return <p className="text-slate-400">Carregando...</p>

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Operação do mês</h1>

      {erro && (
        <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card titulo="Headcount ativo" valor={String(headcountAnimado)} cor="#e2e8f0" icone={ICONE_PESSOAS} atraso={0} />
        <Card
          titulo="Absenteísmo (dias)"
          valor={String(diasAnimado)}
          cor="#e2e8f0"
          icone={ICONE_ALERTA}
          sub={`${absenteismo?.faltasInjustificadas ?? 0} falta(s) · ${absenteismo?.atestados ?? 0} atestado(s)`}
          atraso={60}
        />
        <Card titulo="Custo do mês" valor={formatarMoeda(custoAnimado)} cor="#e2e8f0" icone={ICONE_CARTEIRA} atraso={120} />
        <Card
          titulo="Furos de escala"
          valor={String(furosAnimado)}
          cor={furos && furos > 0 ? '#f87171' : '#e2e8f0'}
          icone={ICONE_CALENDARIO}
          destaque={Boolean(furos && furos > 0)}
          atraso={180}
        />
        <Card
          titulo="Documentos vencendo"
          valor={String(vencimentosAnimado)}
          cor={vencimentos && vencimentos > 0 ? '#f87171' : '#e2e8f0'}
          icone={ICONE_DOCUMENTO}
          destaque={Boolean(vencimentos && vencimentos > 0)}
          atraso={240}
        />
      </div>

      <PainelGrafico titulo="Custo mensal (últimos 6 meses)" atraso={280}>
        {serieCusto.length === 0 ? (
          <p className="text-sm text-slate-500">Sem lançamentos de custo ainda.</p>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={serieCusto} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="gradCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#334155" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  width={80}
                  tickFormatter={(v) => formatarMoeda(v)}
                />
                <Tooltip {...ESTILO_TOOLTIP} formatter={(v) => formatarMoeda(Number(v))} labelFormatter={(l) => `Competência ${l}`} />
                <Bar dataKey="custoTotal" name="Custo total" fill="url(#gradCusto)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PainelGrafico>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Indicadores de faltas</h2>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoIndicador)}
          className="rounded border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-300 backdrop-blur-xl focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          {OPCOES_PERIODO.map((o) => (
            <option key={o.valor} value={o.valor} className="bg-slate-900">
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <PainelGrafico titulo="Faltas por função">
          {erroFaltas ? (
            <p className="text-sm text-red-400">{erroFaltas}</p>
          ) : carregandoFaltas ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : dadosGraficoFuncao.length === 0 ? (
            <p className="text-sm text-slate-500">Sem faltas registradas no período.</p>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={dadosGraficoFuncao} margin={{ left: 8, right: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="funcao" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={32} allowDecimals={false} />
                  <Tooltip {...ESTILO_TOOLTIP} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: 12,
                      color: '#94a3b8',
                      paddingTop: 16,
                      marginTop: 8,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  {TIPOS_FALTA.map((tipo) => (
                    <Bar key={tipo} dataKey={tipo} name={ROTULO_TIPO[tipo]} stackId="faltas" fill={COR_TIPO[tipo]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PainelGrafico>
      </div>

      <div className="animar-entrada mt-3 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <p className="px-4 pt-4 text-sm font-medium text-slate-300">Colaboradores com mais faltas</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-500">
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
                <td colSpan={4 + TIPOS_FALTA.length} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregandoFaltas && ranking.length === 0 && (
              <tr>
                <td colSpan={4 + TIPOS_FALTA.length} className="px-3 py-4 text-center text-slate-500">
                  Sem faltas registradas no período.
                </td>
              </tr>
            )}
            {ranking.slice(0, 10).map((r) => (
              <tr key={r.colaboradorId} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/5">
                <td className="px-3 py-2 text-slate-100">{r.nome}</td>
                <td className="px-3 py-2 text-slate-400">{r.funcao}</td>
                <td className="px-3 py-2 font-medium text-slate-100">{r.total}</td>
                <td className="px-3 py-2 text-slate-400">{r.diasPerdidos}</td>
                {TIPOS_FALTA.map((tipo) => (
                  <td key={tipo} className="px-3 py-2 text-slate-400">
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
