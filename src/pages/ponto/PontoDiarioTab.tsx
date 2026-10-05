import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { formatarIntervalo } from '../../lib/ponto'
import {
  calcularHorasEsperadas,
  extrairRelatorioFaceponto,
  importarPontoDiario,
  listarPontoRegistroDiario,
  type LinhaPontoDiario,
  type PontoRegistroDiario,
} from '../../lib/pontoDiario'
import { formatarData } from '../../utils/data'

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

function formatarHoras(valor: number | null): string {
  if (valor == null) return '—'
  const sinal = valor < 0 ? '-' : ''
  const abs = Math.abs(valor)
  const horas = Math.floor(abs)
  const minutos = Math.round((abs - horas) * 60)
  return `${sinal}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

export function PontoDiarioTab() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [linhas, setLinhas] = useState<LinhaPontoDiario[] | null>(null)
  const [arquivoNome, setArquivoNome] = useState('')
  const [processando, setProcessando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const [inicio, setInicio] = useState(diasAtras(14))
  const [fim, setFim] = useState(hojeIso())
  const [registrosSalvos, setRegistrosSalvos] = useState<PontoRegistroDiario[]>([])
  const [carregandoSalvos, setCarregandoSalvos] = useState(true)

  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!unidade) return
    listarNomesColaboradores(unidade.id).then(setColaboradores)
  }, [unidade])

  useEffect(() => {
    recarregarSalvos()
  }, [unidade, inicio, fim])

  function recarregarSalvos() {
    if (!unidade) return
    setCarregandoSalvos(true)
    listarPontoRegistroDiario(unidade.id, inicio, fim)
      .then(setRegistrosSalvos)
      .finally(() => setCarregandoSalvos(false))
  }

  async function processarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo || !unidade) return
    setErro(null)
    setMensagem(null)
    setProcessando(true)
    try {
      const resultado = await extrairRelatorioFaceponto(arquivo, colaboradores, unidade.id)
      setLinhas(resultado)
      setArquivoNome(arquivo.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao ler o PDF.')
      setLinhas(null)
    } finally {
      setProcessando(false)
      if (arquivoRef.current) arquivoRef.current.value = ''
    }
  }

  async function atribuirColaborador(indice: number, colaboradorId: string) {
    if (!unidade || !linhas) return
    const linha = linhas[indice]
    if (!colaboradorId) {
      setLinhas(linhas.map((l, i) => (i === indice ? { ...l, colaboradorId: null } : l)))
      return
    }

    const info = await calcularHorasEsperadas(unidade.id, [{ colaboradorId, data: linha.data }])
    const esperado = info.get(`${colaboradorId}|${linha.data}`)
    const horasEsperadas = esperado?.horas ?? null
    const saldoCalculado =
      horasEsperadas != null ? Math.round((linha.horasTrabalhadas - horasEsperadas) * 100) / 100 : null

    setLinhas(
      linhas.map((l, i) =>
        i === indice
          ? { ...l, colaboradorId, horasEsperadas, saldoCalculado, escalado: esperado?.escalado ?? null }
          : l,
      ),
    )
  }

  async function confirmarImportacao() {
    if (!unidade || !linhas) return
    const resolvidas = linhas.filter((l) => l.colaboradorId)
    if (resolvidas.length === 0) {
      setErro('Nenhuma linha com colaborador identificado pra importar.')
      return
    }

    setImportando(true)
    setErro(null)
    try {
      const total = await importarPontoDiario(unidade.empresa_id, unidade.id, linhas, arquivoNome)
      setMensagem(`${total} registro(s) de ponto diário importado(s).`)
      setLinhas(null)
      recarregarSalvos()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar.')
    } finally {
      setImportando(false)
    }
  }

  const nomesColaboradores = new Map(colaboradores.map((c) => [c.id, c.nome]))
  const naoIdentificadas = linhas?.filter((l) => !l.colaboradorId).length ?? 0
  const identificadas = (linhas?.length ?? 0) - naoIdentificadas

  const inputCls =
    'rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

  return (
    <div>
      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <p className="mb-1 text-sm font-medium text-slate-300">Importar "Relatório de Pontos Geral" (PDF)</p>
        <p className="mb-3 text-xs text-slate-500">
          O PDF que você baixa toda sexta no FACEPONTO. Lê as batidas de cada colaborador e calcula as
          horas esperadas pela jornada cadastrada aqui (não pelo que a FACEPONTO relata — ela cadastra
          quem faz 12h como se fosse 8h). Linhas sem nome identificado no PDF ficam marcadas pra você
          escolher o colaborador manualmente, ou ignorar.
        </p>

        <input ref={arquivoRef} type="file" accept=".pdf" onChange={processarArquivo} disabled={processando} className="text-xs" />
        {processando && <span className="ml-2 text-xs text-slate-500">Lendo PDF...</span>}

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
        {mensagem && <p className="mt-3 text-sm text-emerald-400">{mensagem}</p>}

        {linhas && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">
              {linhas.length} linha(s) encontrada(s) — {identificadas} identificada(s) automaticamente,{' '}
              {naoIdentificadas} precisam de revisão.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-500">
                    <th className="py-1 pr-2 font-medium">Data</th>
                    <th className="py-1 pr-2 font-medium">Colaborador</th>
                    <th className="py-1 pr-2 font-medium">Função</th>
                    <th className="py-1 pr-2 font-medium">Trabalhadas</th>
                    <th className="py-1 pr-2 font-medium">Esperadas</th>
                    <th className="py-1 pr-2 font-medium">Saldo</th>
                    <th className="py-1 pr-2 font-medium">Relatado (FACEPONTO)</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-1 pr-2 text-slate-400">{formatarData(l.data)}</td>
                      <td className="py-1 pr-2">
                        {l.colaboradorId ? (
                          nomesColaboradores.get(l.colaboradorId) ?? l.nomeRelatado
                        ) : (
                          <select
                            value=""
                            onChange={(e) => atribuirColaborador(i, e.target.value)}
                            className={`${inputCls} border-amber-500/40`}
                          >
                            <option value="">
                              {l.nomeRelatado ? `"${l.nomeRelatado}" — não identificado` : 'Não identificado'}
                            </option>
                            {colaboradores.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-1 pr-2 text-slate-500">{l.funcaoRelatada ?? '—'}</td>
                      <td className="py-1 pr-2">{formatarHoras(l.horasTrabalhadas)}</td>
                      <td className="py-1 pr-2 text-slate-400">
                        {l.escalado === false && l.horasEsperadas === 0 ? (
                          <span className="text-amber-300">não escalado</span>
                        ) : (
                          formatarHoras(l.horasEsperadas)
                        )}
                      </td>
                      <td
                        className={`py-1 pr-2 font-medium ${
                          l.saldoCalculado == null
                            ? 'text-slate-500'
                            : l.saldoCalculado < 0
                              ? 'text-red-400'
                              : 'text-emerald-400'
                        }`}
                      >
                        {formatarHoras(l.saldoCalculado)}
                      </td>
                      <td className="py-1 pr-2 text-xs text-slate-500">
                        total {formatarIntervalo(l.regTotalRelatado)} · saldo {formatarIntervalo(l.saldoRelatado)} ·
                        esperado {formatarIntervalo(l.esperadoRelatado)}
                        {l.semBatidaSaida && <span className="ml-1 text-red-400">· saída não reg.</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={confirmarImportacao}
              disabled={importando}
              className="mt-4 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
            >
              {importando ? 'Importando...' : `Confirmar importação (${identificadas} registro(s))`}
            </button>
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-300">Batidas já importadas</p>
        <div className="flex items-center gap-2">
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputCls} />
          <span className="text-xs text-slate-500">até</span>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Trabalhadas</th>
              <th className="px-3 py-2 font-medium">Esperadas</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {carregandoSalvos && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregandoSalvos && registrosSalvos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Nenhum registro importado nesse período.
                </td>
              </tr>
            )}
            {registrosSalvos.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-slate-400">{formatarData(r.data)}</td>
                <td className="px-3 py-2">{nomesColaboradores.get(r.colaborador_id) ?? r.nome_relatado}</td>
                <td className="px-3 py-2">{formatarHoras(r.horas_trabalhadas)}</td>
                <td className="px-3 py-2 text-slate-400">{formatarHoras(r.horas_esperadas)}</td>
                <td
                  className={`px-3 py-2 font-medium ${
                    r.saldo_calculado == null ? 'text-slate-500' : r.saldo_calculado < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {formatarHoras(r.saldo_calculado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
