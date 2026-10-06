import { describe, expect, it } from 'vitest'
import {
  meetsPasswordRules,
  passwordRules,
  PASSWORD_ERROR,
  USERNAME_ERROR,
  validateCredentials,
} from '../credentials'

describe('passwordRules (REQ-2.3)', () => {
  it('reports each rule independently', () => {
    expect(passwordRules('abc').map((r) => r.met)).toEqual([false, false, false])
    expect(passwordRules('abcdefgh').map((r) => r.met)).toEqual([true, false, false])
    expect(passwordRules('abc1').map((r) => r.met)).toEqual([false, true, false])
    expect(passwordRules('abc!').map((r) => r.met)).toEqual([false, false, true])
  })

  it('requires length, a digit and a special character together', () => {
    expect(meetsPasswordRules('abcd1234')).toBe(false)
    expect(meetsPasswordRules('abcdefg!')).toBe(false)
    expect(meetsPasswordRules('ab1!')).toBe(false)
    expect(meetsPasswordRules('abcd123!')).toBe(true)
  })
})

describe('validateCredentials', () => {
  it('asks for a username first', () => {
    expect(validateCredentials('login', '  ', 'pw')).toBe('Enter a username.')
  })

  it.each(['user*name', 'john#1', 'two words', 'émile'])(
    'rejects username %j containing special characters (REQ-2.2, REQ-2.18)',
    (username) => {
      expect(validateCredentials('signup', username, 'abcd123!')).toBe(USERNAME_ERROR)
    },
  )

  it('rejects a weak password on sign up with the prescribed message (REQ-2.3)', () => {
    expect(validateCredentials('signup', 'planner2026', 'short1!')).toBe(PASSWORD_ERROR)
    expect(validateCredentials('signup', 'planner2026', 'nodigits!!')).toBe(PASSWORD_ERROR)
    expect(validateCredentials('signup', 'planner2026', 'nospecial12')).toBe(PASSWORD_ERROR)
  })

  it('accepts a valid sign up', () => {
    expect(validateCredentials('signup', 'planner2026', 'abcd123!')).toBe('')
  })

  it('does not apply complexity rules when logging in, only that a password was given', () => {
    expect(validateCredentials('login', 'planner2026', 'old-simple')).toBe('')
    expect(validateCredentials('login', 'planner2026', '')).toBe('Enter your password.')
  })
})
