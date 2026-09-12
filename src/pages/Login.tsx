import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Login() {
  const { session, vinculos, carregando, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!carregando && session && vinculos.length > 0) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    const { erro } = await entrar(email, senha)
    setEnviando(false)
    if (erro) setErro('E-mail ou senha invalidos.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-xl font-semibold text-slate-800">Entrar</h1>

        <label className="mb-1 block text-sm text-slate-600" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm text-slate-600" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
