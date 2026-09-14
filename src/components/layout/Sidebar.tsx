import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { contarVencimentosUrgentes } from '../../lib/vencimentos'

const ITENS = [
  { rota: '/colaboradores', rotulo: 'Colaboradores' },
  { rota: '/escala', rotulo: 'Escala' },
  { rota: '/vencimentos', rotulo: 'Vencimentos' },
  { rota: '/diarias', rotulo: 'Diárias' },
  { rota: '/faltas', rotulo: 'Faltas' },
  { rota: '/trocas', rotulo: 'Trocas' },
  { rota: '/advertencias', rotulo: 'Advertências' },
  { rota: '/ponto', rotulo: 'Ponto' },
  { rota: '/fopag', rotulo: 'FOPAG' },
  { rota: '/almoxarifado', rotulo: 'Almoxarifado' },
  { rota: '/estoque', rotulo: 'Estoque' },
]

export function Sidebar() {
  const [recolhida, setRecolhida] = useState(false)
  const { vinculos } = useAuth()
  const unidade = vinculos[0]?.unidade
  const [contagemVencimentos, setContagemVencimentos] = useState(0)

  useEffect(() => {
    if (!unidade) return
    contarVencimentosUrgentes(unidade.id).then(setContagemVencimentos)
  }, [unidade])

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-200 bg-white transition-all ${
        recolhida ? 'w-16' : 'w-56'
      }`}
    >
      <button
        onClick={() => setRecolhida((valor) => !valor)}
        className="flex h-12 items-center justify-center border-b border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        {recolhida ? '»' : '« Recolher'}
      </button>

      <nav className="flex-1 p-2 text-sm text-slate-600">
        {ITENS.map((item) => (
          <NavLink
            key={item.rota}
            to={item.rota}
            className={({ isActive }) =>
              `flex items-center justify-between rounded px-2 py-1.5 ${isActive ? 'bg-slate-100 font-medium text-slate-800' : 'hover:bg-slate-50'}`
            }
          >
            <span>{recolhida ? item.rotulo.slice(0, 1) : item.rotulo}</span>
            {item.rota === '/vencimentos' && contagemVencimentos > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {contagemVencimentos}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
