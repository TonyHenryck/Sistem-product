import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { vinculos, sair } = useAuth()
  const nomeUnidade = vinculos[0]?.unidade.nome ?? ''

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm font-medium text-slate-700">{nomeUnidade}</span>
          <button onClick={sair} className="text-sm text-slate-500 hover:text-slate-800">
            Sair
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
