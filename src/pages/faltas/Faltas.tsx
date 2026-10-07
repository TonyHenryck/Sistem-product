import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listarColaboradoresAtivos, listarNomesColaboradores, type Catalogo } from '../../lib/colaboradores'
import { buscarDetalheColaboradorEscala, type DetalheColaboradorEscala } from '../../lib/escalaIndividual'
import { criarFalta, listarFaltas, type Falta, type FaltaInsert } from '../../lib/faltas'
import { formatarIntervalo } from '../../lib/ponto'
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
  horarioCombinado: '',
  atestado: '' as 'Sim' | 'Não' | 'Não se aplica' | '',
  descontar: true,
  perdeDsr: false,
  notificado: false,
  obs: '',
}

// 'HH:MM' -> minutos desde meia-noite
function paraMinutos(horario: string): number {
  const [h, m] = horario.split(':').map(Number)
  return h * 60 + m
}

// Diferença entre o horário combinado (o que o colaborador pediu) e o
// horário normal de entrada/saída dele, em horas. Sempre positiva — se virar
// o dia no meio (ex: pediu pra sair às 19h num turno que fecha às 09h do dia
// seguinte), soma 24h, igual a conta de duração de turno em escalaIndividual.ts.
function horasPerdidas(tipo: 'Atraso' | 'Saída antecipada', horarioNormal: string, horarioCombinado: string): number {
  const normal = paraMinutos(horarioNormal)
  const combinado = paraMinutos(horarioCombinado)
  let diferenca = tipo === 'Atraso' ? combinado - normal : normal - combinado
  if (diferenca < 0) diferenca += 24 * 60
  return diferenca / 60
}

function horasParaIntervalo(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function horasParaTexto(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  return `${h}h${String(m).padStart(2, '0')}`
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
  const [detalheColaborador, setDetalheColaborador] = useState<DetalheColaboradorEscala | null>(null)

  useEffect(() => {
    if (!unidade) return
    listarColaboradoresAtivos(unidade.id).then(setColaboradores)
    listarNomesColaboradores(unidade.id).then((lista) => setNomes(new Map(lista.map((c) => [c.id, c.nome]))))
    recarregar()
  }, [unidade])

  useEffect(() => {
    if (!form.colaboradorId) {
      setDetalheColaborador(null)
      return
    }
    buscarDetalheColaboradorEscala(form.colaboradorId).then(setDetalheColaborador)
  }, [form.colaboradorId])

  const precisaHorario = form.tipo === 'Atraso' || form.tipo === 'Saída antecipada'
  const horarioNormal =
    precisaHorario && detalheColaborador?.horario
      ? form.tipo === 'Atraso'
        ? detalheColaborador.horario.horaInicio
        : detalheColaborador.horario.horaFim
      : null
  const tempoPerdidoHoras =
    horarioNormal && form.horarioCombinado && (form.tipo === 'Atraso' || form.tipo === 'Saída antecipada')
      ? horasPerdidas(form.tipo, horarioNormal, form.horarioCombinado)
      : null

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
        tempo_perdido: tempoPerdidoHoras != null ? horasParaIntervalo(tempoPerdidoHoras) : null,
        atestado: form.atestado || null,
        descontar: form.descontar,
        perde_dsr: form.perdeDsr,
        notificado: form.notificado,
        obs: form.obs || null,
      })
      setForm(vazio)
      setDetalheColaborador(null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls =
    'w-full rounded border border-white/10 px-2 py-1.5 text-sm bg-slate-900 text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Faltas</h1>

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Registrar falta</p>
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

        {precisaHorario && (
          <div className="mt-3 rounded border border-white/10 bg-white/5 p-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  {form.tipo === 'Atraso' ? 'Horário combinado de chegada' : 'Horário combinado de saída'}
                </label>
                <input
                  type="time"
                  value={form.horarioCombinado}
                  onChange={(e) => setForm({ ...form, horarioCombinado: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="col-span-3 flex items-end pb-2 text-xs text-slate-500">
                {!form.colaboradorId ? (
                  'Selecione o colaborador pra ver o horário normal dele.'
                ) : !detalheColaborador?.horario ? (
                  'Esse colaborador não tem horário cadastrado — não dá pra calcular o tempo perdido automaticamente.'
                ) : (
                  <span>
                    Horário normal de {form.tipo === 'Atraso' ? 'entrada' : 'saída'}:{' '}
                    <span className="text-slate-300">{horarioNormal?.slice(0, 5)}</span>
                    {tempoPerdidoHoras != null && (
                      <span className="ml-2 text-amber-300">
                        · {horasParaTexto(tempoPerdidoHoras)} de {form.tipo === 'Atraso' ? 'atraso' : 'saída antecipada'}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={form.descontar}
              onChange={(e) => setForm({ ...form, descontar: e.target.checked })}
            />
            Descontar
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={form.perdeDsr}
              onChange={(e) => setForm({ ...form, perdeDsr: e.target.checked })}
            />
            Perde DSR
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={form.notificado}
              onChange={(e) => setForm({ ...form, notificado: e.target.checked })}
            />
            Colaborador notificado
          </label>
        </div>

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}

        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-4 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Registrar'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Colaborador</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Dias</th>
              <th className="px-3 py-2 font-medium">Tempo perdido</th>
              <th className="px-3 py-2 font-medium">Descontar</th>
              <th className="px-3 py-2 font-medium">Perde DSR</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && faltas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Nenhuma falta registrada.
                </td>
              </tr>
            )}
            {faltas.map((f) => (
              <tr key={f.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2">{formatarData(f.data)}</td>
                <td className="px-3 py-2">{nomes.get(f.colaborador_id) ?? '—'}</td>
                <td className="px-3 py-2 text-slate-400">{f.tipo}</td>
                <td className="px-3 py-2 text-slate-400">{f.dias}</td>
                <td className="px-3 py-2 text-slate-400">{formatarIntervalo(f.tempo_perdido) || '—'}</td>
                <td className="px-3 py-2 text-slate-400">{f.descontar ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2 text-slate-400">{f.perde_dsr ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
