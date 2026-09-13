import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { criarFalta, listarFaltas, type Falta, type FaltaInsert } from '../../lib/faltas'
import { formatarData } from '../../utils/data'

const TIPOS: FaltaInsert['tipo'][] = [
  'Falta injustificada',
  'Atestado médico',
  'Falta abonada',
  'Atraso',
  'Saída antecipada',
  'Suspensão',
]

const vazio = {
  data: '',
  colaboradorId: '',
  tipo: '' as FaltaInsert['tipo'] | '',
  dias: '1',
  atestado: '' as 'Sim' | 'Não' | 'Não se aplica' | '',
  descontar: true,
  perdeDsr: false,
  notificado: false,
  obs: '',
}

export function Faltas() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [colaboradores, setColaboradores] = useState<Catalogo[]>([])
  const [nomes, setNomes] = useState<Map<string, string>>(new Map())
  const [faltas, setFaltas] = useState<Falta[]>([])
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
    listarFaltas(unidade.id)
      .then(setFaltas)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.data || !form.colaboradorId || !form.tipo) {
      setErro('Data, colaborador e tipo são obrigatórios.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await criarFalta({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        data: form.data,
        colaborador_id: form.colaboradorId,
        tipo: form.tipo,
        dias: Number(form.dias) || 1,
        atestado: form.atestado || null,
        descontar: form.descontar,
        perde_dsr: form.perdeDsr,
        notificado: form.notificado,
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
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Faltas</h1>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Registrar falta</p>
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
              onChange={(e) => setForm({ ...form, tipo: e.target.value as FaltaInsert['tipo'] })}
              className={inputCls}
            >
              <option value="">Selecione</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Dias</label>
            <input
              type="number"
              step="0.5"
              value={form.dias}
              onChange={(e) => setForm({ ...form, dias: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Atestado</label>
            <select
              value={form.atestado}
              onChange={(e) => setForm({ ...form, atestado: e.target.value as 'Sim' | 'Não' | 'Não se aplica' })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
              <option value="Não se aplica">Não se aplica</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Observação</label>
            <input
              value={form.obs}
              onChange={(e) => setForm({ ...form, obs: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.descontar}
              onChange={(e) => setForm({ ...form, descontar: e.target.checked })}
            />
            Descontar
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.perdeDsr}
              onChange={(e) => setForm({ ...form, perdeDsr: e.target.checked })}
            />
            Perde DSR
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.notificado}
              onChange={(e) => setForm({ ...form, notificado: e.target.checked })}
            />
            Colaborador notificado
          </label>
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
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Dias</th>
              <th className="px-3 py-2 font-medium">Descontar</th>
              <th className="px-3 py-2 font-medium">Perde DSR</th>
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
            {!carregando && faltas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma falta registrada.
                </td>
              </tr>
            )}
            {faltas.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{formatarData(f.data)}</td>
                <td className="px-3 py-2">{nomes.get(f.colaborador_id) ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{f.tipo}</td>
                <td className="px-3 py-2 text-slate-600">{f.dias}</td>
                <td className="px-3 py-2 text-slate-600">{f.descontar ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2 text-slate-600">{f.perde_dsr ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
