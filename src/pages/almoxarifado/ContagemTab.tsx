import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  adicionarItemContagem,
  buscarSaldoProduto,
  criarContagem,
  fecharContagem,
  listarContagens,
  listarItensContagem,
  listarProdutos,
  type Contagem,
  type ContagemItem,
  type Produto,
} from '../../lib/almoxarifado'
import { formatarData } from '../../utils/data'

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function ContagemTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [contagens, setContagens] = useState<Contagem[]>([])
  const [selecionada, setSelecionada] = useState<Contagem | null>(null)
  const [itens, setItens] = useState<ContagemItem[]>([])
  const [carregando, setCarregando] = useState(true)

  const [novaData, setNovaData] = useState('')
  const [novoLocal, setNovoLocal] = useState('')
  const [novoResponsavel, setNovoResponsavel] = useState('')

  const [produtoId, setProdutoId] = useState('')
  const [qtdSistema, setQtdSistema] = useState<number | null>(null)
  const [qtdContada, setQtdContada] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    listarProdutos(unidade.empresa_id).then(setProdutos)
    recarregarContagens()
  }, [unidade])

  function recarregarContagens() {
    if (!unidade) return
    setCarregando(true)
    listarContagens(unidade.id)
      .then(setContagens)
      .finally(() => setCarregando(false))
  }

  function abrir(c: Contagem) {
    setSelecionada(c)
    listarItensContagem(c.id).then(setItens)
  }

  async function criarNova() {
    if (!unidade || !novaData) {
      setErro('Data é obrigatória.')
      return
    }
    setErro(null)
    const nova = await criarContagem({
      empresa_id: unidade.empresa_id,
      unidade_id: unidade.id,
      data: novaData,
      local: novoLocal || null,
      responsavel: novoResponsavel || null,
    })
    setNovaData('')
    setNovoLocal('')
    setNovoResponsavel('')
    recarregarContagens()
    abrir(nova)
  }

  async function escolherProduto(id: string) {
    setProdutoId(id)
    if (!unidade || !id) {
      setQtdSistema(null)
      return
    }
    setQtdSistema(await buscarSaldoProduto(unidade.id, id))
  }

  async function adicionarItem() {
    if (!selecionada || !produtoId || qtdContada === '') return
    await adicionarItemContagem(selecionada.id, produtoId, qtdSistema ?? 0, Number(qtdContada))
    setProdutoId('')
    setQtdSistema(null)
    setQtdContada('')
    listarItensContagem(selecionada.id).then(setItens)
  }

  async function fechar() {
    if (!selecionada) return
    await fecharContagem(selecionada.id)
    recarregarContagens()
    setSelecionada({ ...selecionada, status: 'Fechada' })
  }

  const nomesProduto = new Map(produtos.map((p) => [p.id, p.nome]))

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="mb-6 rounded border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Nova contagem</p>
          <div className="grid grid-cols-3 gap-3">
            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className={inputCls} />
            <input placeholder="Local" value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} className={inputCls} />
            <input placeholder="Responsável" value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)} className={inputCls} />
          </div>
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
          <button
            onClick={criarNova}
            className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Iniciar contagem
          </button>
        </div>

        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Local</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              )}
              {!carregando && contagens.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                    Nenhuma contagem iniciada.
                  </td>
                </tr>
              )}
              {contagens.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => abrir(c)}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                    selecionada?.id === c.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="px-3 py-2">{formatarData(c.data)}</td>
                  <td className="px-3 py-2 text-slate-600">{c.local ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {!selecionada ? (
          <p className="text-sm text-slate-400">Selecione uma contagem à esquerda.</p>
        ) : (
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Itens — {formatarData(selecionada.data)} ({selecionada.status})
              </p>
              {selecionada.status === 'Em andamento' && (
                <button onClick={fechar} className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                  Fechar contagem
                </button>
              )}
            </div>

            {selecionada.status === 'Em andamento' && (
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <select value={produtoId} onChange={(e) => escolherProduto(e.target.value)} className={`${inputCls} max-w-[180px]`}>
                  <option value="">Produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">Sistema: {qtdSistema ?? '—'}</span>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Contado"
                  value={qtdContada}
                  onChange={(e) => setQtdContada(e.target.value)}
                  className={`${inputCls} max-w-[100px]`}
                />
                <button onClick={adicionarItem} className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
                  Adicionar
                </button>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-1 font-medium">Produto</th>
                  <th className="py-1 font-medium">Sistema</th>
                  <th className="py-1 font-medium">Contado</th>
                  <th className="py-1 font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400">
                      Nenhum item contado ainda.
                    </td>
                  </tr>
                )}
                {itens.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-1">{nomesProduto.get(i.produto_id) ?? '—'}</td>
                    <td className="py-1 text-slate-600">{i.qtd_sistema}</td>
                    <td className="py-1 text-slate-600">{i.qtd_contada}</td>
                    <td className={`py-1 ${i.diferenca && i.diferenca !== 0 ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                      {i.diferenca}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
