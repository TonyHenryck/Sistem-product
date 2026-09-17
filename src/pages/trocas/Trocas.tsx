import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import {
  atualizarTroca,
  cancelarTroca,
  criarTroca,
  criarTrocaReciproca,
  excluirTroca,
  listarTrocas,
  type Troca,
} from '../../lib/trocas'
import { formatarData } from '../../utils/data'

const vazio = {
  dataTrocada: '',
  folgouId: '',
  assumiuId: '',
  motivo: '',
  dataDevolucao: '',
  autorizadoPor: '',
  obs: '',
  reciproca: false,
}

export function Trocas() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [trocas, setTrocas] = useState<Troca[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    listarColaboradoresAtivos(unidade.id).then(setColaboradores)
    listarNomesColaboradores(unidade.id).then((lista) => setNomes(new Map(lista.map((c) => [c.id, c.nome]))))
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarTrocas(unidade.id)
      .then(setTrocas)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.dataTrocada || !form.folgouId || !form.assumiuId) {
      setErro('Data, quem folgou e quem assumiu são obrigatórios.')
      return
    }
    if (form.folgouId === form.assumiuId) {
      setErro('Quem folgou e quem assumiu não podem ser a mesma pessoa.')
      return
    }
    if (form.reciproca && !form.dataDevolucao) {
      setErro('Informe a segunda data da troca recíproca.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      if (editandoId) {
        await atualizarTroca(editandoId, {
          data_trocada: form.dataTrocada,
          folgou_id: form.folgouId,
          assumiu_id: form.assumiuId,
          motivo: form.motivo || null,
          data_devolucao: form.dataDevolucao || null,
          autorizado_por: form.autorizadoPor || null,
          obs: form.obs || null,
        })
      } else if (form.reciproca) {
        await criarTrocaReciproca({
          empresaId: unidade.empresa_id,
          unidadeId: unidade.id,
          pessoaAId: form.folgouId,
          dataA: form.dataTrocada,
          pessoaBId: form.assumiuId,
          dataB: form.dataDevolucao,
          motivo: form.motivo || null,
          autorizadoPor: form.autorizadoPor || null,
          obs: form.obs || null,
        })
      } else {
        await criarTroca({
          empresa_id: unidade.empresa_id,
          unidade_id: unidade.id,
          data_trocada: form.dataTrocada,
          folgou_id: form.folgouId,
          assumiu_id: form.assumiuId,
          motivo: form.motivo || null,
          data_devolucao: form.dataDevolucao || null,
          autorizado_por: form.autorizadoPor || null,
          obs: form.obs || null,
        })
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

  function editar(t: Troca) {
    setErro(null)
    setForm({
      dataTrocada: t.data_trocada,
      folgouId: t.folgou_id,
      assumiuId: t.assumiu_id,
      motivo: t.motivo ?? '',
      dataDevolucao: t.data_devolucao ?? '',
      autorizadoPor: t.autorizado_por ?? '',
      obs: t.obs ?? '',
      reciproca: false,
    })
    setEditandoId(t.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setForm(vazio)
    setEditandoId(null)
    setErro(null)
  }

  async function cancelar(t: Troca) {
    await cancelarTroca(t.id)
    recarregar()
  }

  async function excluir(t: Troca) {
    if (!confirm(`Excluir de vez a troca de ${formatarData(t.data_trocada)}? Isso não pode ser desfeito.`)) return
    await excluirTroca(t.id)
    if (editandoId === t.id) cancelarEdicao()
    recarregar()
  }

  const inputCls =
    'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

  const gruposPorDupla = useMemo(() => {
    const mapa = new Map<string, Troca[]>()
    for (const t of trocas) {
      const chave = [t.folgou_id, t.assumiu_id].sort().join('|')
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave)!.push(t)
    }
    return [...mapa.values()]
  }, [trocas])

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Trocas de turno</h1>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">{editandoId ? 'Editar troca' : 'Registrar troca'}</p>
          {!editandoId && (
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.reciproca}
                onChange={(e) => setForm({ ...form, reciproca: e.target.checked })}
              />
              Troca recíproca (duas datas, uma pra cada)
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">{form.reciproca ? 'Data A' : 'Data'}</label>
            <input
              type="date"
              value={form.dataTrocada}
              onChange={(e) => setForm({ ...form, dataTrocada: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{form.reciproca ? 'Pessoa A (folga na Data A)' : 'Quem folgou'}</label>
            <select
              value={form.folgouId}
              onChange={(e) => setForm({ ...form, folgouId: e.target.value })}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{form.reciproca ? 'Pessoa B (assume a Data A)' : 'Quem assumiu'}</label>
            <select
              value={form.assumiuId}
              onChange={(e) => setForm({ ...form, assumiuId: e.target.value })}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              {form.reciproca ? 'Data B (Pessoa B folga, Pessoa A assume)' : 'Previsão de devolução'}
            </label>
            <input
              type="date"
              value={form.dataDevolucao}
              onChange={(e) => setForm({ ...form, dataDevolucao: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Motivo</label>
            <input
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Autorizado por</label>
            <input
              value={form.autorizadoPor}
              onChange={(e) => setForm({ ...form, autorizadoPor: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Observação</label>
            <input
              value={form.obs}
              onChange={(e) => setForm({ ...form, obs: e.target.value })}
              className={inputCls}
            />
          </div>
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
              <th className="px-3 py-2 font-medium">Folgou</th>
              <th className="px-3 py-2 font-medium">Assumiu</th>
              <th className="px-3 py-2 font-medium">Devolução prevista</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
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
            {!carregando && trocas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma troca registrada.
                </td>
              </tr>
            )}
            {gruposPorDupla.map((grupo) => (
              <Fragment key={grupo[0].id}>
                {grupo.length > 1 && (
                  <tr key={`cabecalho-${grupo[0].id}`} className="bg-slate-50">
                    <td colSpan={6} className="px-3 py-1.5 text-xs font-medium text-slate-500">
                      {nomes.get(grupo[0].folgou_id) ?? '—'} ↔ {nomes.get(grupo[0].assumiu_id) ?? '—'} · {grupo.length}{' '}
                      trocas entre os dois
                    </td>
                  </tr>
                )}
                {grupo.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      t.status === 'Devolução pendente' ? 'bg-amber-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2">{formatarData(t.data_trocada)}</td>
                    <td className="px-3 py-2">{nomes.get(t.folgou_id) ?? '—'}</td>
                    <td className="px-3 py-2">{nomes.get(t.assumiu_id) ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{formatarData(t.data_devolucao)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          t.status === 'Devolução pendente'
                            ? 'bg-amber-100 font-medium text-amber-800'
                            : t.status === 'Concluída'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-3 text-xs">
                        {t.status === 'Devolução pendente' && (
                          <>
                            <button onClick={() => editar(t)} className="text-slate-600 hover:underline">
                              Editar
                            </button>
                            <button onClick={() => cancelar(t)} className="text-amber-700 hover:underline">
                              Cancelar
                            </button>
                          </>
                        )}
                        <button onClick={() => excluir(t)} className="text-red-600 hover:underline">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
