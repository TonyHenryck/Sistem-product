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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      {/* Fundo PROVISORIO so pra testar o efeito de vidro - trocar antes de ir pra producao. */}
      <img
        src="/login-bg-provisorio.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
      />
      <div className="absolute inset-0 bg-slate-950/50" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-lg border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl"
      >
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-slate-300 text-sm font-semibold text-slate-900">
          RH
        </span>
        <h1 className="mb-6 text-xl font-semibold text-white">Entrar</h1>

        <label className="mb-1 block text-sm text-slate-200" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          className="mb-4 w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />

        <label className="mb-1 block text-sm text-slate-200" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          className="mb-4 w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />

        {erro && <p className="mb-4 text-sm text-red-300">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-slate-300 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
