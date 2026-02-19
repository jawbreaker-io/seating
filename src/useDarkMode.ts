import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'seating-chart-dark-mode'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, String(dark))
  }, [dark])

  const toggleDark = useCallback(() => setDark((d) => !d), [])

  return { dark, toggleDark }
}
