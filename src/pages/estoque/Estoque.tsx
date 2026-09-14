import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { atualizarQtdAtual, criarItemEstoque, listarItensEstoque, type ItemEstoque } from '../../lib/estoque'

const vazio = {
  nome: '',
  categoria: '',
  unidadeMedida: '',
  qtdAtual: '0',
  minimo: '1',
  local: '',
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function Estoque() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})

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

  async function salvar() {
    if (!unidade || !form.nome) {
      setErro('Nome é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await criarItemEstoque({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        nome: form.nome,
        categoria: form.categoria || null,
        unidade_medida: form.unidadeMedida || null,
        qtd_atual: Number(form.qtdAtual) || 0,
        minimo: Number(form.minimo) || 1,
        local: form.local || null,
      })
      setForm(vazio)
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

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Estoque (material de escritório e operação)</h1>

      {abaixoDoMinimo.length > 0 && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {abaixoDoMinimo.length} item(ns) abaixo do estoque mínimo.
        </div>
      )}

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Novo item</p>
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

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Cadastrar'}
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Local</th>
              <th className="px-3 py-2 font-medium">Qtd. atual</th>
              <th className="px-3 py-2 font-medium">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && itens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Nenhum item cadastrado.
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr key={i.id} className={`border-b border-slate-100 last:border-0 ${i.qtd_atual <= i.minimo ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-2">{i.nome}</td>
                <td className="px-3 py-2 text-slate-600">{i.categoria ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{i.local ?? '—'}</td>
                <td className="px-3 py-2">
                  <input
                    value={edicoes[i.id] ?? ''}
                    onChange={(e) => setEdicoes({ ...edicoes, [i.id]: e.target.value })}
                    onBlur={() => salvarQtd(i.id)}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <span className="ml-1 text-xs text-slate-400">{i.unidade_medida}</span>
                </td>
                <td className={`px-3 py-2 ${i.qtd_atual <= i.minimo ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                  {i.minimo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
