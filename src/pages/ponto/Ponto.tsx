import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { lerFolhaPonto } from '../../lib/folhaPonto'
import {
  atualizarSaldoConferido,
  casarComColaboradores,
  formatarIntervalo,
  importarSaldosSistema,
  listarPontoCompetencia,
  parseSaldo,
  processarTexto,
  type LinhaImportada,
  type PontoCompetencia,
} from '../../lib/ponto'

function competenciaAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export function Ponto() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<LinhaImportada[] | null>(null)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [registros, setRegistros] = useState<PontoCompetencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [soDivergencias, setSoDivergencias] = useState(false)
  const [busca, setBusca] = useState('')
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})

  const arquivoRef = useRef<HTMLInputElement>(null)
  const arquivoFolhaRef = useRef<HTMLInputElement>(null)
  const [lendoFolha, setLendoFolha] = useState(false)

  useEffect(() => {
    if (!unidade) return
    listarNomesColaboradores(unidade.id).then(setColaboradores)
  }, [unidade])

  useEffect(() => {
    recarregar()
  }, [unidade, competencia])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarPontoCompetencia(unidade.id, competencia)
      .then((dados) => {
        setRegistros(dados)
        setEdicoes(Object.fromEntries(dados.map((d) => [d.id, formatarIntervalo(d.saldo_conferido)])))
      })
      .finally(() => setCarregando(false))
  }

  function analisar() {
    setPreview(processarTexto(texto, colaboradores))
  }

  function lerArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => setTexto(String(leitor.result ?? ''))
    leitor.readAsText(arquivo, 'utf-8')
  }

  async function lerFolha(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro(null)
    setLendoFolha(true)
    try {
      const linhas = await lerFolhaPonto(arquivo, colaboradores)
      if (linhas.length === 0) {
        setErro('Não encontrei nenhum "Saldo do Banco de Horas" nesse arquivo.')
        return
      }
      setPreview(casarComColaboradores(linhas, colaboradores))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao ler a folha de ponto.')
    } finally {
      setLendoFolha(false)
      if (arquivoFolhaRef.current) arquivoFolhaRef.current.value = ''
    }
  }

  async function confirmarImportacao() {
    if (!unidade || !preview) return
    const validos = preview.filter((l) => l.colaboradorId && l.saldoIntervalo)
    if (!validos.length) {
      setErro('Nenhuma linha válida para importar.')
      return
    }

    setImportando(true)
    setErro(null)
    try {
      await importarSaldosSistema(
        unidade.empresa_id,
        unidade.id,
        competencia,
        validos.map((l) => ({ colaboradorId: l.colaboradorId!, saldoIntervalo: l.saldoIntervalo! })),
      )
      setTexto('')
      setPreview(null)
      if (arquivoRef.current) arquivoRef.current.value = ''
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar.')
    } finally {
      setImportando(false)
    }
  }

  async function salvarConferido(id: string) {
    const intervalo = parseSaldo(edicoes[id] ?? '')
    await atualizarSaldoConferido(id, intervalo)
    recarregar()
  }

  const nomes = new Map(colaboradores.map((c) => [c.id, c.nome]))

  function temDivergencia(r: PontoCompetencia): boolean {
    return Boolean(r.divergencia) && r.divergencia !== '00:00:00'
  }

  const buscaNorm = busca.trim().toLowerCase()
  const linhasTabela = registros
    .filter((r) => !soDivergencias || temDivergencia(r))
    .filter((r) => !buscaNorm || (nomes.get(r.colaborador_id) ?? '').toLowerCase().includes(buscaNorm))

  const inputCls =
    'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Ponto</h1>
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className={`${inputCls} w-40`}
        />
      </div>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-medium text-slate-700">Importar relatório do FACEPONTO</p>
        <p className="mb-3 text-xs text-slate-400">
          Uma linha por colaborador: nome e saldo separados por vírgula, ponto e vírgula ou tab (ex:
          "Maria da Silva;-2:30"). Lembre que quem faz 12h está cadastrado lá como 8h — o saldo do
          sistema pode não fechar; confira manualmente.
        </p>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          placeholder="Cole aqui o relatório..."
          className={inputCls}
        />

        <div className="mt-2 flex items-center gap-3">
          <input ref={arquivoRef} type="file" accept=".csv,.txt" onChange={lerArquivo} className="text-xs" />
          <button
            onClick={analisar}
            disabled={!texto.trim()}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Analisar
          </button>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-sm font-medium text-slate-700">Ou importar folha de ponto (Excel)</p>
          <p className="mb-2 text-xs text-slate-400">
            Arquivo .xls/.xlsx exportado pelo FACEPONTO (um bloco por colaborador). Pega o "Saldo do
            Banco de Horas" de cada um automaticamente.
          </p>
          <input
            ref={arquivoFolhaRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={lerFolha}
            disabled={lendoFolha}
            className="text-xs"
          />
          {lendoFolha && <span className="ml-2 text-xs text-slate-400">Lendo arquivo...</span>}
        </div>

        {preview && (
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-1 font-medium">Nome no relatório</th>
                  <th className="py-1 font-medium">Saldo</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-1">{l.nomeOriginal}</td>
                    <td className="py-1">{l.saldoTexto}</td>
                    <td className="py-1">
                      {!l.colaboradorId ? (
                        <span className="text-red-600">Colaborador não encontrado</span>
                      ) : !l.saldoIntervalo ? (
                        <span className="text-red-600">Saldo inválido</span>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

            <button
              onClick={confirmarImportacao}
              disabled={importando}
              className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {importando ? 'Importando...' : `Confirmar importação (${competencia})`}
            </button>
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Competência {competencia}</p>
        <div className="flex items-center gap-4">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colaborador..."
            className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={soDivergencias}
              onChange={(e) => setSoDivergencias(e.target.checked)}
            />
            Mostrar só divergências
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Saldo sistema</th>
              <th className="px-3 py-2 font-medium">Saldo conferido</th>
              <th className="px-3 py-2 font-medium">Divergência</th>
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
            {!carregando && linhasTabela.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                  {soDivergencias ? 'Nenhuma divergência.' : 'Nenhum lançamento nessa competência.'}
                </td>
              </tr>
            )}
            {linhasTabela.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{nomes.get(r.colaborador_id) ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{formatarIntervalo(r.saldo_sistema)}</td>
                <td className="px-3 py-2">
                  <input
                    value={edicoes[r.id] ?? ''}
                    onChange={(e) => setEdicoes({ ...edicoes, [r.id]: e.target.value })}
                    onBlur={() => salvarConferido(r.id)}
                    placeholder="HH:MM"
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className={`px-3 py-2 ${temDivergencia(r) ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                  {formatarIntervalo(r.divergencia) || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
