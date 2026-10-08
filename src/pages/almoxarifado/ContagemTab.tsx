import { useEffect, useRef, useState, type DragEvent } from 'react'
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
import { extrairPosicaoEstoqueTeknisa, type PosicaoEstoqueTeknisa } from '../../lib/estoqueTeknisa'
import { formatarData } from '../../utils/data'
import { formatarQtd } from '../../utils/numero'

const inputCls =
  'w-full rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

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

  const [arrastando, setArrastando] = useState(false)
  const [processandoPdf, setProcessandoPdf] = useState(false)
  const [previa, setPrevia] = useState<PosicaoEstoqueTeknisa | null>(null)
  const [escolhasManuais, setEscolhasManuais] = useState<Record<number, string>>({})
  const [importando, setImportando] = useState(false)
  const [mensagemImportacao, setMensagemImportacao] = useState<string | null>(null)
  const inputPdfRef = useRef<HTMLInputElement>(null)

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

  async function processarPdf(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setMensagemImportacao(null)
    setProcessandoPdf(true)
    try {
      const resultado = await extrairPosicaoEstoqueTeknisa(arquivo, produtos)
      setPrevia(resultado)
      setEscolhasManuais({})
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao ler o PDF.')
    } finally {
      setProcessandoPdf(false)
      if (inputPdfRef.current) inputPdfRef.current.value = ''
    }
  }

  function aoSoltarPdf(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setArrastando(false)
    processarPdf(e.dataTransfer.files?.[0])
  }

  async function confirmarImportacao() {
    if (!unidade || !previa) return
    const resolvidos = previa.linhas
      .map((linha, i) => ({ linha, produtoId: escolhasManuais[i] || linha.produtoId }))
      .filter((r): r is { linha: (typeof previa.linhas)[number]; produtoId: string } => Boolean(r.produtoId))

    if (resolvidos.length === 0) {
      setErro('Nenhuma linha com produto identificado pra importar.')
      return
    }

    setImportando(true)
    setErro(null)
    try {
      const nova = await criarContagem({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        data: previa.dataPosicao ?? new Date().toISOString().slice(0, 10),
        local: previa.unidadeNome ? `Teknisa — ${previa.unidadeNome}` : 'Importado do Teknisa',
        responsavel: null,
      })

      for (const { linha, produtoId: pid } of resolvidos) {
        const qtdSist = await buscarSaldoProduto(unidade.id, pid)
        await adicionarItemContagem(nova.id, pid, qtdSist, linha.qtde)
      }

      setMensagemImportacao(`${resolvidos.length} de ${previa.linhas.length} produto(s) importado(s) do Teknisa.`)
      setPrevia(null)
      setEscolhasManuais({})
      recarregarContagens()
      abrir(nova)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar.')
    } finally {
      setImportando(false)
    }
  }

  async function fechar() {
    if (!selecionada) return
    await fecharContagem(selecionada.id)
    recarregarContagens()
    setSelecionada({ ...selecionada, status: 'Fechada' })
  }

  const nomesProduto = new Map(produtos.map((p) => [p.id, p.nome]))

  return (
    <div>
      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <p className="mb-1 text-sm font-medium text-slate-300">Importar Posição de Estoque (Teknisa)</p>
        <p className="mb-3 text-xs text-slate-500">
          Arraste o PDF do relatório EST31100 aqui. O sistema casa cada produto pelo código do Teknisa e cria uma
          contagem nova já com a quantidade contada preenchida — você só confere e fecha.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltarPdf}
          onClick={() => inputPdfRef.current?.click()}
          className={`cursor-pointer rounded border-2 border-dashed p-6 text-center text-sm ${
            arrastando ? 'border-slate-500 bg-white/5' : 'border-white/10 text-slate-500'
          }`}
        >
          {processandoPdf ? 'Lendo PDF...' : 'Arraste o PDF aqui, ou clique para escolher o arquivo.'}
          <input
            ref={inputPdfRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => processarPdf(e.target.files?.[0])}
          />
        </div>

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
        {mensagemImportacao && <p className="mt-3 text-sm text-emerald-400">{mensagemImportacao}</p>}

        {previa && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">
              {previa.unidadeNome && <>Unidade: {previa.unidadeNome} · </>}
              {previa.dataPosicao && <>Posição em {formatarData(previa.dataPosicao)} · </>}
              {previa.linhas.filter((l) => l.produtoId).length} de {previa.linhas.length} produto(s) identificados
              automaticamente.
            </p>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-500">
                    <th className="py-1 pr-2 font-medium">Produto (Teknisa)</th>
                    <th className="py-1 pr-2 font-medium">UN</th>
                    <th className="py-1 pr-2 font-medium">Qtde</th>
                    <th className="py-1 pr-2 font-medium">Produto no catálogo</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.linhas.map((l, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-1 pr-2">{l.nomeProduto}</td>
                      <td className="py-1 pr-2 text-slate-400">{l.unidade}</td>
                      <td className="py-1 pr-2 text-slate-400">{formatarQtd(l.qtde)}</td>
                      <td className="py-1 pr-2">
                        {l.produtoId ? (
                          nomesProduto.get(l.produtoId)
                        ) : (
                          <select
                            value={escolhasManuais[i] ?? ''}
                            onChange={(e) => setEscolhasManuais({ ...escolhasManuais, [i]: e.target.value })}
                            className={`${inputCls} border-amber-500/40`}
                          >
                            <option value="">Não encontrado — escolher</option>
                            {produtos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={confirmarImportacao}
              disabled={importando}
              className="mt-3 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
            >
              {importando ? 'Importando...' : 'Confirmar e criar contagem'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">Nova contagem</p>
            <div className="grid grid-cols-3 gap-3">
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className={inputCls} />
              <input placeholder="Local" value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} className={inputCls} />
              <input placeholder="Responsável" value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={criarNova}
              className="mt-3 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
            >
              Iniciar contagem
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Local</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!carregando && contagens.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      Nenhuma contagem iniciada.
                    </td>
                  </tr>
                )}
                {contagens.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => abrir(c)}
                    className={`cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5 ${
                      selecionada?.id === c.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2">{formatarData(c.data)}</td>
                    <td className="px-3 py-2 text-slate-400">{c.local ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-400">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {!selecionada ? (
          <p className="text-sm text-slate-500">Selecione uma contagem à esquerda.</p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">
                Itens — {formatarData(selecionada.data)} ({selecionada.status})
              </p>
              {selecionada.status === 'Em andamento' && (
                <button onClick={fechar} className="rounded border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">
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
                <span className="text-xs text-slate-500">Sistema: {formatarQtd(qtdSistema)}</span>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Contado"
                  value={qtdContada}
                  onChange={(e) => setQtdContada(e.target.value)}
                  className={`${inputCls} max-w-[100px]`}
                />
                <button onClick={adicionarItem} className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-white">
                  Adicionar
                </button>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500">
                  <th className="py-1 font-medium">Produto</th>
                  <th className="py-1 font-medium">Sistema</th>
                  <th className="py-1 font-medium">Contado</th>
                  <th className="py-1 font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-500">
                      Nenhum item contado ainda.
                    </td>
                  </tr>
                )}
                {itens.map((i) => (
                  <tr key={i.id} className="border-b border-white/5 last:border-0">
                    <td className="py-1">{nomesProduto.get(i.produto_id) ?? '—'}</td>
                    <td className="py-1 text-slate-400">{formatarQtd(i.qtd_sistema)}</td>
                    <td className="py-1 text-slate-400">{formatarQtd(i.qtd_contada)}</td>
                    <td className={`py-1 ${i.diferenca && i.diferenca !== 0 ? 'font-medium text-red-400' : 'text-slate-500'}`}>
                      {formatarQtd(i.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
