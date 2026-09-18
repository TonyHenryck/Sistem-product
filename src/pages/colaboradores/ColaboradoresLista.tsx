import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import {
  buscarCatalogos,
  excluirColaborador,
  listarColaboradores,
  type Catalogos,
  type Colaborador,
} from '../../lib/colaboradores'

export function ColaboradoresLista() {
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade

  const [catalogos, setCatalogos] = useState<Catalogos>({
    funcoes: [],
    escalas: [],
    locais: [],
    beneficios: [],
    jornadas: [],
  })
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [carregando, setCarregando] = useState(true)

  const [funcaoId, setFuncaoId] = useState('')
  const [escalaId, setEscalaId] = useState('')
  const [localId, setLocalId] = useState('')
  const [area, setArea] = useState('')
  const [incluirDesligados, setIncluirDesligados] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (!unidade) return
    buscarCatalogos(unidade.empresa_id, unidade.id).then(setCatalogos)
  }, [unidade])

  function recarregar() {
    if (!unidade) return
    setCarregando(true)
    listarColaboradores(unidade.id, { funcaoId, escalaId, localId, area, incluirDesligados })
      .then(setColaboradores)
      .finally(() => setCarregando(false))
  }

  useEffect(recarregar, [unidade, funcaoId, escalaId, localId, area, incluirDesligados])

  const buscaNorm = busca.trim().toLowerCase()
  const colaboradoresFiltrados = busca
    ? colaboradores.filter((c) => c.nome.toLowerCase().includes(buscaNorm))
    : colaboradores

  async function excluir(id: string) {
    if (!confirm('Excluir este registro? Ele some da lista de colaboradores (não é um cadastro válido).')) return
    await excluirColaborador(id)
    recarregar()
  }

  const nomeFuncao = useMemo(
    () => new Map(catalogos.funcoes.map((f) => [f.id, f.nome])),
    [catalogos.funcoes],
  )
  const nomeEscala = useMemo(
    () => new Map(catalogos.escalas.map((e) => [e.id, e.nome])),
    [catalogos.escalas],
  )
  const nomeLocal = useMemo(
    () => new Map(catalogos.locais.map((l) => [l.id, l.nome])),
    [catalogos.locais],
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Colaboradores</h1>
        <Link
          to="/colaboradores/novo"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Novo colaborador
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Pesquisar nome</label>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome..."
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Função</label>
          <select
            value={funcaoId}
            onChange={(e) => setFuncaoId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {catalogos.funcoes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Área</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Buscar área"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Local</label>
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {catalogos.locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Escala</label>
          <select
            value={escalaId}
            onChange={(e) => setEscalaId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {catalogos.escalas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 pb-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={incluirDesligados}
            onChange={(e) => setIncluirDesligados(e.target.checked)}
          />
          Mostrar desligados
        </label>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Função</th>
              <th className="px-3 py-2 font-medium">Área</th>
              <th className="px-3 py-2 font-medium">Local</th>
              <th className="px-3 py-2 font-medium">Escala</th>
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

            {!carregando && colaboradoresFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}

            {colaboradoresFiltrados.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link to={`/colaboradores/${c.id}`} className="text-slate-800 hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {c.funcao_id ? (nomeFuncao.get(c.funcao_id) ?? '—') : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600">{c.area ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">
                  {c.local_id ? (nomeLocal.get(c.local_id) ?? '—') : c.atende_multiplos ? 'Múltiplas' : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {c.escala_id ? (nomeEscala.get(c.escala_id) ?? '—') : '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      c.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.ativo ? 'Ativo' : 'Desligado'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => excluir(c.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
