export const USERNAME_MAX_LENGTH = 36
export const PASSWORD_MAX_LENGTH = 36

export type AuthMode = 'login' | 'signup'

export interface PasswordRule {
  id: 'length' | 'number' | 'special'
  label: string
  met: boolean
}

export const USERNAME_ERROR =
  'Username cannot contain special characters. Please use only letters and numbers.'
export const PASSWORD_ERROR =
  'Password must be at least 8 characters long and contain at least one number and one special character.'

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'number', label: 'Contains a number', met: /\d/.test(password) },
    { id: 'special', label: 'Contains a special character', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function meetsPasswordRules(password: string): boolean {
  return passwordRules(password).every((rule) => rule.met)
}

/**
 * Validates the credential form before it is sent to the server. Returns the inline error to
 * show, or an empty string when the input can be submitted.
 */
export function validateCredentials(mode: AuthMode, username: string, password: string): string {
  const name = username.trim()
  if (!name) return 'Enter a username.'
  if (!/^[A-Za-z0-9]+$/.test(name)) return USERNAME_ERROR
  if (mode === 'signup' && !meetsPasswordRules(password)) return PASSWORD_ERROR
  if (mode === 'login' && !password) return 'Enter your password.'
  return ''
}
