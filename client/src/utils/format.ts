const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ORDINALS = ['1st', '2nd', '3rd']

/** "S$13,000", or an em dash for a zero (not applicable) amount. */
export function formatMoney(amount: number): string {
  return amount === 0 ? '—' : `S$${amount.toLocaleString('en-SG')}`
}

/** "09 Sep 2026, 9:14 pm" in the viewer's local time. */
export function formatTimestamp(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const hours = date.getHours()
  const meridiem = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  const day = String(date.getDate()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hour12}:${minutes} ${meridiem}`
}

/** "1st choice", "2nd choice", "3rd choice". Falls back to "4th" style beyond the third. */
export function choiceLabel(index: number): string {
  return `${ORDINALS[index] ?? `${index + 1}th`} choice`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

/** Distance caption such as "4.6 km", or a prompt when no reference postal code is set. */
export function formatDistance(km: number, hasPostal: boolean): string {
  return hasPostal ? `${km.toFixed(1)} km` : 'Add postal code'
}
