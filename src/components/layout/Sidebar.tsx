import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const ITENS = [{ rota: '/colaboradores', rotulo: 'Colaboradores' }]

export function Sidebar() {
  const [recolhida, setRecolhida] = useState(false)

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
              `block rounded px-2 py-1.5 ${isActive ? 'bg-slate-100 font-medium text-slate-800' : 'hover:bg-slate-50'}`
            }
          >
            {recolhida ? item.rotulo.slice(0, 1) : item.rotulo}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
