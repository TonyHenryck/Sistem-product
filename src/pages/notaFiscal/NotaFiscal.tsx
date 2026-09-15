import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { excluirAnexo, enviarAnexo, listarAnexos, urlAnexo, type Anexo } from '../../lib/anexos'
import { listarProdutos, type Produto } from '../../lib/almoxarifado'
import { parseNFeXml } from '../../lib/nfeXml'
import {
  buscarCategoriasCusto,
  confirmarConferencia,
  importarNFe,
  listarItensNota,
  listarNotas,
  rejeitarNota,
  vincularProdutoItem,
  type NotaFiscal as NotaFiscalRow,
  type NotaItem,
} from '../../lib/notaFiscal'
import { formatarData } from '../../utils/data'
import { formatarMoeda } from '../../utils/moeda'

const ENTIDADE_NOTA = 'nota_fiscal'

const STATUS_CLASSE: Record<NotaFiscalRow['status'], string> = {
  'Pendente conferência': 'bg-amber-100 text-amber-800',
  Conferida: 'bg-emerald-100 text-emerald-700',
  Rejeitada: 'bg-red-100 text-red-700',
}

function normalizar(texto: string): string {
  return texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function NotaFiscal() {
  const { vinculos, session } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [notas, setNotas] = useState<NotaFiscalRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [arrastando, setArrastando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [importando, setImportando] = useState(false)

  const [selecionada, setSelecionada] = useState<NotaFiscalRow | null>(null)
  const [itens, setItens] = useState<NotaItem[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [enviandoAnexo, setEnviandoAnexo] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const anexoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!unidade) return
    listarProdutos(unidade.empresa_id).then(setProdutos)
    buscarCategoriasCusto(unidade.empresa_id).then(setCategorias)
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarNotas(unidade.id)
      .then(setNotas)
      .finally(() => setCarregando(false))
  }

  async function processarArquivos(arquivos: FileList | null) {
    if (!unidade || !arquivos) return

    for (const arquivo of Array.from(arquivos)) {
      if (!arquivo.name.toLowerCase().endsWith('.xml')) {
        setMensagem({
          tipo: 'erro',
          texto: `"${arquivo.name}": pra importar preciso do XML da NFe. PDF e foto (romaneio, etc.) podem ser anexados depois de abrir a nota na lista.`,
        })
        continue
      }

      setImportando(true)
      const texto = await arquivo.text()
      const resultado = parseNFeXml(texto)

      if ('erro' in resultado) {
        setMensagem({ tipo: 'erro', texto: `"${arquivo.name}": ${resultado.erro}` })
        setImportando(false)
        continue
      }

      const importado = await importarNFe(unidade.empresa_id, unidade.id, resultado)
      setMensagem({ tipo: importado.ok ? 'ok' : 'erro', texto: importado.mensagem })
      setImportando(false)
    }

    recarregar()
  }

  function aoSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setArrastando(false)
    processarArquivos(e.dataTransfer.files)
  }

  async function selecionarNota(nota: NotaFiscalRow) {
    setSelecionada(nota)
    setCategoriaId('')
    setItens([])
    carregarAnexos(nota.id)

    if (nota.status !== 'Pendente conferência') return

    const dados = await listarItensNota(nota.id)

    const produtosNorm = produtos.map((p) => ({ ...p, norm: normalizar(p.nome) }))
    const comSugestao = await Promise.all(
      dados.map(async (item) => {
        if (item.produto_id) return item
        const descNorm = normalizar(item.descricao)
        const sugestao = produtosNorm.find((p) => descNorm.includes(p.norm) || p.norm.includes(descNorm))
        if (sugestao) {
          await vincularProdutoItem(item.id, sugestao.id)
          return { ...item, produto_id: sugestao.id }
        }
        return item
      }),
    )
    setItens(comSugestao)
  }

  function carregarAnexos(notaId: string) {
    listarAnexos(ENTIDADE_NOTA, notaId).then(setAnexos)
  }

  async function enviarAnexoNota(arquivo: File | undefined) {
    if (!unidade || !selecionada || !session || !arquivo) return
    setEnviandoAnexo(true)
    setMensagem(null)
    try {
      await enviarAnexo(unidade.empresa_id, ENTIDADE_NOTA, selecionada.id, arquivo, session.user.id)
      carregarAnexos(selecionada.id)
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro ao enviar anexo.' })
    } finally {
      setEnviandoAnexo(false)
      if (anexoInputRef.current) anexoInputRef.current.value = ''
    }
  }

  async function abrirAnexo(anexo: Anexo) {
    const url = await urlAnexo(anexo.storage_path)
    window.open(url, '_blank', 'noopener')
  }

  async function removerAnexo(anexo: Anexo) {
    await excluirAnexo(anexo)
    if (selecionada) carregarAnexos(selecionada.id)
  }

  async function mudarProdutoItem(itemId: string, produtoId: string) {
    await vincularProdutoItem(itemId, produtoId || null)
    setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, produto_id: produtoId || null } : i)))
  }

  async function confirmar() {
    if (!selecionada || !session) return
    setConfirmando(true)
    setMensagem(null)
    try {
      await confirmarConferencia(selecionada, itens, categoriaId || null, session.user.id)
      setMensagem({ tipo: 'ok', texto: 'Nota conferida: movimento de estoque e lançamento de custo criados.' })
      setSelecionada(null)
      recarregar()
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro ao confirmar.' })
    } finally {
      setConfirmando(false)
    }
  }

  async function rejeitar() {
    if (!selecionada) return
    await rejeitarNota(selecionada.id)
    setSelecionada(null)
    recarregar()
  }

  const inputCls =
    'rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Nota fiscal</h1>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 cursor-pointer rounded border-2 border-dashed p-8 text-center text-sm ${
          arrastando ? 'border-slate-500 bg-slate-50' : 'border-slate-300 text-slate-500'
        }`}
      >
        Arraste o XML da NFe aqui, ou clique para escolher o arquivo.
        <br />
        <span className="text-xs text-slate-400">PDF e foto podem ser anexados depois, na nota já importada.</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={(e) => processarArquivos(e.target.files)}
        />
      </div>

      {importando && <p className="mb-3 text-sm text-slate-500">Processando...</p>}
      {mensagem && (
        <p className={`mb-4 text-sm ${mensagem.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{mensagem.texto}</p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Nº</th>
                <th className="px-3 py-2 font-medium">Emitente</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Status</th>
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
              {!carregando && notas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                    Nenhuma nota importada.
                  </td>
                </tr>
              )}
              {notas.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => selecionarNota(n)}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                    selecionada?.id === n.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="px-3 py-2">{n.numero ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{n.emitente_nome ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{formatarMoeda(n.valor_total)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASSE[n.status]}`}>{n.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          {!selecionada ? (
            <p className="text-sm text-slate-400">Clique numa nota pra ver detalhes e anexos.</p>
          ) : (
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="mb-1 text-sm font-medium text-slate-700">
                NF {selecionada.numero} — {selecionada.emitente_nome}
              </p>
              <p className="mb-3 text-xs text-slate-400">
                {formatarData(selecionada.data_emissao)} · {formatarMoeda(selecionada.valor_total)}
              </p>

              {selecionada.status === 'Pendente conferência' && (
                <>
                  <table className="mb-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-1 font-medium">Descrição (NF)</th>
                        <th className="py-1 font-medium">Qtd.</th>
                        <th className="py-1 font-medium">Produto do catálogo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-1">{item.descricao}</td>
                          <td className="py-1 text-slate-600">{item.qtd}</td>
                          <td className="py-1">
                            <select
                              value={item.produto_id ?? ''}
                              onChange={(e) => mudarProdutoItem(item.id, e.target.value)}
                              className={`${inputCls} ${!item.produto_id ? 'border-red-300' : ''}`}
                            >
                              <option value="">Selecione</option>
                              {produtos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-slate-500">Categoria do lançamento de custo</label>
                    <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={confirmar}
                      disabled={confirmando}
                      className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                      {confirmando ? 'Confirmando...' : 'Confirmar conferência'}
                    </button>
                    <button
                      onClick={rejeitar}
                      className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Rejeitar
                    </button>
                  </div>
                </>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Anexos (romaneio, comprovante...)
                </p>
                {anexos.length === 0 && <p className="mb-2 text-xs text-slate-400">Nenhum anexo.</p>}
                <ul className="mb-2 space-y-1">
                  {anexos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <button onClick={() => abrirAnexo(a)} className="truncate text-left text-slate-700 hover:underline">
                        {a.nome_arquivo}
                      </button>
                      <button onClick={() => removerAnexo(a)} className="ml-2 shrink-0 text-xs text-red-600 hover:underline">
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => anexoInputRef.current?.click()}
                  disabled={enviandoAnexo}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {enviandoAnexo ? 'Enviando...' : '+ Anexar arquivo (PDF, JPG, PNG)'}
                </button>
                <input
                  ref={anexoInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => enviarAnexoNota(e.target.files?.[0])}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
