import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import {
  buscarDiaLimite,
  buscarEnvio,
  gerarCsvResumo,
  listarDiariasEmAberto,
  listarPendenciasPagamento,
  salvarEnvio,
  type Diaria,
  type EnvioFopag,
  type PendenciaPagamento,
} from '../../lib/fopag'
import { formatarData } from '../../utils/data'
import { formatarMoeda } from '../../utils/moeda'

const STATUS_OPCOES: EnvioFopag['status'][] = [
  'Em preparação',
  'Enviado',
  'Confirmado pela matriz',
  'Devolvido para ajuste',
]

const STATUS_CLASSE: Record<EnvioFopag['status'], string> = {
  'Em preparação': 'bg-slate-100 text-slate-600',
  Enviado: 'bg-amber-100 text-amber-800',
  'Confirmado pela matriz': 'bg-emerald-100 text-emerald-700',
  'Devolvido para ajuste': 'bg-red-100 text-red-700',
}

function competenciaAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function contadorLimite(competencia: string, diaLimite: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const limite = new Date(ano, mes - 1, diaLimite)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (dias > 0) return `Faltam ${dias} dia(s) para o dia ${diaLimite}`
  if (dias === 0) return `O prazo é hoje (dia ${diaLimite})`
  return `Prazo (dia ${diaLimite}) vencido há ${Math.abs(dias)} dia(s)`
}

export function Fopag() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [diaLimite, setDiaLimite] = useState<number | null>(null)
  const [envio, setEnvio] = useState<EnvioFopag | null>(null)
  const [pendencias, setPendencias] = useState<PendenciaPagamento[]>([])
  const [diarias, setDiarias] = useState<Diaria[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [carregando, setCarregando] = useState(true)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  useEffect(() => {
    if (!unidade) return
    buscarDiaLimite(unidade.empresa_id, unidade.id).then(setDiaLimite)
    listarNomesColaboradores(unidade.id).then((lista: Catalogo[]) => setNomes(new Map(lista.map((c) => [c.id, c.nome]))))
  }, [unidade])

  useEffect(() => {
    recarregar()
  }, [unidade, competencia])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    Promise.all([
      buscarEnvio(unidade.id, competencia),
      listarPendenciasPagamento(unidade.id, competencia),
      listarDiariasEmAberto(unidade.id, competencia),
    ])
      .then(([e, p, d]) => {
        setEnvio(e)
        setPendencias(p)
        setDiarias(d)
      })
      .finally(() => setCarregando(false))
  }

  async function mudarStatus(status: EnvioFopag['status']) {
    if (!unidade) return
    setSalvandoStatus(true)
    try {
      await salvarEnvio({
        empresaId: unidade.empresa_id,
        unidadeId: unidade.id,
        competencia,
        status,
        dataEnvio: status === 'Enviado' ? new Date().toISOString().slice(0, 10) : (envio?.data_envio ?? null),
      })
      recarregar()
    } finally {
      setSalvandoStatus(false)
    }
  }

  async function baixarResumo() {
    if (!unidade) return
    const csv = await gerarCsvResumo(unidade.id, competencia, pendencias, diarias)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `resumo-fopag-${competencia}.csv`
    a.click()
  }

  const status = envio?.status ?? 'Em preparação'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">FOPAG</h1>
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">
              {diaLimite ? contadorLimite(competencia, diaLimite) : 'Dia limite não configurado.'}
            </p>
            {envio?.data_envio && (
              <p className="mt-1 text-xs text-slate-400">Enviado em {formatarData(envio.data_envio)}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASSE[status]}`}>{status}</span>
            <select
              value={status}
              disabled={salvandoStatus}
              onChange={(e) => mudarStatus(e.target.value as EnvioFopag['status'])}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">
                Pendências de pagamento <span className="text-slate-400">({pendencias.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Colaborador</th>
                    <th className="px-3 py-2 font-medium">Motivo</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendencias.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                        Nenhuma pendência em aberto.
                      </td>
                    </tr>
                  )}
                  {pendencias.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        {p.colaborador_id ? (nomes.get(p.colaborador_id) ?? '—') : (p.colaborador_nome ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.motivo ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{formatarMoeda(p.valor_total)}</td>
                      <td className="px-3 py-2 text-slate-600">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Diárias em aberto <span className="text-slate-400">({diarias.length})</span>
            </h2>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Cobriu</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {diarias.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                        Nenhuma diária em aberto.
                      </td>
                    </tr>
                  )}
                  {diarias.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">{formatarData(d.data)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.cobriu_id ? (nomes.get(d.cobriu_id) ?? '—') : (d.cobriu_nome ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatarMoeda(d.valor)}</td>
                      <td className="px-3 py-2 text-slate-600">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={baixarResumo}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Baixar resumo (CSV)
          </button>
        </>
      )}
    </div>
  )
}
