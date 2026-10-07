import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import { buscarCatalogos, type Catalogo } from '../../lib/colaboradores'
import {
  buscarRelatorio,
  exportarCsv,
  FILTROS_VAZIOS,
  opcoesTipoPara,
  rotuloCampoTipo,
  TIPOS_RELATORIO,
  usaFiltroPeriodo,
  usaFiltroStatusAtivo,
  type FiltrosRelatorio,
  type ResultadoRelatorio,
  type TipoRelatorio,
} from '../../lib/relatorios'

const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
}

const inputCls =
  'rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

export function Relatorios() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('faltas')
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(FILTROS_VAZIOS)
  const [funcoes, setFuncoes] = useState<Catalogo[]>([])
  const [resultado, setResultado] = useState<ResultadoRelatorio | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    buscarCatalogos(unidade.empresa_id, unidade.id).then((c) => setFuncoes(c.funcoes))
  }, [unidade])

  useEffect(() => {
    setFiltros(FILTROS_VAZIOS)
    buscarComFiltros(FILTROS_VAZIOS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidade, tipoRelatorio])

  function buscarComFiltros(f: FiltrosRelatorio) {
    if (!unidade) return
    setCarregando(true)
    setErro(null)
    buscarRelatorio(tipoRelatorio, unidade.id, unidade.empresa_id, f)
      .then(setResultado)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar relatório.'))
      .finally(() => setCarregando(false))
  }

  function aplicarFiltros() {
    buscarComFiltros(filtros)
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS)
    buscarComFiltros(FILTROS_VAZIOS)
  }

  function exportar() {
    if (!resultado) return
    const hoje = new Date().toISOString().slice(0, 10)
    exportarCsv(`relatorio_${tipoRelatorio}_${hoje}.csv`, resultado)
  }

  const opcoesTipo = opcoesTipoPara(tipoRelatorio)
  const rotuloTipo = rotuloCampoTipo(tipoRelatorio)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-lg font-semibold text-slate-100">Relatórios</h1>
        <select
          value={tipoRelatorio}
          onChange={(e) => setTipoRelatorio(e.target.value as TipoRelatorio)}
          className={`${inputCls} w-56`}
        >
          {TIPOS_RELATORIO.map((t) => (
            <option key={t.valor} value={t.valor} className="bg-slate-900">
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 print:hidden">
        <p className="mb-3 text-sm font-medium text-slate-300">Filtros</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {usaFiltroPeriodo(tipoRelatorio) && (
            <>
              <div>
                <label className="mb-1 block text-xs text-slate-500">De</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Até</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                  className={`${inputCls} w-full`}
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-500">Função</label>
            <select
              value={filtros.funcaoId}
              onChange={(e) => setFiltros({ ...filtros, funcaoId: e.target.value })}
              className={`${inputCls} w-full`}
            >
              <option value="">Todas</option>
              {funcoes.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900">
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Nome</label>
            <input
              value={filtros.nomeBusca}
              onChange={(e) => setFiltros({ ...filtros, nomeBusca: e.target.value })}
              placeholder="Buscar colaborador..."
              className={`${inputCls} w-full`}
            />
          </div>

          {opcoesTipo.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">{rotuloTipo}</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                className={`${inputCls} w-full`}
              >
                <option value="">Todos</option>
                {opcoesTipo.map((o) => (
                  <option key={o.valor} value={o.valor} className="bg-slate-900">
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {usaFiltroStatusAtivo(tipoRelatorio) && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">Status</label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                className={`${inputCls} w-full`}
              >
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="desligado">Desligado</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={aplicarFiltros}
            className="rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
          >
            Filtrar
          </button>
          <button
            onClick={limparFiltros}
            className="rounded border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
          >
            Limpar filtros
          </button>
          <div className="flex-1" />
          <button
            onClick={exportar}
            disabled={!resultado || resultado.linhas.length === 0}
            className="rounded border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={!resultado || resultado.linhas.length === 0}
            className="rounded border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 print:hidden">{erro}</p>
      )}

      <div className="hidden print:mb-4 print:block">
        <h1 className="text-lg font-semibold text-slate-900">
          Relatório — {TIPOS_RELATORIO.find((t) => t.valor === tipoRelatorio)?.rotulo}
        </h1>
        <p className="text-xs text-slate-600">Gerado em {new Date().toLocaleString('pt-BR')}</p>
      </div>

      {carregando && <p className="text-slate-400 print:hidden">Carregando...</p>}

      {!carregando && resultado && (
        <>
          {resultado.grafico && resultado.grafico.dados.length > 0 && (
            <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl print:border-slate-300 print:bg-white">
              <p className="mb-3 text-sm font-medium text-slate-300 print:text-slate-900">{resultado.grafico.titulo}</p>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={resultado.grafico.dados} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={32} allowDecimals={false} />
                    <Tooltip {...ESTILO_TOOLTIP} />
                    <Bar dataKey="valor" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl print:border-slate-300 print:bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500 print:border-slate-300 print:text-slate-600">
                  {resultado.colunas.map((c) => (
                    <th key={c.chave} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.linhas.length === 0 && (
                  <tr>
                    <td colSpan={resultado.colunas.length} className="px-3 py-4 text-center text-slate-500">
                      Nenhum registro encontrado com esses filtros.
                    </td>
                  </tr>
                )}
                {resultado.linhas.map((linha, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 last:border-0 print:border-slate-200 print:text-slate-900"
                  >
                    {resultado.colunas.map((c) => (
                      <td key={c.chave} className="whitespace-nowrap px-3 py-2 text-slate-300 print:text-slate-900">
                        {linha[c.chave]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-slate-500 print:hidden">{resultado.linhas.length} registro(s) encontrado(s).</p>
        </>
      )}
    </div>
  )
}
