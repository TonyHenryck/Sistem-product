import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { buscarCatalogos, listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import {
  atualizarDiaria,
  buscarBeneficiario,
  buscarMotivosAusencia,
  buscarValorPadrao,
  cancelarDiaria,
  criarDiaria,
  listarDiarias,
  type Diaria,
} from '../../lib/diarias'
import { formatarData } from '../../utils/data'
import { formatarMoeda } from '../../utils/moeda'

const vazio = {
  data: '',
  localId: '',
  turno: '' as 'Diurno' | 'Noturno' | '',
  faltanteExterno: false,
  faltanteId: '',
  faltanteNome: '',
  motivoId: '',
  atestado: '' as 'Sim' | 'Não' | 'Não se aplica' | '',
  cobriuExterno: false,
  cobriuId: '',
  cobriuNome: '',
  vinculoCobriu: '' as 'CLT' | 'Prestador' | '',
  funcaoExercida: '',
  telefoneBenef: '',
  cpfBenef: '',
  chavePixBenef: '',
  bancoBenef: '',
  agenciaBenef: '',
  contaBenef: '',
  valor: '',
  formaPagamento: '' as 'PIX' | 'Transferência' | 'Espécie' | '',
  reciboAssinado: false,
  autorizadoPor: '',
  obs: '',
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function Diarias() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [locais, setLocais] = useState<Catalogo[]>([])
  const [motivos, setMotivos] = useState<Catalogo[]>([])
  const [diarias, setDiarias] = useState<Diaria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    listarColaboradoresAtivos(unidade.id).then(setColaboradores)
    listarNomesColaboradores(unidade.id).then((lista) => setNomes(new Map(lista.map((c) => [c.id, c.nome]))))
    buscarCatalogos(unidade.empresa_id, unidade.id).then((c) => setLocais(c.locais))
    buscarMotivosAusencia(unidade.empresa_id).then(setMotivos)
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarDiarias(unidade.id)
      .then(setDiarias)
      .finally(() => setCarregando(false))
  }

  async function mudarTurno(turno: 'Diurno' | 'Noturno' | '') {
    setForm((f) => ({ ...f, turno }))
    if (!unidade || !turno) return
    const sugerido = await buscarValorPadrao(unidade.empresa_id, unidade.id, turno)
    if (sugerido !== null) setForm((f) => ({ ...f, valor: String(sugerido) }))
  }

  async function salvar() {
    if (!unidade || !form.data) {
      setErro('Data é obrigatória.')
      return
    }
    if (!form.faltanteExterno && !form.faltanteId) {
      setErro('Selecione quem faltou (ou marque "de fora").')
      return
    }
    if (form.faltanteExterno && !form.faltanteNome) {
      setErro('Informe o nome de quem faltou.')
      return
    }
    if (!form.cobriuExterno && !form.cobriuId) {
      setErro('Selecione quem cobriu (ou marque "de fora").')
      return
    }
    if (form.cobriuExterno && !form.cobriuNome) {
      setErro('Informe o nome de quem cobriu.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      const dados = {
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        local_id: form.localId || null,
        data: form.data,
        turno: form.turno || null,
        faltante_id: form.faltanteExterno ? null : form.faltanteId,
        faltante_nome: form.faltanteExterno ? form.faltanteNome : null,
        motivo_id: form.motivoId || null,
        atestado: form.atestado || null,
        cobriu_id: form.cobriuExterno ? null : form.cobriuId,
        cobriu_nome: form.cobriuExterno ? form.cobriuNome : null,
        vinculo_cobriu: form.vinculoCobriu || null,
        funcao_exercida: form.funcaoExercida || null,
        valor: form.valor ? Number(form.valor) : null,
        forma_pagamento: form.formaPagamento || null,
        recibo_assinado: form.reciboAssinado,
        autorizado_por: form.autorizadoPor || null,
        obs: form.obs || null,
      }
      const beneficiario = form.cobriuExterno
        ? {
            nome: form.cobriuNome,
            telefone: form.telefoneBenef || null,
            cpf: form.cpfBenef || null,
            chave_pix: form.chavePixBenef || null,
            banco: form.bancoBenef || null,
            agencia: form.agenciaBenef || null,
            conta: form.contaBenef || null,
          }
        : undefined

      if (editandoId) {
        await atualizarDiaria(editandoId, dados, beneficiario)
      } else {
        await criarDiaria(dados, beneficiario)
      }
      setForm(vazio)
      setEditandoId(null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function editar(d: Diaria) {
    setErro(null)
    const beneficiario = d.cobriu_id ? null : await buscarBeneficiario(d.id)
    setForm({
      data: d.data,
      localId: d.local_id ?? '',
      turno: d.turno ?? '',
      faltanteExterno: !d.faltante_id,
      faltanteId: d.faltante_id ?? '',
      faltanteNome: d.faltante_nome ?? '',
      motivoId: d.motivo_id ?? '',
      atestado: d.atestado ?? '',
      cobriuExterno: !d.cobriu_id,
      cobriuId: d.cobriu_id ?? '',
      cobriuNome: d.cobriu_nome ?? '',
      vinculoCobriu: d.vinculo_cobriu ?? '',
      funcaoExercida: d.funcao_exercida ?? '',
      telefoneBenef: beneficiario?.telefone ?? '',
      cpfBenef: beneficiario?.cpf ?? '',
      chavePixBenef: beneficiario?.chave_pix ?? '',
      bancoBenef: beneficiario?.banco ?? '',
      agenciaBenef: beneficiario?.agencia ?? '',
      contaBenef: beneficiario?.conta ?? '',
      valor: d.valor != null ? String(d.valor) : '',
      formaPagamento: d.forma_pagamento ?? '',
      reciboAssinado: d.recibo_assinado,
      autorizadoPor: d.autorizado_por ?? '',
      obs: d.obs ?? '',
    })
    setEditandoId(d.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setForm(vazio)
    setEditandoId(null)
    setErro(null)
  }

  async function cancelar(d: Diaria) {
    await cancelarDiaria(d.id)
    recarregar()
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Diárias</h1>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Registrar diária</p>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Local</label>
            <select
              value={form.localId}
              onChange={(e) => setForm({ ...form, localId: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Turno</label>
            <select
              value={form.turno}
              onChange={(e) => mudarTurno(e.target.value as 'Diurno' | 'Noturno' | '')}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="Diurno">Diurno</option>
              <option value="Noturno">Noturno</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Motivo da ausência</label>
            <select
              value={form.motivoId}
              onChange={(e) => setForm({ ...form, motivoId: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Quem faltou</p>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.faltanteExterno}
                onChange={(e) => setForm({ ...form, faltanteExterno: e.target.checked })}
              />
              Prestador eventual / não é do quadro
            </label>
          </div>
          {form.faltanteExterno ? (
            <input
              placeholder="Nome de quem faltou"
              value={form.faltanteNome}
              onChange={(e) => setForm({ ...form, faltanteNome: e.target.value })}
              className={inputCls}
            />
          ) : (
            <select
              value={form.faltanteId}
              onChange={(e) => setForm({ ...form, faltanteId: e.target.value })}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
          <div className="mt-2">
            <label className="mb-1 block text-xs text-slate-500">Atestado</label>
            <select
              value={form.atestado}
              onChange={(e) => setForm({ ...form, atestado: e.target.value as 'Sim' | 'Não' | 'Não se aplica' })}
              className={`${inputCls} max-w-xs`}
            >
              <option value="">—</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
              <option value="Não se aplica">Não se aplica</option>
            </select>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Quem cobriu</p>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.cobriuExterno}
                onChange={(e) => setForm({ ...form, cobriuExterno: e.target.checked })}
              />
              Prestador eventual / não é do quadro
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {form.cobriuExterno ? (
              <input
                placeholder="Nome de quem cobriu"
                value={form.cobriuNome}
                onChange={(e) => setForm({ ...form, cobriuNome: e.target.value })}
                className={inputCls}
              />
            ) : (
              <select
                value={form.cobriuId}
                onChange={(e) => setForm({ ...form, cobriuId: e.target.value })}
                className={inputCls}
              >
                <option value="">Selecione</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
            <select
              value={form.vinculoCobriu}
              onChange={(e) => setForm({ ...form, vinculoCobriu: e.target.value as 'CLT' | 'Prestador' })}
              className={inputCls}
            >
              <option value="">Vínculo</option>
              <option value="CLT">CLT</option>
              <option value="Prestador">Prestador</option>
            </select>
            <input
              placeholder="Função exercida"
              value={form.funcaoExercida}
              onChange={(e) => setForm({ ...form, funcaoExercida: e.target.value })}
              className={inputCls}
            />
          </div>

          {form.cobriuExterno && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded bg-slate-50 p-3 md:grid-cols-3">
              <input
                placeholder="Telefone"
                value={form.telefoneBenef}
                onChange={(e) => setForm({ ...form, telefoneBenef: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="CPF"
                value={form.cpfBenef}
                onChange={(e) => setForm({ ...form, cpfBenef: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Chave PIX"
                value={form.chavePixBenef}
                onChange={(e) => setForm({ ...form, chavePixBenef: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Banco"
                value={form.bancoBenef}
                onChange={(e) => setForm({ ...form, bancoBenef: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Agência"
                value={form.agenciaBenef}
                onChange={(e) => setForm({ ...form, agenciaBenef: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Conta"
                value={form.contaBenef}
                onChange={(e) => setForm({ ...form, contaBenef: e.target.value })}
                className={inputCls}
              />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Forma de pagamento</label>
            <select
              value={form.formaPagamento}
              onChange={(e) => setForm({ ...form, formaPagamento: e.target.value as 'PIX' | 'Transferência' | 'Espécie' })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="PIX">PIX</option>
              <option value="Transferência">Transferência</option>
              <option value="Espécie">Espécie</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Autorizado por</label>
            <input
              value={form.autorizadoPor}
              onChange={(e) => setForm({ ...form, autorizadoPor: e.target.value })}
              className={inputCls}
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.reciboAssinado}
              onChange={(e) => setForm({ ...form, reciboAssinado: e.target.checked })}
            />
            Recibo assinado
          </label>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-slate-500">Observação</label>
          <input
            value={form.obs}
            onChange={(e) => setForm({ ...form, obs: e.target.value })}
            className={inputCls}
          />
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Registrar'}
          </button>
          {editandoId && (
            <button
              onClick={cancelarEdicao}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Turno</th>
              <th className="px-3 py-2 font-medium">Faltou</th>
              <th className="px-3 py-2 font-medium">Cobriu</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && diarias.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma diária registrada.
                </td>
              </tr>
            )}
            {diarias.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{formatarData(d.data)}</td>
                <td className="px-3 py-2 text-slate-600">{d.turno ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">
                  {d.faltante_id ? (nomes.get(d.faltante_id) ?? '—') : (d.faltante_nome ?? '—')}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {d.cobriu_id ? (nomes.get(d.cobriu_id) ?? '—') : (d.cobriu_nome ?? '—')}
                </td>
                <td className="px-3 py-2 text-slate-600">{formatarMoeda(d.valor)}</td>
                <td className="px-3 py-2 text-slate-600">{d.status}</td>
                <td className="px-3 py-2">
                  {d.status === 'Registrado' && (
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => editar(d)} className="text-slate-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => cancelar(d)} className="text-red-600 hover:underline">
                        Cancelar
                      </button>
                    </div>
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
