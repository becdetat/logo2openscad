import { useCallback, useEffect, useState } from 'react'
import type { LogoScript, Workspace } from '../types/workspace'
import { defaultLogoScript } from '../logo/sample'

const WORKSPACE_KEY = 'logo2openscad:workspace'
const LEGACY_KEY = 'turtle2openscad:script'

function createEmptyScript(name: string = 'Untitled1', useDefaultContent: boolean = false): LogoScript {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    content: useDefaultContent ? defaultLogoScript : '',
    createdAt: now,
    updatedAt: now,
  }
}

function createDefaultWorkspace(): Workspace {
  const script = createEmptyScript('Untitled1')
  script.content = defaultLogoScript
  return {
    scripts: [script],
    activeScriptId: script.id,
    version: 1,
  }
}

function migrateFromLegacy(): Workspace | null {
  try {
    const legacyContent = localStorage.getItem(LEGACY_KEY)
    if (!legacyContent) return null

    const script = createEmptyScript('Untitled1')
    script.content = legacyContent

    const workspace: Workspace = {
      scripts: [script],
      activeScriptId: script.id,
      version: 1,
    }

    // Save migrated workspace
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
    
    // Delete legacy key
    localStorage.removeItem(LEGACY_KEY)

    return workspace
  } catch {
    return null
  }
}

function loadWorkspace(): Workspace {
  try {
    // Check for existing workspace
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (raw) {
      const workspace = JSON.parse(raw) as Workspace
      // Ensure workspace has at least one script
      if (workspace.scripts.length === 0) {
        workspace.scripts.push(createEmptyScript('Untitled1'))
        workspace.activeScriptId = workspace.scripts[0].id
      }
      // Ensure activeScriptId is valid
      if (!workspace.activeScriptId || !workspace.scripts.find(s => s.id === workspace.activeScriptId)) {
        workspace.activeScriptId = workspace.scripts[0].id
      }
      return workspace
    }

    // Try migration from legacy storage
    const migrated = migrateFromLegacy()
    if (migrated) return migrated

    // Create new workspace
    return createDefaultWorkspace()
  } catch {
    return createDefaultWorkspace()
  }
}

function saveWorkspace(workspace: Workspace): string | null {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
    return null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return 'Storage quota exceeded. Please delete some scripts to free up space.'
    }
    return 'Failed to save workspace. Your changes may not be preserved.'
  }
}

export function generateUntitledName(existingNames: string[]): string {
  const untitledPattern = /^Untitled(\d+)$/
  let maxNumber = 0

  for (const name of existingNames) {
    const match = name.match(untitledPattern)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  }

  return `Untitled${maxNumber + 1}`
}

function isNameUnique(name: string, scripts: LogoScript[], excludeId?: string): boolean {
  return !scripts.some(s => s.name === name && s.id !== excludeId)
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace)
  const [error, setError] = useState<string | null>(null)

  // Save workspace to localStorage whenever it changes
  useEffect(() => {
    const saveError = saveWorkspace(workspace)
    setError(saveError)
  }, [workspace])

  const activeScript = workspace.scripts.find(s => s.id === workspace.activeScriptId) || workspace.scripts[0]

  const createScript = useCallback((name?: string) => {
    setWorkspace(prev => {
      const trimmedName = name?.trim()
      let scriptName: string

      if (!trimmedName) {
        // Generate auto-numbered name
        scriptName = generateUntitledName(prev.scripts.map(s => s.name))
      } else {
        // Validate uniqueness
        if (!isNameUnique(trimmedName, prev.scripts)) {
          throw new Error('A script with this name already exists')
        }
        scriptName = trimmedName
      }

      const newScript = createEmptyScript(scriptName, true)
      return {
        ...prev,
        scripts: [...prev.scripts, newScript],
        activeScriptId: newScript.id,
      }
    })
  }, [])

  const deleteScript = useCallback((scriptId: string) => {
    setWorkspace(prev => {
      const filteredScripts = prev.scripts.filter(s => s.id !== scriptId)
      
      // If deleting the last script, create a new one
      if (filteredScripts.length === 0) {
        const newScript = createEmptyScript('Untitled1')
        return {
          ...prev,
          scripts: [newScript],
          activeScriptId: newScript.id,
        }
      }

      // If we deleted the active script, switch to the first one
      const newActiveId = prev.activeScriptId === scriptId 
        ? filteredScripts[0].id 
        : prev.activeScriptId

      return {
        ...prev,
        scripts: filteredScripts,
        activeScriptId: newActiveId,
      }
    })
  }, [])

  const renameScript = useCallback((scriptId: string, newName: string) => {
    const trimmedName = newName.trim()
    
    if (!trimmedName) {
      throw new Error('Script name cannot be empty')
    }

    setWorkspace(prev => {
      if (!isNameUnique(trimmedName, prev.scripts, scriptId)) {
        throw new Error('A script with this name already exists')
      }

      return {
        ...prev,
        scripts: prev.scripts.map(s =>
          s.id === scriptId
            ? { ...s, name: trimmedName, updatedAt: Date.now() }
            : s
        ),
      }
    })
  }, [])

  const selectScript = useCallback((scriptId: string) => {
    setWorkspace(prev => ({
      ...prev,
      activeScriptId: scriptId,
    }))
  }, [])

  const updateScriptContent = useCallback((scriptId: string, content: string) => {
    setWorkspace(prev => ({
      ...prev,
      scripts: prev.scripts.map(s =>
        s.id === scriptId
          ? { ...s, content, updatedAt: Date.now() }
          : s
      ),
    }))
  }, [])

  return {
    workspace,
    activeScript,
    error,
    createScript,
    deleteScript,
    renameScript,
    selectScript,
    updateScriptContent,
  }
}
