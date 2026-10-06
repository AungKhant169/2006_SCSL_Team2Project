export const POSTAL_CODE_ERROR = 'Please enter a valid 6-digit Singapore postal code.'

export function isValidPostalCode(value: string): boolean {
  return /^\d{6}$/.test(value)
}

/** Keeps digits only, capped at six characters. Used to filter postal code inputs as the user types. */
export function sanitizePostalInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}
