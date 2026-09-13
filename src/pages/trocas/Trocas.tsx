import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { criarTroca, listarTrocas, type Troca } from '../../lib/trocas'
import { formatarData } from '../../utils/data'

const vazio = {
  dataTrocada: '',
  folgouId: '',
  assumiuId: '',
  motivo: '',
  dataDevolucao: '',
  autorizadoPor: '',
  obs: '',
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

    setSalvando(true)
    setErro(null)
    try {
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
      setForm(vazio)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls =
    'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Trocas de turno</h1>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Registrar troca</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Data</label>
            <input
              type="date"
              value={form.dataTrocada}
              onChange={(e) => setForm({ ...form, dataTrocada: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Quem folgou</label>
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
            <label className="mb-1 block text-xs text-slate-500">Quem assumiu</label>
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
            <label className="mb-1 block text-xs text-slate-500">Previsão de devolução</label>
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

        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Registrar'}
        </button>
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
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && trocas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma troca registrada.
                </td>
              </tr>
            )}
            {trocas.map((t) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
