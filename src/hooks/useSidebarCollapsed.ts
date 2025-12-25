import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'logo2openscad:sidebar-collapsed'

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'true'
    } catch {
      return false // Default to expanded
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState(prev => !prev)
  }, [])

  return { collapsed, setCollapsed, toggle }
}
