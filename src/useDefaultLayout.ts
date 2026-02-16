import { useEffect, useRef, useCallback } from 'react'
import { parseJsonConfig } from './shareUtils'
import type { SharePayload } from './shareUtils'

const HAS_USER_DATA_KEY = 'seating-chart-assignments'

/**
 * Fetch and parse /default-layout.json.
 * Returns the parsed SharePayload on success, or null if the file is missing
 * or invalid.
 */
async function fetchDefaultLayout(): Promise<SharePayload | null> {
  try {
    const res = await fetch('/default-layout.json')
    if (!res.ok) return null
    const json = await res.json()
    if (!json || typeof json !== 'object') return null
    return parseJsonConfig(json as Record<string, unknown>)
  } catch {
    return null
  }
}

/**
 * On first visit (no localStorage data), attempt to fetch /default-layout.json.
 * This file can be volume-mounted into the container via docker-compose using
 * a JSON file previously exported from the web app.
 *
 * Calls `onLoad` with the parsed payload when a valid default layout is found.
 *
 * Returns a `resetToDefault` function that re-fetches /default-layout.json and
 * loads it if available, otherwise falls back to the hardcoded defaults via
 * `onFallbackReset`.
 */
export function useDefaultLayout(
  onLoad: (payload: SharePayload) => void,
  onFallbackReset: () => void,
) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    // Skip if the user already has saved data
    if (localStorage.getItem(HAS_USER_DATA_KEY) !== null) return

    fetchDefaultLayout().then((payload) => {
      if (payload) onLoad(payload)
    })
  }, [onLoad])

  const resetToDefault = useCallback(async () => {
    const payload = await fetchDefaultLayout()
    if (payload) {
      onLoad(payload)
    } else {
      onFallbackReset()
    }
  }, [onLoad, onFallbackReset])

  return { resetToDefault }
}
