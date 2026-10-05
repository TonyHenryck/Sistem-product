import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { vinculos, sair } = useAuth()
  const nomeUnidade = vinculos[0]?.unidade.nome ?? ''

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-950">
      <div className="fundo-aurora" />

      <Sidebar />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-900/60 px-6 backdrop-blur-xl">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <span className="h-1.5 w-1.5 animar-pulso rounded-full bg-slate-100 shadow-[0_0_8px_2px_rgba(255,255,255,0.5)]" />
            {nomeUnidade}
          </span>
          <button onClick={sair} className="text-sm text-slate-400 hover:text-white">
            Sair
          </button>
        </header>

        <main className="grade-tecnica flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
