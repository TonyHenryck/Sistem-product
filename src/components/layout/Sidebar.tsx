import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { contarVencimentosUrgentes } from '../../lib/vencimentos'

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {children}
    </svg>
  )
}

const ITENS = [
  {
    rota: '/',
    rotulo: 'Painel',
    icone: (
      <Icone>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </Icone>
    ),
  },
  {
    rota: '/colaboradores',
    rotulo: 'Colaboradores',
    icone: (
      <Icone>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </Icone>
    ),
  },
  {
    rota: '/escala',
    rotulo: 'Escala',
    icone: (
      <Icone>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </Icone>
    ),
  },
  {
    rota: '/vencimentos',
    rotulo: 'Vencimentos',
    icone: (
      <Icone>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </Icone>
    ),
  },
  {
    rota: '/diarias',
    rotulo: 'Diárias',
    icone: (
      <Icone>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 10v4M18 10v4" />
      </Icone>
    ),
  },
  {
    rota: '/faltas',
    rotulo: 'Faltas',
    icone: (
      <Icone>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 2 .4" />
        <path d="M17 8l4 4M21 8l-4 4" />
      </Icone>
    ),
  },
  {
    rota: '/trocas',
    rotulo: 'Trocas',
    icone: (
      <Icone>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </Icone>
    ),
  },
  {
    rota: '/advertencias',
    rotulo: 'Advertências',
    icone: (
      <Icone>
        <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2Z" />
        <path d="M12 8v4M12 16h.01" />
      </Icone>
    ),
  },
  {
    rota: '/ponto',
    rotulo: 'Ponto',
    icone: (
      <Icone>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </Icone>
    ),
  },
  {
    rota: '/fopag',
    rotulo: 'FOPAG',
    icone: (
      <Icone>
        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h-4a3 3 0 0 0 0 6h4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <circle cx="16" cy="12" r="1" />
      </Icone>
    ),
  },
  {
    rota: '/almoxarifado',
    rotulo: 'Almoxarifado',
    icone: (
      <Icone>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </Icone>
    ),
  },
  {
    rota: '/estoque',
    rotulo: 'Estoque',
    icone: (
      <Icone>
        <path d="M12 3 2 9l10 6 10-6-10-6Z" />
        <path d="M2 15l10 6 10-6" />
      </Icone>
    ),
  },
  {
    rota: '/nota-fiscal',
    rotulo: 'Nota fiscal',
    icone: (
      <Icone>
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        <path d="M9 13h6M9 17h6M9 9h2" />
      </Icone>
    ),
  },
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
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-700 text-xs font-semibold text-white">
          RH
        </span>
        {!recolhida && <span className="truncate text-sm font-semibold text-slate-800">Sistema RH/DP</span>}
      </div>

      <button
        onClick={() => setRecolhida((valor) => !valor)}
        className="flex h-9 items-center justify-center border-b border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
      >
        {recolhida ? '»' : '« Recolher'}
      </button>

      <nav className="flex-1 space-y-0.5 p-2 text-sm text-slate-600">
        {ITENS.map((item) => {
          const temBadge = item.rota === '/vencimentos' && contagemVencimentos > 0

          return (
            <NavLink
              key={item.rota}
              to={item.rota}
              end={item.rota === '/'}
              title={recolhida ? item.rotulo : undefined}
              className={({ isActive }) =>
                `relative flex items-center rounded ${recolhida ? 'justify-center px-2 py-2' : 'gap-2.5 px-2 py-1.5'} ${
                  isActive ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-slate-50'
                }`
              }
            >
              {item.icone}
              {!recolhida && <span className="truncate">{item.rotulo}</span>}
              {temBadge && recolhida && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
              {temBadge && !recolhida && (
                <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                  {contagemVencimentos}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
