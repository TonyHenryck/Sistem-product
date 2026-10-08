import {
  buscarMovimentosPeriodo,
  buscarSaldos,
  listarCategoriasProduto,
  listarProdutos,
  type MovimentoEstoque,
  type Produto,
} from './almoxarifado'

export interface ResumoAlmoxarifado {
  totalProdutos: number
  semEstoque: number
  semCategoria: number
  movimentosMes: number
  produtosSemEstoque: { nome: string; categoria: string }[]
  produtosPorCategoria: { rotulo: string; valor: number }[]
  movimentosPorTipo: { rotulo: string; valor: number }[]
}

const NOMES_TIPO: Record<MovimentoEstoque['tipo'], string> = {
  Entrada: 'Entrada',
  Saída: 'Saída',
  Ajuste: 'Ajuste',
  Perda: 'Perda',
  Transferência: 'Transferência',
}

function inicioFimMesAtual(): { inicio: string; fim: string } {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { inicio, fim }
}

// Dá pra contar produto e lançamento sem problema, mas não dá pra somar
// saldo ou quantidade entre produtos — cada um tem sua própria unidade
// (kg, lt, un...), então somar misturaria coisas incomparáveis. Por isso
// os gráficos daqui são sempre contagem (quantos produtos, quantos
// lançamentos), nunca soma de quantidade.
export async function buscarResumoAlmoxarifado(empresaId: string, unidadeId: string): Promise<ResumoAlmoxarifado> {
  const { inicio, fim } = inicioFimMesAtual()

  const [produtos, categorias, saldos, movimentos] = await Promise.all([
    listarProdutos(empresaId),
    listarCategoriasProduto(empresaId),
    buscarSaldos(unidadeId),
    buscarMovimentosPeriodo(unidadeId, inicio, fim),
  ])

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]))
  const rotuloCategoriaDe = (p: Produto) => (p.categoria_id ? (nomeCategoria.get(p.categoria_id) ?? 'Sem categoria') : (p.categoria || 'Sem categoria'))

  const semEstoqueLista = produtos.filter((p) => (saldos.get(p.id) ?? 0) <= 0)
  const semCategoria = produtos.filter((p) => !p.categoria_id && !p.categoria).length

  const mapaCategorias = new Map<string, number>()
  for (const p of produtos) {
    const rotulo = rotuloCategoriaDe(p)
    mapaCategorias.set(rotulo, (mapaCategorias.get(rotulo) ?? 0) + 1)
  }
  const produtosPorCategoria = [...mapaCategorias.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor)

  const mapaTipos = new Map<string, number>()
  for (const m of movimentos) {
    const rotulo = NOMES_TIPO[m.tipo]
    mapaTipos.set(rotulo, (mapaTipos.get(rotulo) ?? 0) + 1)
  }
  const movimentosPorTipo = (Object.values(NOMES_TIPO) as string[])
    .filter((rotulo, i, lista) => lista.indexOf(rotulo) === i)
    .map((rotulo) => ({ rotulo, valor: mapaTipos.get(rotulo) ?? 0 }))
    .filter((t) => t.valor > 0)

  return {
    totalProdutos: produtos.length,
    semEstoque: semEstoqueLista.length,
    semCategoria,
    movimentosMes: movimentos.length,
    produtosSemEstoque: semEstoqueLista
      .map((p) => ({ nome: p.nome, categoria: rotuloCategoriaDe(p) }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    produtosPorCategoria,
    movimentosPorTipo,
  }
}
