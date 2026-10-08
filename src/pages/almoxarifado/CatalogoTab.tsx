import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  atualizarCategoriaProduto,
  atualizarProdutoCategoria,
  atualizarProdutoUnidade,
  atualizarUnidadeMedida,
  buscarSaldos,
  criarCategoriaProduto,
  criarProduto,
  criarUnidadeMedida,
  excluirCategoriaProduto,
  excluirUnidadeMedida,
  listarCategoriasProduto,
  listarProdutos,
  listarUnidadesMedida,
  type CategoriaProduto,
  type Produto,
  type UnidadeMedida,
} from '../../lib/almoxarifado'
import { formatarQtd } from '../../utils/numero'

const vazio = { codigo: '', nome: '', categoriaId: '', unidadeMedidaId: '' }

const inputCls =
  'w-full rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

export function CatalogoTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([])
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([])
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

  const [mostrarNovaUnidade, setMostrarNovaUnidade] = useState(false)
  const [novaUnidadeNome, setNovaUnidadeNome] = useState('')
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState('')
  const [salvandoUnidade, setSalvandoUnidade] = useState(false)

  const [gerenciandoUnidades, setGerenciandoUnidades] = useState(false)
  const [edicoesUnidades, setEdicoesUnidades] = useState<Record<string, { nome: string; sigla: string }>>({})
  const [erroUnidades, setErroUnidades] = useState<string | null>(null)

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
      listarUnidadesMedida(unidade.empresa_id),
    ])
      .then(([p, s, c, u]) => {
        setProdutos(p)
        setSaldos(s)
        setCategorias(c)
        setUnidadesMedida(u)
      })
      .finally(() => setCarregando(false))
  }

  const siglaUnidade = useMemo(() => new Map(unidadesMedida.map((u) => [u.id, u.sigla])), [unidadesMedida])

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

  async function salvarNovaUnidade() {
    if (!unidade || !novaUnidadeNome.trim() || !novaUnidadeSigla.trim()) return
    setSalvandoUnidade(true)
    try {
      const criada = await criarUnidadeMedida(unidade.empresa_id, novaUnidadeNome.trim(), novaUnidadeSigla.trim())
      setUnidadesMedida((atual) => [...atual, criada].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((f) => ({ ...f, unidadeMedidaId: criada.id }))
      setNovaUnidadeNome('')
      setNovaUnidadeSigla('')
      setMostrarNovaUnidade(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar unidade de medida.')
    } finally {
      setSalvandoUnidade(false)
    }
  }

  function abrirGerenciarUnidades() {
    setEdicoesUnidades(Object.fromEntries(unidadesMedida.map((u) => [u.id, { nome: u.nome, sigla: u.sigla }])))
    setErroUnidades(null)
    setGerenciandoUnidades(true)
  }

  async function salvarEdicaoUnidade(id: string) {
    const edicao = edicoesUnidades[id]
    const atual = unidadesMedida.find((u) => u.id === id)
    if (!edicao || !edicao.nome.trim() || !edicao.sigla.trim()) return
    if (edicao.nome === atual?.nome && edicao.sigla === atual?.sigla) return
    setErroUnidades(null)
    try {
      await atualizarUnidadeMedida(id, edicao.nome.trim(), edicao.sigla.trim())
      recarregar()
    } catch (e) {
      setErroUnidades(e instanceof Error ? e.message : 'Erro ao editar unidade de medida.')
    }
  }

  async function removerUnidade(unidadeMedida: UnidadeMedida) {
    if (!confirm(`Remover a unidade "${unidadeMedida.nome}"? Produtos que usam ela ficam sem unidade.`)) return
    setErroUnidades(null)
    try {
      await excluirUnidadeMedida(unidadeMedida.id)
      recarregar()
    } catch (e) {
      setErroUnidades(e instanceof Error ? e.message : 'Erro ao remover unidade de medida.')
    }
  }

  async function mudarCategoriaProduto(produtoId: string, categoriaId: string) {
    setErro(null)
    try {
      await atualizarProdutoCategoria(produtoId, categoriaId || null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar categoria do produto.')
    }
  }

  async function mudarUnidadeProduto(produtoId: string, unidadeMedidaId: string) {
    setErro(null)
    try {
      await atualizarProdutoUnidade(produtoId, unidadeMedidaId || null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar unidade do produto.')
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
        unidade_medida_id: form.unidadeMedidaId || null,
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
            <div className="flex gap-1">
              <select
                value={form.unidadeMedidaId}
                onChange={(e) => setForm({ ...form, unidadeMedidaId: e.target.value })}
                className={inputCls}
              >
                <option value="">—</option>
                {unidadesMedida.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.sigla})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMostrarNovaUnidade((v) => !v)}
                className="shrink-0 rounded border border-white/10 px-2 text-sm text-slate-400 hover:bg-white/5"
              >
                +
              </button>
            </div>
            {mostrarNovaUnidade && (
              <div className="mt-2 flex gap-2">
                <input
                  value={novaUnidadeNome}
                  onChange={(e) => setNovaUnidadeNome(e.target.value)}
                  placeholder="Nome (ex: Quilograma)"
                  className={inputCls}
                />
                <input
                  value={novaUnidadeSigla}
                  onChange={(e) => setNovaUnidadeSigla(e.target.value)}
                  placeholder="Sigla (ex: kg)"
                  className={`${inputCls} max-w-[6rem]`}
                />
                <button
                  type="button"
                  onClick={salvarNovaUnidade}
                  disabled={salvandoUnidade || !novaUnidadeNome.trim() || !novaUnidadeSigla.trim()}
                  className="shrink-0 rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-white disabled:opacity-60"
                >
                  Ok
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={abrirGerenciarUnidades}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 hover:underline"
            >
              Gerenciar unidades
            </button>
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

      {gerenciandoUnidades && (
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">Unidades de medida</p>
            <button
              type="button"
              onClick={() => setGerenciandoUnidades(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Fechar
            </button>
          </div>

          {erroUnidades && <p className="mb-2 text-sm text-red-400">{erroUnidades}</p>}

          <div className="space-y-2">
            {unidadesMedida.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <input
                  value={edicoesUnidades[u.id]?.nome ?? ''}
                  onChange={(e) =>
                    setEdicoesUnidades({ ...edicoesUnidades, [u.id]: { ...edicoesUnidades[u.id], nome: e.target.value } })
                  }
                  onBlur={() => salvarEdicaoUnidade(u.id)}
                  className={`${inputCls} max-w-xs`}
                />
                <input
                  value={edicoesUnidades[u.id]?.sigla ?? ''}
                  onChange={(e) =>
                    setEdicoesUnidades({ ...edicoesUnidades, [u.id]: { ...edicoesUnidades[u.id], sigla: e.target.value } })
                  }
                  onBlur={() => salvarEdicaoUnidade(u.id)}
                  className={`${inputCls} max-w-[6rem]`}
                />
                <button
                  type="button"
                  onClick={() => removerUnidade(u)}
                  className="shrink-0 text-xs text-red-400 hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
            {unidadesMedida.length === 0 && <p className="text-sm text-slate-500">Nenhuma unidade cadastrada.</p>}
          </div>

          <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
            <input
              value={novaUnidadeNome}
              onChange={(e) => setNovaUnidadeNome(e.target.value)}
              placeholder="Nome (ex: Quilograma)"
              className={`${inputCls} max-w-xs`}
            />
            <input
              value={novaUnidadeSigla}
              onChange={(e) => setNovaUnidadeSigla(e.target.value)}
              placeholder="Sigla (ex: kg)"
              className={`${inputCls} max-w-[6rem]`}
            />
            <button
              type="button"
              onClick={salvarNovaUnidade}
              disabled={salvandoUnidade || !novaUnidadeNome.trim() || !novaUnidadeSigla.trim()}
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
              <th className="px-3 py-2 font-medium">Unidade</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && produtos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-slate-400">{p.codigo ?? '—'}</td>
                <td className="px-3 py-2">{p.nome}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.categoria_id ?? ''}
                    onChange={(e) => mudarCategoriaProduto(p.id, e.target.value)}
                    className={`${inputCls} min-w-[9rem]`}
                  >
                    <option value="">{p.categoria_id ? '—' : (p.categoria ?? '—')}</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={p.unidade_medida_id ?? ''}
                    onChange={(e) => mudarUnidadeProduto(p.id, e.target.value)}
                    className={`${inputCls} min-w-[8rem]`}
                  >
                    <option value="">{p.unidade_medida_id ? '—' : (p.unidade_medida ?? '—')}</option>
                    {unidadesMedida.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.sigla})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {formatarQtd(saldos.get(p.id) ?? 0)}{' '}
                  {p.unidade_medida_id ? (siglaUnidade.get(p.unidade_medida_id) ?? '') : (p.unidade_medida ?? '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
