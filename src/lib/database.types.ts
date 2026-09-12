// Tipagem manual das tabelas usadas na Tarefa 1.
// Regerar com o projeto Supabase linkado:
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export interface Database {
  public: {
    Tables: {
      usuario: {
        Row: {
          id: string
          nome: string
          email: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id: string
          nome: string
          email?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string | null
          ativo?: boolean
          criado_em?: string
        }
      }
      unidade: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          cidade: string | null
          uf: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          criado_em?: string
        }
      }
      usuario_unidade: {
        Row: {
          usuario_id: string
          unidade_id: string
          papel: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
        Insert: {
          usuario_id: string
          unidade_id: string
          papel?: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
        Update: {
          usuario_id?: string
          unidade_id?: string
          papel?: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
      }
    }
  }
}
