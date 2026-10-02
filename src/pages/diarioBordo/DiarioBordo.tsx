import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  criarEntradaDiario,
  listarDiarioBordo,
  type EntradaDiario,
} from '../../lib/diarioBordo'
import { formatarData } from '../../utils/data'
import { mensagemErro } from '../../utils/erro'

const vazio = {
  data: new Date().toISOString().slice(0, 10),
  tipo: '',
  titulo: '',
  paraQuem: '',
  descricao: '',
  resultado: '',
}

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function DiarioBordo() {
  const { vinculos, session } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [entradas, setEntradas] = useState<EntradaDiario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!unidade) return
    recarregar()
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarDiarioBordo(unidade.id)
      .then(setEntradas)
      .finally(() => setCarregando(false))
  }

  async function salvar() {
    if (!unidade || !form.data || !form.titulo.trim()) {
      setErro('Data e título são obrigatórios.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await criarEntradaDiario({
        empresa_id: unidade.empresa_id,
        unidade_id: unidade.id,
        data: form.data,
        tipo: form.tipo || null,
        titulo: form.titulo.trim(),
        para_quem: form.paraQuem || null,
        descricao: form.descricao || null,
        resultado: form.resultado || null,
        criado_por: session?.user.id ?? null,
      })
      setForm({ ...vazio, data: form.data })
      recarregar()
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao salvar.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Diário do RH</h1>
      <p className="mb-4 text-sm text-slate-500">
        Registro de orientações, reuniões e ocorrências do dia a dia — fica no histórico da unidade.
      </p>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Nova entrada</p>
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
            <label className="mb-1 block text-xs text-slate-500">Tipo</label>
            <input
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              placeholder="ex: Reunião, Orientação..."
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Para quem</label>
            <input
              value={form.paraQuem}
              onChange={(e) => setForm({ ...form, paraQuem: e.target.value })}
              placeholder="Nome, turno ou equipe"
              className={inputCls}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="mb-1 block text-xs text-slate-500">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="mb-1 block text-xs text-slate-500">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              className={inputCls}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="mb-1 block text-xs text-slate-500">Resultado / encaminhamento</label>
            <input
              value={form.resultado}
              onChange={(e) => setForm({ ...form, resultado: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Registrar'}
        </button>
      </div>

      <div className="space-y-3">
        {carregando && <p className="text-sm text-slate-400">Carregando...</p>}
        {!carregando && entradas.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma entrada registrada ainda.</p>
        )}
        {entradas.map((e) => (
          <div key={e.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{e.titulo}</p>
              <span className="text-xs text-slate-400">{formatarData(e.data)}</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {e.tipo && <span className="rounded bg-slate-100 px-2 py-0.5">{e.tipo}</span>}
              {e.para_quem && <span className="rounded bg-slate-100 px-2 py-0.5">Para: {e.para_quem}</span>}
            </div>
            {e.descricao && <p className="text-sm text-slate-600">{e.descricao}</p>}
            {e.resultado && (
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-medium text-slate-600">Resultado: </span>
                {e.resultado}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
