import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { mensagemErro } from '../../utils/erro'
import { formatarData } from '../../utils/data'
import { excluirAnexo, enviarAnexo, listarAnexos, urlAnexo, type Anexo } from '../../lib/anexos'
import {
  atualizarColaborador,
  buscarCatalogos,
  buscarColaborador,
  buscarDadoSensivel,
  criarColaborador,
  criarHorario,
  criarJornada,
  desligarColaborador,
  enviarFoto,
  excluirColaborador,
  salvarDadoSensivel,
  urlFoto,
  type Catalogos,
  type ColaboradorUpdate,
  type DadoSensivelInsert,
} from '../../lib/colaboradores'

const ENTIDADE_COLABORADOR = 'colaborador'

type Aba = 'gerais' | 'cargo' | 'beneficios' | 'endereco' | 'veiculo' | 'bancario'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'gerais', rotulo: 'Dados gerais' },
  { chave: 'cargo', rotulo: 'Cargo e escala' },
  { chave: 'beneficios', rotulo: 'Benefícios' },
  { chave: 'endereco', rotulo: 'Endereço' },
  { chave: 'veiculo', rotulo: 'Veículo' },
  { chave: 'bancario', rotulo: 'Dado bancário' },
]

const MEIOS_TRANSPORTE: NonNullable<ColaboradorUpdate['meio_transporte']>[] = [
  'Moto',
  'Carro',
  'Aplicativo',
  'Transporte público',
]

export function ColaboradorFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { vinculos, session } = useAuth()
  const vinculo = vinculos[0]
  const unidade = vinculo?.unidade
  const ehGestor = vinculo?.papel === 'gestor' || vinculo?.papel === 'admin'

  const modoNovo = !id

  const [catalogos, setCatalogos] = useState<Catalogos>({
    funcoes: [],
    escalas: [],
    locais: [],
    beneficios: [],
    jornadas: [],
    horarios: [],
  })
  const [form, setForm] = useState<ColaboradorUpdate>({ vinculo: 'CLT' })
  const [aba, setAba] = useState<Aba>('gerais')
  const [carregando, setCarregando] = useState(!modoNovo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [dadoBancario, setDadoBancario] = useState<DadoSensivelInsert | null>(null)
  const [bancarioCarregado, setBancarioCarregado] = useState(false)

  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [enviandoAnexo, setEnviandoAnexo] = useState(false)
  const [erroAnexo, setErroAnexo] = useState<string | null>(null)
  const anexoInputRef = useRef<HTMLInputElement>(null)

  const [mostrarDesligar, setMostrarDesligar] = useState(false)
  const [desligamento, setDesligamento] = useState('')
  const [motivoSaida, setMotivoSaida] = useState('')

  const [mostrarNovaJornada, setMostrarNovaJornada] = useState(false)
  const [novaJornada, setNovaJornada] = useState({ nome: '', cargaMensal: '', cargaSemanal: '' })
  const [salvandoJornada, setSalvandoJornada] = useState(false)
  const [erroJornada, setErroJornada] = useState<string | null>(null)

  const [mostrarNovoHorario, setMostrarNovoHorario] = useState(false)
  const [novoHorario, setNovoHorario] = useState({ inicio: '', fim: '' })
  const [salvandoHorario, setSalvandoHorario] = useState(false)
  const [erroHorario, setErroHorario] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    buscarCatalogos(unidade.empresa_id, unidade.id).then(setCatalogos)
  }, [unidade])

  useEffect(() => {
    if (modoNovo || !id) return
    buscarColaborador(id).then((dados) => {
      if (dados) setForm(dados)
      setCarregando(false)
    })
  }, [id, modoNovo])

  useEffect(() => {
    if (!form.foto_path) {
      setFotoUrl(null)
      return
    }
    urlFoto(form.foto_path).then(setFotoUrl)
  }, [form.foto_path])

  useEffect(() => {
    if (modoNovo || !id) return
    listarAnexos(ENTIDADE_COLABORADOR, id).then(setAnexos)
  }, [id, modoNovo])

  async function enviarFotoColaborador(arquivo: File | undefined) {
    if (!arquivo || !id || !unidade) return
    setEnviandoFoto(true)
    setErroFoto(null)
    try {
      const caminho = await enviarFoto(id, unidade.empresa_id, arquivo)
      setForm((atual) => ({ ...atual, foto_path: caminho }))
    } catch (e) {
      setErroFoto(mensagemErro(e, 'Erro ao enviar foto.'))
    } finally {
      setEnviandoFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  function carregarAnexos() {
    if (id) listarAnexos(ENTIDADE_COLABORADOR, id).then(setAnexos)
  }

  async function enviarAnexoColaborador(arquivo: File | undefined) {
    if (!arquivo || !id || !unidade || !session) return
    setEnviandoAnexo(true)
    setErroAnexo(null)
    try {
      await enviarAnexo(unidade.empresa_id, ENTIDADE_COLABORADOR, id, arquivo, session.user.id)
      carregarAnexos()
    } catch (e) {
      setErroAnexo(mensagemErro(e, 'Erro ao enviar anexo.'))
    } finally {
      setEnviandoAnexo(false)
      if (anexoInputRef.current) anexoInputRef.current.value = ''
    }
  }

  async function abrirAnexo(anexo: Anexo) {
    const url = await urlAnexo(anexo.storage_path)
    window.open(url, '_blank')
  }

  async function removerAnexo(anexo: Anexo) {
    await excluirAnexo(anexo)
    carregarAnexos()
  }

  function campo<K extends keyof ColaboradorUpdate>(chave: K) {
    return {
      value: (form[chave] ?? '') as string | number,
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const valor = e.target.type === 'number' ? Number(e.target.value) : e.target.value
        setForm((atual) => ({ ...atual, [chave]: valor === '' ? null : valor }) as unknown as ColaboradorUpdate)
      },
    }
  }

  function checkbox(chave: 'atende_multiplos') {
    return {
      checked: Boolean(form[chave]),
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setForm((atual) => ({ ...atual, [chave]: e.target.checked })),
    }
  }

  async function carregarDadoBancario() {
    if (!id || bancarioCarregado) return
    const dados = await buscarDadoSensivel(id)
    setDadoBancario(dados ?? { colaborador_id: id, empresa_id: unidade?.empresa_id ?? '' })
    setBancarioCarregado(true)
  }

  function abrirAba(nova: Aba) {
    setAba(nova)
    if (nova === 'bancario') carregarDadoBancario()
  }

  function campoBancario<K extends keyof DadoSensivelInsert>(chave: K) {
    return {
      value: (dadoBancario?.[chave] ?? '') as string,
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setDadoBancario(
          (atual) =>
            ({ ...(atual as DadoSensivelInsert), [chave]: e.target.value }) as unknown as DadoSensivelInsert,
        ),
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
      if (modoNovo) {
        const novo = await criarColaborador({
          ...form,
          nome: form.nome!,
          empresa_id: unidade.empresa_id,
          unidade_id: unidade.id,
        })
        navigate(`/colaboradores/${novo.id}`, { replace: true })
      } else if (id) {
        await atualizarColaborador(id, form)
      }

      if (dadoBancario && ehGestor) {
        await salvarDadoSensivel(dadoBancario)
      }
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar.'))
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarDesligamento() {
    if (!id || !desligamento || !motivoSaida) return
    await desligarColaborador(id, { desligamento, motivo_saida: motivoSaida, aviso_previo: null })
    navigate('/colaboradores')
  }

  async function excluir() {
    if (!id) return
    if (!confirm('Excluir este registro? Use isso só para cadastro feito por engano, não para desligamento real.')) return
    await excluirColaborador(id)
    navigate('/colaboradores')
  }

  async function salvarNovaJornada() {
    if (!unidade || !novaJornada.nome) return
    setSalvandoJornada(true)
    setErroJornada(null)
    try {
      await criarJornada({
        empresa_id: unidade.empresa_id,
        nome: novaJornada.nome,
        carga_mensal: novaJornada.cargaMensal ? Number(novaJornada.cargaMensal) : null,
        carga_semanal: novaJornada.cargaSemanal ? Number(novaJornada.cargaSemanal) : null,
      })
      const catalogosAtualizados = await buscarCatalogos(unidade.empresa_id, unidade.id)
      setCatalogos(catalogosAtualizados)
      setNovaJornada({ nome: '', cargaMensal: '', cargaSemanal: '' })
      setMostrarNovaJornada(false)
    } catch (e) {
      setErroJornada(mensagemErro(e, 'Erro ao cadastrar jornada.'))
    } finally {
      setSalvandoJornada(false)
    }
  }

  async function salvarNovoHorario() {
    if (!unidade || !novoHorario.inicio || !novoHorario.fim) return
    setSalvandoHorario(true)
    setErroHorario(null)
    try {
      const criado = await criarHorario(unidade.empresa_id, novoHorario.inicio, novoHorario.fim)
      setCatalogos((atual) => ({ ...atual, horarios: [...atual.horarios, criado] }))
      setForm((atual) => ({ ...atual, horario_id: criado.id }))
      setNovoHorario({ inicio: '', fim: '' })
      setMostrarNovoHorario(false)
    } catch (e) {
      setErroHorario(mensagemErro(e, 'Erro ao cadastrar horário.'))
    } finally {
      setSalvandoHorario(false)
    }
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  const nomeFuncao = catalogos.funcoes.find((f) => f.id === form.funcao_id)?.nome
  const nomeLocal = form.atende_multiplos
    ? 'Múltiplos locais'
    : catalogos.locais.find((l) => l.id === form.local_id)?.nome

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              disabled={modoNovo || enviandoFoto}
              className="group h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100 disabled:cursor-not-allowed"
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt={form.nome || ''} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-medium text-slate-400">
                  {(form.nome || '?').charAt(0).toUpperCase()}
                </span>
              )}
              {!modoNovo && (
                <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-[10px] text-white group-hover:flex">
                  {enviandoFoto ? '...' : 'Alterar'}
                </span>
              )}
            </button>
            <input
              ref={fotoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => enviarFotoColaborador(e.target.files?.[0])}
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {modoNovo ? 'Novo colaborador' : form.nome}
            </h1>
            {!modoNovo && (nomeFuncao || nomeLocal) && (
              <p className="text-sm text-slate-500">{[nomeFuncao, nomeLocal].filter(Boolean).join(' · ')}</p>
            )}
            {!modoNovo && (form.admissao || form.telefone) && (
              <p className="text-xs text-slate-400">
                {form.admissao && `Admitido em ${formatarData(form.admissao)}`}
                {form.admissao && form.telefone && ' · '}
                {form.telefone}
              </p>
            )}
            {erroFoto && <p className="mt-1 text-xs text-red-600">{erroFoto}</p>}
          </div>
        </div>
        {!modoNovo && (
          <div className="flex shrink-0 gap-2">
            <Link
              to={`/colaboradores/${id}/escala-individual`}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Escala do mês
            </Link>
            {form.ativo && (
              <>
                <button
                  onClick={() => setMostrarDesligar((v) => !v)}
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  Desligar
                </button>
                <button
                  onClick={excluir}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Excluir
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!modoNovo && (
        <div className="mb-4 rounded border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Documentos (ASO, contrato...)</p>
          {anexos.length === 0 && <p className="mb-2 text-xs text-slate-400">Nenhum documento.</p>}
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
            {enviandoAnexo ? 'Enviando...' : '+ Anexar documento (PDF, JPG, PNG)'}
          </button>
          <input
            ref={anexoInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => enviarAnexoColaborador(e.target.files?.[0])}
          />
          {erroAnexo && <p className="mt-1 text-xs text-red-600">{erroAnexo}</p>}
        </div>
      )}

      {mostrarDesligar && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-medium text-red-800">Confirmar desligamento</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Data</label>
              <input
                type="date"
                value={desligamento}
                onChange={(e) => setDesligamento(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Motivo</label>
              <input
                value={motivoSaida}
                onChange={(e) => setMotivoSaida(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={confirmarDesligamento}
              className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {ABAS.filter((a) => a.chave !== 'bancario' || ehGestor).map((a) => (
          <button
            key={a.chave}
            onClick={() => abrirAba(a.chave)}
            className={`px-3 py-2 text-sm ${
              aba === a.chave
                ? 'border-b-2 border-brand-700 font-medium text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        {aba === 'gerais' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nome" className="col-span-2" input={<input {...campo('nome')} className={inputCls} />} />
            <Campo label="Matrícula" input={<input {...campo('matricula')} className={inputCls} />} />
            <Campo
              label="Vínculo"
              input={
                <select {...campo('vinculo')} className={inputCls}>
                  <option value="CLT">CLT</option>
                  <option value="Prestador">Prestador</option>
                </select>
              }
            />
            <Campo label="Nascimento" input={<input type="date" {...campo('nascimento')} className={inputCls} />} />
            <Campo label="Telefone" input={<input {...campo('telefone')} className={inputCls} />} />
            <Campo
              label="Parental"
              input={
                <select {...campo('parental')} className={inputCls}>
                  <option value="">—</option>
                  <option value="Mãe">Mãe</option>
                  <option value="Pai">Pai</option>
                  <option value="Não informado">Não informado</option>
                </select>
              }
            />
            <Campo label="Filhos" input={<input type="number" {...campo('filhos')} className={inputCls} />} />
          </div>
        )}

        {aba === 'cargo' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo
              label="Função"
              input={
                <select {...campo('funcao_id')} className={inputCls}>
                  <option value="">—</option>
                  {catalogos.funcoes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              }
            />
            <Campo label="Área" input={<input {...campo('area')} className={inputCls} />} />
            <Campo
              label="Local"
              input={
                <select {...campo('local_id')} className={inputCls} disabled={Boolean(form.atende_multiplos)}>
                  <option value="">—</option>
                  {catalogos.locais.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              }
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
              <input type="checkbox" {...checkbox('atende_multiplos')} />
              Atende múltiplos locais
            </label>
            <Campo
              label="Escala"
              input={
                <select {...campo('escala_id')} className={inputCls}>
                  <option value="">—</option>
                  {catalogos.escalas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              }
            />
            <Campo
              label="Jornada de trabalho"
              input={
                <div>
                  <div className="flex gap-2">
                    <select {...campo('jornada_id')} className={inputCls}>
                      <option value="">—</option>
                      {catalogos.jornadas.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setMostrarNovaJornada((v) => !v)}
                      className="shrink-0 rounded border border-slate-300 px-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      + Nova
                    </button>
                  </div>
                  {mostrarNovaJornada && (
                    <div className="mt-2 flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Nome</label>
                        <input
                          value={novaJornada.nome}
                          onChange={(e) => setNovaJornada((v) => ({ ...v, nome: e.target.value }))}
                          placeholder="ex: 12x36"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Carga mensal (h)</label>
                        <input
                          type="number"
                          value={novaJornada.cargaMensal}
                          onChange={(e) => setNovaJornada((v) => ({ ...v, cargaMensal: e.target.value }))}
                          className={`${inputCls} w-24`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Carga semanal (h)</label>
                        <input
                          type="number"
                          value={novaJornada.cargaSemanal}
                          onChange={(e) => setNovaJornada((v) => ({ ...v, cargaSemanal: e.target.value }))}
                          className={`${inputCls} w-24`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={salvarNovaJornada}
                        disabled={salvandoJornada || !novaJornada.nome}
                        className="rounded bg-brand-700 px-3 py-1.5 text-sm text-white hover:bg-brand-800 disabled:opacity-60"
                      >
                        {salvandoJornada ? 'Salvando...' : 'Cadastrar'}
                      </button>
                    </div>
                  )}
                  {erroJornada && <p className="mt-1 text-xs text-red-600">{erroJornada}</p>}
                </div>
              }
            />
            <Campo
              label="Horário"
              input={
                <div>
                  <div className="flex gap-2">
                    <select {...campo('horario_id')} className={inputCls}>
                      <option value="">—</option>
                      {catalogos.horarios.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setMostrarNovoHorario((v) => !v)}
                      className="shrink-0 rounded border border-slate-300 px-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      + Novo
                    </button>
                  </div>
                  {mostrarNovoHorario && (
                    <div className="mt-2 flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Entrada</label>
                        <input
                          type="time"
                          value={novoHorario.inicio}
                          onChange={(e) => setNovoHorario((v) => ({ ...v, inicio: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Saída</label>
                        <input
                          type="time"
                          value={novoHorario.fim}
                          onChange={(e) => setNovoHorario((v) => ({ ...v, fim: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={salvarNovoHorario}
                        disabled={salvandoHorario || !novoHorario.inicio || !novoHorario.fim}
                        className="rounded bg-brand-700 px-3 py-1.5 text-sm text-white hover:bg-brand-800 disabled:opacity-60"
                      >
                        {salvandoHorario ? 'Salvando...' : 'Cadastrar'}
                      </button>
                    </div>
                  )}
                  {erroHorario && <p className="mt-1 text-xs text-red-600">{erroHorario}</p>}
                </div>
              }
            />
            <Campo
              label="Turno"
              input={
                <select {...campo('turno')} className={inputCls}>
                  <option value="">—</option>
                  <option value="Diurno">Diurno</option>
                  <option value="Noturno">Noturno</option>
                </select>
              }
            />
            <Campo
              label="Faixa"
              input={
                <select {...campo('faixa')} className={inputCls}>
                  <option value="">—</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="Único">Único</option>
                </select>
              }
            />
            <Campo label="Registro conselho" input={<input {...campo('registro_conselho')} className={inputCls} />} />
            <Campo label="Admissão" input={<input type="date" {...campo('admissao')} className={inputCls} />} />
            <Campo label="Último ASO" input={<input type="date" {...campo('aso_ultimo')} className={inputCls} />} />
            {form.vinculo === 'Prestador' && (
              <Campo label="Fim de contrato" input={<input type="date" {...campo('fim_contrato')} className={inputCls} />} />
            )}
          </div>
        )}

        {aba === 'beneficios' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo
              label="Benefício"
              input={
                <select {...campo('beneficio_id')} className={inputCls}>
                  <option value="">—</option>
                  {catalogos.beneficios.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              }
            />
            <Campo label="Termo assinado" input={<input {...campo('termo_assinado')} className={inputCls} />} />
            <Campo label="Salário base (R$)" input={<input type="number" step="0.01" {...campo('salario_base')} className={inputCls} />} />
            <Campo label="Dependentes" input={<input type="number" {...campo('dependentes')} className={inputCls} />} />
            <Campo
              label="Insalubridade"
              input={
                <select {...campo('insalubridade')} className={inputCls}>
                  <option value="">—</option>
                  <option value="10%">10%</option>
                  <option value="20%">20%</option>
                  <option value="40%">40%</option>
                </select>
              }
            />
          </div>
        )}

        {aba === 'endereco' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo label="CEP" input={<input {...campo('cep')} className={inputCls} />} />
            <Campo label="Cidade" input={<input {...campo('cidade')} className={inputCls} />} />
            <Campo label="Endereço" className="col-span-2" input={<input {...campo('endereco')} className={inputCls} />} />
            <Campo label="Bairro" input={<input {...campo('bairro')} className={inputCls} />} />
            <Campo label="UF" input={<input {...campo('uf')} maxLength={2} className={inputCls} />} />
          </div>
        )}

        {aba === 'veiculo' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo
              label="Meio de transporte"
              className="col-span-2"
              input={
                <select {...campo('meio_transporte')} className={inputCls}>
                  <option value="">—</option>
                  {MEIOS_TRANSPORTE.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              }
            />
          </div>
        )}

        {aba === 'bancario' && ehGestor && (
          <div className="grid grid-cols-2 gap-4">
            <Campo label="CPF" input={<input {...campoBancario('cpf')} className={inputCls} />} />
            <Campo label="Titular" input={<input {...campoBancario('titular')} className={inputCls} />} />
            <Campo
              label="Tipo de chave PIX"
              input={
                <select {...campoBancario('tipo_chave_pix')} className={inputCls}>
                  <option value="">—</option>
                  <option value="CPF">CPF</option>
                  <option value="Celular">Celular</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Aleatória">Aleatória</option>
                </select>
              }
            />
            <Campo label="Chave PIX" input={<input {...campoBancario('chave_pix')} className={inputCls} />} />
            <Campo label="Banco" input={<input {...campoBancario('banco')} className={inputCls} />} />
            <Campo label="Agência" input={<input {...campoBancario('agencia')} className={inputCls} />} />
            <Campo label="Conta" input={<input {...campoBancario('conta')} className={inputCls} />} />
          </div>
        )}
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-4">
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

function Campo({ label, input, className }: { label: string; input: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      {input}
    </div>
  )
}
