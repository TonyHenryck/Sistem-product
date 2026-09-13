import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

export interface Vinculo {
  papel: Database['public']['Tables']['usuario_unidade']['Row']['papel']
  unidade: {
    id: string
    nome: string
    empresa_id: string
  }
}

interface AuthContextValue {
  session: Session | null
  vinculos: Vinculo[]
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>
  sair: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function buscarVinculos(usuarioId: string): Promise<Vinculo[]> {
  const { data: vinculos, error } = await supabase
    .from('usuario_unidade')
    .select('papel, unidade_id')
    .eq('usuario_id', usuarioId)

  if (error || !vinculos || vinculos.length === 0) return []

  const unidadeIds = vinculos.map((vinculo) => vinculo.unidade_id)

  const { data: unidades } = await supabase
    .from('unidade')
    .select('id, nome, empresa_id')
    .in('id', unidadeIds)

  return vinculos.map((vinculo) => ({
    papel: vinculo.papel,
    unidade: unidades?.find((u) => u.id === vinculo.unidade_id) ?? {
      id: vinculo.unidade_id,
      nome: '',
      empresa_id: '',
    },
  }))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarSessaoInicial() {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      if (data.session) {
        setVinculos(await buscarVinculos(data.session.user.id))
      }
      setCarregando(false)
    }

    carregarSessaoInicial()

    const { data: assinatura } = supabase.auth.onAuthStateChange(async (_evento, novaSessao) => {
      setSession(novaSessao)
      setVinculos(novaSessao ? await buscarVinculos(novaSessao.user.id) : [])
    })

    return () => assinatura.subscription.unsubscribe()
  }, [])

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return { erro: error ? error.message : null }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, vinculos, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}
