import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import {
  atenderRequisicao,
  criarRequisicao,
  listarProdutos,
  listarRequisicoes,
  type Produto,
  type Requisicao,
  type RequisicaoInsert,
} from '../../lib/almoxarifado'
import { formatarData } from '../../utils/data'

const URGENCIAS: NonNullable<RequisicaoInsert['urgencia']>[] = ['Normal', 'Para hoje', 'Urgente']

const vazio = {
  data: '',
  setor: '',
  solicitanteId: '',
  produtoId: '',
  itemNome: '',
  qtdPedida: '',
  urgencia: '' as NonNullable<RequisicaoInsert['urgencia']> | '',
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function RequisicoesTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [atendendo, setAtendendo] = useState<Record<string, { qtd: string; entreguePor: string }>>({})

  useEffect(() => {
    if (!unidade) return
    listarColaboradoresAtivos(unidade.id).then(setColaboradores)
    listarNomesColaboradores(unidade.id).then((lista) => setNomes(new Map(lista.map((c) => [c.id, c.nome]))))
    listarProdutos(unidade.empresa_id).then(setProdutos)
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarRequisicoes(unidade.id)
      .then(setRequisicoes)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.data || !form.qtdPedida || (!form.produtoId && !form.itemNome)) {
      setErro('Data, quantidade e produto (ou nome do item) são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarRequisicao({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        data: form.data,
        setor: form.setor || null,
        solicitante_id: form.solicitanteId || null,
        produto_id: form.produtoId || null,
        item_nome: form.produtoId ? null : form.itemNome || null,
        qtd_pedida: Number(form.qtdPedida),
        urgencia: form.urgencia || null,
      })
      setForm(vazio)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarAtendimento(r: Requisicao) {
    const info = atendendo[r.id]
    if (!info?.qtd) return
    await atenderRequisicao(r.id, Number(info.qtd), info.entreguePor || null, r.qtd_pedida)
    setAtendendo((atual) => {
      const copia = { ...atual }
      delete copia[r.id]
      return copia
    })
    recarregar()
  }

  const nomesProduto = new Map(produtos.map((p) => [p.id, p.nome]))

  return (
    <div>
      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Nova requisição</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Data</label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Setor</label>
            <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Solicitante</label>
            <select value={form.solicitanteId} onChange={(e) => setForm({ ...form, solicitanteId: e.target.value })} className={inputCls}>
              <option value="">—</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Urgência</label>
            <select
              value={form.urgencia}
              onChange={(e) => setForm({ ...form, urgencia: e.target.value as NonNullable<RequisicaoInsert['urgencia']> })}
              className={inputCls}
            >
              <option value="">—</option>
              {URGENCIAS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Produto do catálogo</label>
            <select value={form.produtoId} onChange={(e) => setForm({ ...form, produtoId: e.target.value, itemNome: '' })} className={inputCls}>
              <option value="">—</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Ou item avulso</label>
            <input
              value={form.itemNome}
              onChange={(e) => setForm({ ...form, itemNome: e.target.value, produtoId: '' })}
              disabled={Boolean(form.produtoId)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Quantidade pedida</label>
            <input type="number" step="0.001" value={form.qtdPedida} onChange={(e) => setForm({ ...form, qtdPedida: e.target.value })} className={inputCls} />
          </div>
        </div>
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Solicitar'}
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Setor</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Qtd. pedida</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && requisicoes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma requisição registrada.
                </td>
              </tr>
            )}
            {requisicoes.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{formatarData(r.data)}</td>
                <td className="px-3 py-2 text-slate-600">{r.setor ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">
                  {r.produto_id ? (nomesProduto.get(r.produto_id) ?? '—') : (r.item_nome ?? '—')}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.qtd_pedida}</td>
                <td className="px-3 py-2 text-slate-600">{r.status}</td>
                <td className="px-3 py-2">
                  {r.status === 'Solicitada' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Qtd entregue"
                        value={atendendo[r.id]?.qtd ?? ''}
                        onChange={(e) =>
                          setAtendendo({ ...atendendo, [r.id]: { qtd: e.target.value, entreguePor: atendendo[r.id]?.entreguePor ?? '' } })
                        }
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => confirmarAtendimento(r)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Atender
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {r.qtd_entregue ?? 0} entregue{r.entregue_por_id ? ` — ${nomes.get(r.entregue_por_id) ?? ''}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
