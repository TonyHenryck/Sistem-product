import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { criarAdvertencia, listarAdvertencias, type Advertencia, type AdvertenciaInsert } from '../../lib/advertencias'
import { formatarData } from '../../utils/data'

const TIPOS: NonNullable<AdvertenciaInsert['tipo']>[] = ['Verbal', 'Escrita', 'Suspensão']

const vazio = {
  data: '',
  colaboradorId: '',
  tipo: '' as NonNullable<AdvertenciaInsert['tipo']> | '',
  motivo: '',
  descricao: '',
  testemunha: '',
  assinada: false,
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none'

export function Advertencias() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([])
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
    listarAdvertencias(unidade.id)
      .then(setAdvertencias)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.data || !form.colaboradorId) {
      setErro('Data e colaborador são obrigatórios.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await criarAdvertencia({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        data: form.data,
        colaborador_id: form.colaboradorId,
        tipo: form.tipo || null,
        motivo: form.motivo || null,
        descricao: form.descricao || null,
        testemunha: form.testemunha || null,
        assinada: form.assinada,
      })
      setForm(vazio)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Advertências</h1>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Registrar advertência</p>
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
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Colaborador</label>
            <select
              value={form.colaboradorId}
              onChange={(e) => setForm({ ...form, colaboradorId: e.target.value })}
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
            <label className="mb-1 block text-xs text-slate-500">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as NonNullable<AdvertenciaInsert['tipo']> })}
              className={inputCls}
            >
              <option value="">—</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
            <label className="mb-1 block text-xs text-slate-500">Testemunha</label>
            <input
              value={form.testemunha}
              onChange={(e) => setForm({ ...form, testemunha: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="mb-1 block text-xs text-slate-500">Descrição</label>
            <input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.assinada}
            onChange={(e) => setForm({ ...form, assinada: e.target.checked })}
          />
          Assinada pelo colaborador
        </label>

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
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Motivo</th>
              <th className="px-3 py-2 font-medium">Assinada</th>
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
            {!carregando && advertencias.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma advertência registrada.
                </td>
              </tr>
            )}
            {advertencias.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{formatarData(a.data)}</td>
                <td className="px-3 py-2">{nomes.get(a.colaborador_id) ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{a.tipo ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{a.motivo ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{a.assinada ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
