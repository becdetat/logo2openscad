import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'turtle2openscad:darkMode'

function loadDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
    // Default to light mode
    return false
  } catch {
    return false
  }
}

function saveDarkMode(isDark: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(isDark))
  } catch {
    // ignore
  }
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(loadDarkMode)

  useEffect(() => {
    saveDarkMode(isDarkMode)
  }, [isDarkMode])

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((prev) => !prev)
  }, [])

  return { isDarkMode, toggleDarkMode }
}
