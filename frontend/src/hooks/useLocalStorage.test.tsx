import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('initializes with provided value and saves to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'value'))
    const [stored] = result.current
    expect(stored).toBe('value')
    expect(window.localStorage.getItem('key')).toEqual(JSON.stringify('value'))
  })

  it('retrieves existing value from localStorage', () => {
    window.localStorage.setItem('key', JSON.stringify('existing'))
    const { result } = renderHook(() => useLocalStorage('key', 'fallback'))
    const [stored] = result.current
    expect(stored).toBe('existing')
  })

  it('updates value and persists', () => {
    const { result } = renderHook(() => useLocalStorage('key', 0))
    act(() => {
      const [, setValue] = result.current
      setValue(10)
    })
    const [stored] = result.current
    expect(stored).toBe(10)
    expect(window.localStorage.getItem('key')).toEqual('10')
  })
})