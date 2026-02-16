import { useEffect, useRef } from 'react'
import { parseJsonConfig } from './shareUtils'
import type { SharePayload } from './shareUtils'

const HAS_USER_DATA_KEY = 'seating-chart-assignments'

/**
 * On first visit (no localStorage data), attempt to fetch /default-layout.json.
 * This file can be volume-mounted into the container via docker-compose using
 * a JSON file previously exported from the web app.
 *
 * Calls `onLoad` with the parsed payload when a valid default layout is found.
 */
export function useDefaultLayout(onLoad: (payload: SharePayload) => void) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    // Skip if the user already has saved data
    if (localStorage.getItem(HAS_USER_DATA_KEY) !== null) return

    fetch('/default-layout.json')
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((json) => {
        if (!json || typeof json !== 'object') return
        const payload = parseJsonConfig(json as Record<string, unknown>)
        onLoad(payload)
      })
      .catch(() => {
        // No default layout file mounted — use built-in defaults
      })
  }, [onLoad])
}
