import { supabase } from './supabase'

export interface GrupoContagem {
  nome: string
  total: number
}

export interface QuadroPessoal {
  totalAtivos: number
  porFuncao: GrupoContagem[]
  porLocal: GrupoContagem[]
  porEscala: GrupoContagem[]
  porVinculo: GrupoContagem[]
}

interface ColaboradorResumo {
  funcao_id: string | null
  local_id: string | null
  escala_id: string | null
  vinculo: string
  atende_multiplos: boolean
}

function agrupar<T>(itens: T[], chave: (item: T) => string): GrupoContagem[] {
  const mapa = new Map<string, number>()
  for (const item of itens) {
    const nome = chave(item)
    mapa.set(nome, (mapa.get(nome) ?? 0) + 1)
  }
  return [...mapa.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total)
}

export async function buscarQuadroPessoal(unidadeId: string, empresaId: string): Promise<QuadroPessoal> {
  const [{ data: colaboradores, error }, { data: funcoes }, { data: locais }, { data: escalas }] = await Promise.all([
    supabase
      .from('colaborador')
      .select('funcao_id, local_id, escala_id, vinculo, atende_multiplos')
      .eq('unidade_id', unidadeId)
      .eq('ativo', true),
    supabase.from('cat_funcao').select('id, nome').eq('empresa_id', empresaId),
    supabase.from('local_operacional').select('id, nome').eq('unidade_id', unidadeId),
    supabase.from('cat_escala').select('id, nome').eq('empresa_id', empresaId),
  ])
  if (error) throw error

  const nomeFuncao = new Map((funcoes ?? []).map((f) => [f.id, f.nome]))
  const nomeLocal = new Map((locais ?? []).map((l) => [l.id, l.nome]))
  const nomeEscala = new Map((escalas ?? []).map((e) => [e.id, e.nome]))
  const lista: ColaboradorResumo[] = colaboradores ?? []

  return {
    totalAtivos: lista.length,
    porFuncao: agrupar(lista, (c) => (c.funcao_id && nomeFuncao.get(c.funcao_id)) || 'Sem função'),
    porLocal: agrupar(
      lista,
      (c) => (c.atende_multiplos ? 'Múltiplos locais' : (c.local_id && nomeLocal.get(c.local_id)) || 'Sem local'),
    ),
    porEscala: agrupar(lista, (c) => (c.escala_id && nomeEscala.get(c.escala_id)) || 'Sem escala'),
    porVinculo: agrupar(lista, (c) => c.vinculo),
  }
}
