import { describe, it, expect } from 'vitest'
import { validatePost, validateComment, validateMessage, validateProfile } from '../validation'

describe('validatePost', () => {
  it('rejects empty post with no image', () => {
    expect(validatePost('', null)).toBeTruthy()
    expect(validatePost('   ', null)).toBeTruthy()
  })

  it('accepts text-only post', () => {
    expect(validatePost('Hello', null)).toBeNull()
  })

  it('rejects post over 5000 chars', () => {
    expect(validatePost('x'.repeat(5001), null)).toBeTruthy()
  })

  it('rejects non-image file', () => {
    const file = { size: 1000, type: 'application/pdf' }
    expect(validatePost('Hi', file)).toBe('File must be an image')
  })

  it('rejects image over 5MB', () => {
    const file = { size: 6 * 1024 * 1024, type: 'image/png' }
    expect(validatePost('Hi', file)).toBe('Image must be less than 5MB')
  })
})

describe('validateComment', () => {
  it('rejects empty comment', () => {
    expect(validateComment('')).toBeTruthy()
  })
  it('rejects comment over 1000 chars', () => {
    expect(validateComment('x'.repeat(1001))).toBeTruthy()
  })
  it('accepts normal comment', () => {
    expect(validateComment('Nice!')).toBeNull()
  })
})

describe('validateMessage', () => {
  it('rejects empty message', () => {
    expect(validateMessage('')).toBeTruthy()
  })
  it('accepts normal message', () => {
    expect(validateMessage('Hey there')).toBeNull()
  })
})

describe('validateProfile', () => {
  it('requires display name', () => {
    expect(validateProfile('', 'bio')).toBeTruthy()
  })
  it('rejects bio over 200 chars', () => {
    expect(validateProfile('Name', 'x'.repeat(201))).toBeTruthy()
  })
  it('accepts valid profile', () => {
    expect(validateProfile('John', 'A bio')).toBeNull()
  })
})
