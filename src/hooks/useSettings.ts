import { useCallback, useEffect, useRef, useState } from 'react'

// Event to notify all useSettings hooks to reload
const SETTINGS_CHANGED_EVENT = 'logo2openscad:settings-changed'

export type Settings = {
  hidePenUp: boolean
  penWidth: number
  indentSpaces: number
}

const DEFAULTS: Settings = {
  hidePenUp: false,
  penWidth: 2,
  indentSpaces: 4,
}

const STORAGE_KEY = 'logo2openscad:settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      hidePenUp: typeof parsed.hidePenUp === 'boolean' ? parsed.hidePenUp : DEFAULTS.hidePenUp,
      penWidth: typeof parsed.penWidth === 'number' && parsed.penWidth > 0 ? parsed.penWidth : DEFAULTS.penWidth,
      indentSpaces: typeof parsed.indentSpaces === 'number' && parsed.indentSpaces > 0 ? parsed.indentSpaces : DEFAULTS.indentSpaces,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    // Notify all useSettings hooks that settings have changed
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const isSavingRef = useRef(false)

  useEffect(() => {
    isSavingRef.current = true
    saveSettings(settings)
    // Reset flag after a short delay to allow event propagation
    setTimeout(() => {
      isSavingRef.current = false
    }, 10)
  }, [settings])

  // Listen for settings changes from other components
  useEffect(() => {
    const handleSettingsChanged = () => {
      // Don't reload if we're the one who just saved
      if (isSavingRef.current) return
      setSettingsState(loadSettings())
    }
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged)
  }, [])

  const setSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }))
  }, [])

  const reloadSettings = useCallback(() => {
    setSettingsState(loadSettings())
  }, [])

  return { settings, setSettings, reloadSettings, DEFAULTS }
}
