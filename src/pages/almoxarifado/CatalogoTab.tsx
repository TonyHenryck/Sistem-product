import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  buscarSaldos,
  criarCategoriaProduto,
  criarProduto,
  listarCategoriasProduto,
  listarProdutos,
  type CategoriaProduto,
  type Produto,
} from '../../lib/almoxarifado'

const vazio = { codigo: '', nome: '', categoriaId: '', unidadeMedida: '' }

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function CatalogoTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([])
  const [saldos, setSaldos] = useState<Map<string, number>>(new Map())
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  useEffect(() => {
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    Promise.all([
      listarProdutos(unidade.empresa_id),
      buscarSaldos(unidade.id),
      listarCategoriasProduto(unidade.empresa_id),
    ])
      .then(([p, s, c]) => {
        setProdutos(p)
        setSaldos(s)
        setCategorias(c)
      })
      .finally(() => setCarregando(false))
  }

  const nomeCategoria = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])

  async function salvarNovaCategoria() {
    if (!unidade || !novaCategoria.trim()) return
    setSalvandoCategoria(true)
    try {
      const criada = await criarCategoriaProduto(unidade.empresa_id, novaCategoria.trim())
      setCategorias((atual) => [...atual, criada].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((f) => ({ ...f, categoriaId: criada.id }))
      setNovaCategoria('')
      setMostrarNovaCategoria(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar categoria.')
    } finally {
      setSalvandoCategoria(false)
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
      await criarProduto({
        empresa_id: unidade.empresa_id,
        codigo: form.codigo || null,
        nome: form.nome,
        categoria_id: form.categoriaId || null,
        unidade_medida: form.unidadeMedida || null,
      })
      setForm(vazio)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Novo produto</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Código</label>
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Nome</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Categoria</label>
            <div className="flex gap-1">
              <select
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                className={inputCls}
              >
                <option value="">—</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMostrarNovaCategoria((v) => !v)}
                className="shrink-0 rounded border border-slate-300 px-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                +
              </button>
            </div>
            {mostrarNovaCategoria && (
              <div className="mt-2 flex gap-2">
                <input
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Nova categoria"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={salvarNovaCategoria}
                  disabled={salvandoCategoria || !novaCategoria.trim()}
                  className="shrink-0 rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Ok
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Unidade</label>
            <input value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })} className={inputCls} placeholder="kg, un, lt..." />
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
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
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
            {!carregando && produtos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-600">{p.codigo ?? '—'}</td>
                <td className="px-3 py-2">{p.nome}</td>
                <td className="px-3 py-2 text-slate-600">
                  {p.categoria_id ? (nomeCategoria.get(p.categoria_id) ?? '—') : (p.categoria ?? '—')}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {saldos.get(p.id) ?? 0} {p.unidade_medida}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
