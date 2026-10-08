// contagem_item.qtd_sistema/qtd_contada são numeric(12,3) — sempre 3 casas no
// banco. Pra tela, tira zero à direita em vez de mostrar "100,00000" ou
// "75,37000": "100,00000" -> "100", "75,37000" -> "75,37", "0,60800" -> "0,608".
export function formatarQtd(valor: number | null | undefined): string {
  if (valor == null) return '—'
  const semZeros = valor.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return (semZeros || '0').replace('.', ',')
}
