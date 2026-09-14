import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { criarMovimento, listarMovimentos, listarProdutos, type MovimentoEstoque, type MovimentoEstoqueInsert, type Produto } from '../../lib/almoxarifado'
import { formatarData } from '../../utils/data'

const TIPOS: MovimentoEstoqueInsert['tipo'][] = ['Entrada', 'Saída', 'Ajuste', 'Perda', 'Transferência']

const vazio = {
  produtoId: '',
  data: '',
  tipo: '' as MovimentoEstoqueInsert['tipo'] | '',
  qtd: '',
  local: '',
  responsavel: '',
  setor: '',
  obs: '',
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function MovimentosTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    listarProdutos(unidade.empresa_id).then(setProdutos)
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarMovimentos(unidade.id)
      .then(setMovimentos)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.produtoId || !form.data || !form.tipo || !form.qtd) {
      setErro('Produto, data, tipo e quantidade são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarMovimento({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        produto_id: form.produtoId,
        data: form.data,
        tipo: form.tipo,
        qtd: Number(form.qtd),
        local: form.local || null,
        responsavel: form.responsavel || null,
        setor: form.setor || null,
        obs: form.obs || null,
      })
      setForm(vazio)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const nomesProduto = new Map(produtos.map((p) => [p.id, p.nome]))

  return (
    <div>
      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-medium text-slate-700">Registrar movimento</p>
        <p className="mb-3 text-xs text-slate-400">
          Em "Entrada", "Saída" e "Perda" digite a quantidade sempre positiva. Em "Ajuste" e
          "Transferência" o sinal importa: negativo diminui o saldo, positivo aumenta.
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Produto</label>
            <select value={form.produtoId} onChange={(e) => setForm({ ...form, produtoId: e.target.value })} className={inputCls}>
              <option value="">Selecione</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Data</label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as MovimentoEstoqueInsert['tipo'] })}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Quantidade</label>
            <input type="number" step="0.001" value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Local</label>
            <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Setor</label>
            <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Responsável</label>
            <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} />
          </div>
        </div>
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Registrar'}
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && movimentos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                  Nenhum movimento registrado.
                </td>
              </tr>
            )}
            {movimentos.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{formatarData(m.data)}</td>
                <td className="px-3 py-2">{nomesProduto.get(m.produto_id) ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{m.tipo}</td>
                <td className="px-3 py-2 text-slate-600">{m.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
