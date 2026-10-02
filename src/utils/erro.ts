// Erro do Supabase (PostgrestError) e um objeto comum, nao uma instancia de Error.
export function mensagemErro(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message
  return fallback
}
