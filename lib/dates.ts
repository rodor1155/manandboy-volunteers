export function formatEventDate(dateStart: string, dateEnd: string | null): string {
  const start = new Date(dateStart + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

  if (!dateEnd) {
    return start.toLocaleDateString('en-GB', opts)
  }

  const end = new Date(dateEnd + 'T12:00:00')
  const startDay = start.toLocaleDateString('en-GB', { day: 'numeric' })
  const endFull = end.toLocaleDateString('en-GB', opts)
  return `${startDay} - ${endFull}`
}

export function isMultiDay(dateStart: string, dateEnd: string | null): boolean {
  return !!dateEnd && dateEnd !== dateStart
}
