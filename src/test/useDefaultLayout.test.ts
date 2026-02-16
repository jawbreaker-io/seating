import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDefaultLayout } from '../useDefaultLayout'
import type { SharePayload } from '../shareUtils'
import { zones as defaultZones, employees as defaultEmployees, defaultSeating } from '../data'

const samplePayload: SharePayload = {
  zones: [
    { id: 'z1', name: 'Custom Zone', color: '#fef3c7', rows: 2, cols: 2 },
  ],
  seating: { 'z1-d0': 'e1' },
  deskNames: { 'z1-d0': 'Reception' },
  unavailableDesks: { 'z1-d1': true },
  employees: [
    { id: 'e1', name: 'Test User', department: 'Engineering', avatar: 'TU' },
  ],
  departmentColors: { Engineering: '#3b82f6' },
}

const fullExportPayload: SharePayload = {
  zones: defaultZones,
  seating: defaultSeating,
  deskNames: {},
  unavailableDesks: {},
  employees: defaultEmployees,
  departmentColors: {
    Engineering: '#3b82f6',
    Design: '#a855f7',
  },
}

describe('useDefaultLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetches and loads default layout when no localStorage data exists', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(samplePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    const loaded = onLoad.mock.calls[0][0] as SharePayload
    expect(loaded.zones).toHaveLength(1)
    expect(loaded.zones[0].name).toBe('Custom Zone')
    expect(loaded.employees).toHaveLength(1)
  })

  it('skips fetch when localStorage already has seating data', async () => {
    localStorage.setItem('seating-chart-assignments', JSON.stringify({ 'z1-d0': 'e1' }))
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    // Give it time to potentially fire
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('does not call onLoad when fetch returns 404', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await new Promise((r) => setTimeout(r, 50))
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('does not call onLoad when fetch rejects (network error)', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await new Promise((r) => setTimeout(r, 50))
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('handles a full export payload from the web app', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fullExportPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    const loaded = onLoad.mock.calls[0][0] as SharePayload
    expect(loaded.zones).toHaveLength(defaultZones.length)
    expect(loaded.employees).toHaveLength(defaultEmployees.length)
    expect(loaded.seating).toBeDefined()
    expect(loaded.departmentColors).toBeDefined()
  })

  it('only fires once across re-renders', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(samplePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { rerender } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    rerender()
    rerender()

    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledTimes(1)
  })

  it('does not call onLoad when response body is not a valid object', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('"just a string"', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await new Promise((r) => setTimeout(r, 50))
    expect(onLoad).not.toHaveBeenCalled()
  })
})

describe('resetToDefault', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetches default-layout.json and calls onLoad when available', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    // Return a fresh Response each time (body can only be consumed once)
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(samplePayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    // Wait for initial load
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    // Now call resetToDefault
    await act(async () => {
      await result.current.resetToDefault()
    })

    expect(onLoad).toHaveBeenCalledTimes(2)
    expect(onFallbackReset).not.toHaveBeenCalled()
  })

  it('calls onFallbackReset when default-layout.json is not available', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await new Promise((r) => setTimeout(r, 50))

    await act(async () => {
      await result.current.resetToDefault()
    })

    expect(onFallbackReset).toHaveBeenCalledTimes(1)
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('calls onFallbackReset when fetch fails with network error', async () => {
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    await new Promise((r) => setTimeout(r, 50))

    await act(async () => {
      await result.current.resetToDefault()
    })

    expect(onFallbackReset).toHaveBeenCalledTimes(1)
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('works even when localStorage has existing data', async () => {
    localStorage.setItem('seating-chart-assignments', JSON.stringify({ 'z1-d0': 'e1' }))
    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(samplePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))

    // Initial load should be skipped due to localStorage
    await new Promise((r) => setTimeout(r, 50))
    expect(onLoad).not.toHaveBeenCalled()

    // But resetToDefault should still fetch and load
    await act(async () => {
      await result.current.resetToDefault()
    })

    expect(onLoad).toHaveBeenCalledTimes(1)
    const loaded = onLoad.mock.calls[0][0] as SharePayload
    expect(loaded.zones[0].name).toBe('Custom Zone')
  })

  it('clears all seating-chart-* localStorage keys on reset', async () => {
    // Populate localStorage with app data
    localStorage.setItem('seating-chart-assignments', JSON.stringify({ 'z1-d0': 'e1' }))
    localStorage.setItem('seating-chart-pinned', JSON.stringify({ 'z1-d0': true }))
    localStorage.setItem('seating-chart-layout', JSON.stringify([]))
    localStorage.setItem('seating-chart-desk-names', JSON.stringify({ 'z1-d0': 'Desk A' }))
    localStorage.setItem('seating-chart-unavailable', JSON.stringify({ 'z1-d1': true }))
    localStorage.setItem('seating-chart-employees', JSON.stringify([]))
    localStorage.setItem('seating-chart-dept-colors', JSON.stringify({}))
    // Non-app key should be left alone
    localStorage.setItem('other-app-key', 'keep-me')

    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))
    await new Promise((r) => setTimeout(r, 50))

    await act(async () => {
      await result.current.resetToDefault()
    })

    // All seating-chart-* keys should be removed
    expect(localStorage.getItem('seating-chart-assignments')).toBeNull()
    expect(localStorage.getItem('seating-chart-pinned')).toBeNull()
    expect(localStorage.getItem('seating-chart-layout')).toBeNull()
    expect(localStorage.getItem('seating-chart-desk-names')).toBeNull()
    expect(localStorage.getItem('seating-chart-unavailable')).toBeNull()
    expect(localStorage.getItem('seating-chart-employees')).toBeNull()
    expect(localStorage.getItem('seating-chart-dept-colors')).toBeNull()
    // Non-app key should survive
    expect(localStorage.getItem('other-app-key')).toBe('keep-me')
    expect(onFallbackReset).toHaveBeenCalledTimes(1)
  })

  it('clears browser caches on reset when Cache API is available', async () => {
    const deleteFn = vi.fn().mockResolvedValue(true)
    const keysFn = vi.fn().mockResolvedValue(['v1-cache', 'v2-cache'])
    Object.defineProperty(globalThis, 'caches', {
      value: { keys: keysFn, delete: deleteFn },
      writable: true,
      configurable: true,
    })

    const onLoad = vi.fn()
    const onFallbackReset = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )

    const { result } = renderHook(() => useDefaultLayout(onLoad, onFallbackReset))
    await new Promise((r) => setTimeout(r, 50))

    await act(async () => {
      await result.current.resetToDefault()
    })

    expect(keysFn).toHaveBeenCalled()
    expect(deleteFn).toHaveBeenCalledWith('v1-cache')
    expect(deleteFn).toHaveBeenCalledWith('v2-cache')

    // Clean up
    // @ts-expect-error - cleaning up test global
    delete globalThis.caches
  })
})
