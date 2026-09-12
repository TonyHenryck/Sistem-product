// Datas do banco vem como 'aaaa-mm-dd'. Forcar meia-noite local evita
// que o fuso jogue a data exibida um dia para tras.
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return ''

  const data = typeof valor === 'string' ? new Date(`${valor}T00:00:00`) : valor

  if (Number.isNaN(data.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR').format(data)
}
