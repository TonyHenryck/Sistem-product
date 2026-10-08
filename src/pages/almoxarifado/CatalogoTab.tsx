import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  atualizarCategoriaProduto,
  buscarSaldos,
  criarCategoriaProduto,
  criarProduto,
  excluirCategoriaProduto,
  listarCategoriasProduto,
  listarProdutos,
  type CategoriaProduto,
  type Produto,
} from '../../lib/almoxarifado'

const vazio = { codigo: '', nome: '', categoriaId: '', unidadeMedida: '' }

const inputCls =
  'w-full rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

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

  const [gerenciandoCategorias, setGerenciandoCategorias] = useState(false)
  const [edicoesCategorias, setEdicoesCategorias] = useState<Record<string, string>>({})
  const [erroCategorias, setErroCategorias] = useState<string | null>(null)

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

  function abrirGerenciarCategorias() {
    setEdicoesCategorias(Object.fromEntries(categorias.map((c) => [c.id, c.nome])))
    setErroCategorias(null)
    setGerenciandoCategorias(true)
  }

  async function salvarNomeCategoria(id: string) {
    const nome = (edicoesCategorias[id] ?? '').trim()
    const atual = categorias.find((c) => c.id === id)
    if (!nome || nome === atual?.nome) return
    setErroCategorias(null)
    try {
      await atualizarCategoriaProduto(id, nome)
      recarregar()
    } catch (e) {
      setErroCategorias(e instanceof Error ? e.message : 'Erro ao renomear categoria.')
    }
  }

  async function removerCategoria(categoria: CategoriaProduto) {
    if (!confirm(`Remover a categoria "${categoria.nome}"? Produtos que usam ela ficam sem categoria.`)) return
    setErroCategorias(null)
    try {
      await excluirCategoriaProduto(categoria.id)
      recarregar()
    } catch (e) {
      setErroCategorias(e instanceof Error ? e.message : 'Erro ao remover categoria.')
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
      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Novo produto</p>
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
                className="shrink-0 rounded border border-white/10 px-2 text-sm text-slate-400 hover:bg-white/5"
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
                  className="shrink-0 rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-white disabled:opacity-60"
                >
                  Ok
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={abrirGerenciarCategorias}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 hover:underline"
            >
              Gerenciar categorias
            </button>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Unidade</label>
            <input value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })} className={inputCls} placeholder="kg, un, lt..." />
          </div>
        </div>
        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Cadastrar'}
        </button>
      </div>

      {gerenciandoCategorias && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">Categorias de produto</p>
            <button
              type="button"
              onClick={() => setGerenciandoCategorias(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Fechar
            </button>
          </div>

          {erroCategorias && <p className="mb-2 text-sm text-red-400">{erroCategorias}</p>}

          <div className="space-y-2">
            {categorias.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  value={edicoesCategorias[c.id] ?? ''}
                  onChange={(e) => setEdicoesCategorias({ ...edicoesCategorias, [c.id]: e.target.value })}
                  onBlur={() => salvarNomeCategoria(c.id)}
                  className={`${inputCls} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={() => removerCategoria(c)}
                  className="shrink-0 text-xs text-red-400 hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
            {categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>}
          </div>

          <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
            <input
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Nova categoria"
              className={`${inputCls} max-w-xs`}
            />
            <button
              type="button"
              onClick={salvarNovaCategoria}
              disabled={salvandoCategoria || !novaCategoria.trim()}
              className="shrink-0 rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-white disabled:opacity-60"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && produtos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-slate-400">{p.codigo ?? '—'}</td>
                <td className="px-3 py-2">{p.nome}</td>
                <td className="px-3 py-2 text-slate-400">
                  {p.categoria_id ? (nomeCategoria.get(p.categoria_id) ?? '—') : (p.categoria ?? '—')}
                </td>
                <td className="px-3 py-2 text-slate-400">
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
