import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import {
  atualizarColaborador,
  buscarCatalogos,
  buscarColaborador,
  buscarDadoSensivel,
  criarColaborador,
  desligarColaborador,
  salvarDadoSensivel,
  type Catalogos,
  type ColaboradorUpdate,
  type DadoSensivelInsert,
} from '../../lib/colaboradores'

type Aba = 'gerais' | 'cargo' | 'beneficios' | 'endereco' | 'bancario'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'gerais', rotulo: 'Dados gerais' },
  { chave: 'cargo', rotulo: 'Cargo e escala' },
  { chave: 'beneficios', rotulo: 'Benefícios' },
  { chave: 'endereco', rotulo: 'Endereço' },
  { chave: 'bancario', rotulo: 'Dado bancário' },
]

export function ColaboradorFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { vinculos } = useAuth()
  const vinculo = vinculos[0]
  const unidade = vinculo?.unidade
  const ehGestor = vinculo?.papel === 'gestor' || vinculo?.papel === 'admin'

  const modoNovo = !id

  const [catalogos, setCatalogos] = useState<Catalogos>({
    funcoes: [],
    escalas: [],
    locais: [],
    beneficios: [],
  })
  const [form, setForm] = useState<ColaboradorUpdate>({ vinculo: 'CLT' })
  const [aba, setAba] = useState<Aba>('gerais')
  const [carregando, setCarregando] = useState(!modoNovo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [dadoBancario, setDadoBancario] = useState<DadoSensivelInsert | null>(null)
  const [bancarioCarregado, setBancarioCarregado] = useState(false)

  const [mostrarDesligar, setMostrarDesligar] = useState(false)
  const [desligamento, setDesligamento] = useState('')
  const [motivoSaida, setMotivoSaida] = useState('')

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
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarDesligamento() {
    if (!id || !desligamento || !motivoSaida) return
    await desligarColaborador(id, { desligamento, motivo_saida: motivoSaida, aviso_previo: null })
    navigate('/colaboradores')
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">
          {modoNovo ? 'Novo colaborador' : form.nome}
        </h1>
        {!modoNovo && form.ativo && (
          <button
            onClick={() => setMostrarDesligar((v) => !v)}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
          >
            Desligar
          </button>
        )}
      </div>

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
                ? 'border-b-2 border-slate-800 font-medium text-slate-800'
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
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

function Campo({ label, input, className }: { label: string; input: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      {input}
    </div>
  )
}
