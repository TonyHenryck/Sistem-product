const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarMoeda(valor: number | null | undefined): string {
  return formatador.format(valor ?? 0)
}
