import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/useAuth'
import {
  atualizarItemEstoque,
  atualizarQtdAtual,
  criarItemEstoque,
  excluirItemEstoque,
  listarItensEstoque,
  type ItemEstoque,
} from '../../lib/estoque'

const vazio = {
  nome: '',
  categoria: '',
  unidadeMedida: '',
  qtdAtual: '0',
  minimo: '1',
  local: '',
}

const inputCls =
  'w-full rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
}

export function Estoque() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})
  const [editandoId, setEditandoId] = useState<string | null>(null)

  useEffect(() => {
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarItensEstoque(unidade.id)
      .then((dados) => {
        setItens(dados)
        setEdicoes(Object.fromEntries(dados.map((d) => [d.id, String(d.qtd_atual)])))
      })
      .finally(() => setCarregando(false))
  }

  function editar(i: ItemEstoque) {
    setEditandoId(i.id)
    setForm({
      nome: i.nome,
      categoria: i.categoria ?? '',
      unidadeMedida: i.unidade_medida ?? '',
      qtdAtual: String(i.qtd_atual),
      minimo: String(i.minimo),
      local: i.local ?? '',
    })
    setErro(null)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setForm(vazio)
    setErro(null)
  }

  async function excluir(i: ItemEstoque) {
    if (!confirm(`Excluir "${i.nome}" do estoque?`)) return
    setErro(null)
    try {
      await excluirItemEstoque(i.id)
      if (editandoId === i.id) cancelarEdicao()
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  async function salvar() {
    if (!unidade || !form.nome) {
      setErro('Nome é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      const dados = {
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        nome: form.nome,
        categoria: form.categoria || null,
        unidade_medida: form.unidadeMedida || null,
        qtd_atual: Number(form.qtdAtual) || 0,
        minimo: Number(form.minimo) || 1,
        local: form.local || null,
      }
      if (editandoId) {
        await atualizarItemEstoque(editandoId, dados)
      } else {
        await criarItemEstoque(dados)
      }
      setForm(vazio)
      setEditandoId(null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarQtd(id: string) {
    const valor = Number(edicoes[id])
    if (Number.isNaN(valor)) return
    await atualizarQtdAtual(id, valor)
    recarregar()
  }

  const abaixoDoMinimo = itens.filter((i) => i.qtd_atual <= i.minimo)
  const dadosGrafico = itens.map((i) => ({ nome: i.nome, atual: i.qtd_atual, minimo: i.minimo }))

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Estoque (material de escritório e operação)</h1>

      {abaixoDoMinimo.length > 0 && (
        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          ⚠ {abaixoDoMinimo.length} item(ns) abaixo do estoque mínimo: {abaixoDoMinimo.map((i) => i.nome).join(', ')}
        </div>
      )}

      {itens.length > 0 && (
        <div className="animar-entrada mb-6 rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
          <p className="mb-3 text-sm font-medium text-slate-300">Estoque atual x mínimo</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={dadosGrafico} margin={{ left: 8, right: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="nome"
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
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
                />
                <Bar dataKey="atual" name="Atual" radius={[4, 4, 0, 0]}>
                  {dadosGrafico.map((d, i) => (
                    <Cell key={i} fill={d.atual <= d.minimo ? '#f87171' : '#e2e8f0'} />
                  ))}
                </Bar>
                <Bar dataKey="minimo" name="Mínimo" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">{editandoId ? 'Editar item' : 'Novo item'}</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Nome</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Categoria</label>
            <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Unidade</label>
            <input value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })} className={inputCls} placeholder="un, cx..." />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Qtd. atual</label>
            <input type="number" value={form.qtdAtual} onChange={(e) => setForm({ ...form, qtdAtual: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Mínimo</label>
            <input type="number" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Local</label>
            <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className={inputCls} />
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : editandoId ? 'Salvar edição' : 'Cadastrar'}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="rounded border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Local</th>
              <th className="px-3 py-2 font-medium">Qtd. atual</th>
              <th className="px-3 py-2 font-medium">Mínimo</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && itens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Nenhum item cadastrado.
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr
                key={i.id}
                className={`border-b border-white/5 last:border-0 ${i.qtd_atual <= i.minimo ? 'bg-red-500/10' : ''} ${editandoId === i.id ? 'bg-white/5' : ''}`}
              >
                <td className="px-3 py-2">{i.nome}</td>
                <td className="px-3 py-2 text-slate-400">{i.categoria ?? '—'}</td>
                <td className="px-3 py-2 text-slate-400">{i.local ?? '—'}</td>
                <td className="px-3 py-2">
                  <input
                    value={edicoes[i.id] ?? ''}
                    onChange={(e) => setEdicoes({ ...edicoes, [i.id]: e.target.value })}
                    onBlur={() => salvarQtd(i.id)}
                    className="w-20 rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="ml-1 text-xs text-slate-500">{i.unidade_medida}</span>
                </td>
                <td className={`px-3 py-2 ${i.qtd_atual <= i.minimo ? 'font-medium text-red-400' : 'text-slate-400'}`}>
                  {i.minimo}
                </td>
                <td className="px-3 py-2">
                  {i.qtd_atual <= i.minimo ? (
                    <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">⚠ Baixo</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => editar(i)} className="text-xs text-slate-400 hover:underline">
                    Editar
                  </button>
                  <button type="button" onClick={() => excluir(i)} className="ml-3 text-xs text-red-400 hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
