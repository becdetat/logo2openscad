import { useCallback, useEffect, useState } from 'react'

export type Settings = {
  hidePenUp: boolean
}

const DEFAULTS: Settings = {
  hidePenUp: false,
}

const STORAGE_KEY = 'logo2openscad:settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      hidePenUp: typeof parsed.hidePenUp === 'boolean' ? parsed.hidePenUp : DEFAULTS.hidePenUp,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const setSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }))
  }, [])

  const reloadSettings = useCallback(() => {
    setSettingsState(loadSettings())
  }, [])

  return { settings, setSettings, reloadSettings, DEFAULTS }
}
