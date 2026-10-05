import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import { buscarIndicadoresDecisao, type IndicadoresDecisao as IndicadoresDecisaoTipo } from '../../lib/indicadoresDecisao'

const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
}

function CardIndicador({ titulo, valor, sub, alerta }: { titulo: string; valor: string; sub: string; alerta: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${alerta ? 'text-amber-300' : 'text-slate-100'}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}

export function IndicadoresDecisao() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [dados, setDados] = useState<IndicadoresDecisaoTipo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    buscarIndicadoresDecisao(unidade.id, unidade.empresa_id)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar indicadores.'))
      .finally(() => setCarregando(false))
  }, [unidade])

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  const turnoverAtual = dados?.turnover[dados.turnover.length - 1]

  const alertas: { texto: string; nivel: 'alerta' | 'ok' }[] = []
  if (dados) {
    if (turnoverAtual && turnoverAtual.taxa > dados.limites.turnoverAlerta) {
      alertas.push({
        nivel: 'alerta',
        texto: `Turnover de ${turnoverAtual.taxa}% no mês, acima do limite de ${dados.limites.turnoverAlerta}% — vale investigar os motivos de saída.`,
      })
    }
    if (dados.conformidade.percentualEmDia < dados.limites.conformidadeAlerta) {
      alertas.push({
        nivel: 'alerta',
        texto: `Só ${dados.conformidade.percentualEmDia}% do time está em dia com ASO, experiência ou contrato (meta: ${dados.limites.conformidadeAlerta}%) — ${dados.conformidade.comPendencia} colaborador(es) com pendência.`,
      })
    }
    if (dados.riscoPonto.divergenciaMediaHoras > dados.limites.divergenciaAlerta) {
      alertas.push({
        nivel: 'alerta',
        texto: `Divergência média de ponto de ${dados.riscoPonto.divergenciaMediaHoras}h por colaborador neste mês, acima do limite de ${dados.limites.divergenciaAlerta}h — ${dados.riscoPonto.comDivergencia} registro(s) com diferença.`,
      })
    }
    if (alertas.length === 0) {
      alertas.push({ nivel: 'ok', texto: 'Nenhum indicador fora da faixa configurada neste mês.' })
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-100">Indicadores e decisões</h1>
      <p className="mb-4 text-sm text-slate-500">
        Turnover, conformidade documental e risco de ponto — com alerta quando passa do limite configurado.
      </p>

      {erro && <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>}

      {dados && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <CardIndicador
              titulo="Turnover do mês"
              valor={`${turnoverAtual?.taxa ?? 0}%`}
              sub={`${turnoverAtual?.admissoes ?? 0} admissão(ões) · ${turnoverAtual?.desligamentos ?? 0} desligamento(s)`}
              alerta={Boolean(turnoverAtual && turnoverAtual.taxa > dados.limites.turnoverAlerta)}
            />
            <CardIndicador
              titulo="Conformidade documental"
              valor={`${dados.conformidade.percentualEmDia}%`}
              sub={`${dados.conformidade.comPendencia} colaborador(es) com pendência · ${dados.conformidade.advertenciasNoPeriodo} advertência(s) em 6 meses`}
              alerta={dados.conformidade.percentualEmDia < dados.limites.conformidadeAlerta}
            />
            <CardIndicador
              titulo="Divergência de ponto (mês)"
              valor={`${dados.riscoPonto.divergenciaMediaHoras}h`}
              sub={`${dados.riscoPonto.comDivergencia} de ${dados.riscoPonto.registros} registro(s) com diferença`}
              alerta={dados.riscoPonto.divergenciaMediaHoras > dados.limites.divergenciaAlerta}
            />
          </div>

          <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="mb-3 text-sm font-medium text-slate-300">O que pede atenção</p>
            <ul className="space-y-2">
              {alertas.map((a, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-sm ${a.nivel === 'alerta' ? 'text-amber-300' : 'text-emerald-400'}`}
                >
                  <span className="mt-0.5">{a.nivel === 'alerta' ? '▲' : '✓'}</span>
                  <span>{a.texto}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="mb-3 text-sm font-medium text-slate-300">Turnover — últimos 6 meses</p>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={dados.turnover} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={40}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip {...ESTILO_TOOLTIP} formatter={(v) => `${v}%`} />
                  <Bar dataKey="taxa" name="Turnover" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
