import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from '../src/hooks/useWorkspace'

const WORKSPACE_KEY = 'logo2openscad:workspace'
const LEGACY_KEY = 'turtle2openscad:script'

describe('useWorkspace', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('should create default workspace with Untitled1 script', () => {
      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts[0].name).toBe('Untitled1')
      expect(result.current.workspace.activeScriptId).toBe(result.current.workspace.scripts[0].id)
      expect(result.current.activeScript).toBe(result.current.workspace.scripts[0])
    })

    it('should load existing workspace from localStorage', () => {
      const mockWorkspace = {
        scripts: [
          { id: 'test-id', name: 'Test Script', content: 'FD 100', createdAt: Date.now(), updatedAt: Date.now() }
        ],
        activeScriptId: 'test-id',
        version: 1,
      }
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(mockWorkspace))

      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts[0].name).toBe('Test Script')
      expect(result.current.workspace.scripts[0].content).toBe('FD 100')
    })

    it('should migrate from legacy storage', () => {
      const legacyContent = 'FD 50\nRT 90'
      localStorage.setItem(LEGACY_KEY, legacyContent)

      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts[0].name).toBe('Untitled1')
      expect(result.current.workspace.scripts[0].content).toBe(legacyContent)
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
      expect(localStorage.getItem(WORKSPACE_KEY)).toBeTruthy()
    })

    it('should ensure workspace has at least one script if loaded empty', () => {
      const emptyWorkspace = {
        scripts: [],
        activeScriptId: null,
        version: 1,
      }
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(emptyWorkspace))

      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts[0].name).toBe('Untitled1')
    })

    it('should fix invalid activeScriptId', () => {
      const mockWorkspace = {
        scripts: [
          { id: 'test-id', name: 'Test Script', content: '', createdAt: Date.now(), updatedAt: Date.now() }
        ],
        activeScriptId: 'invalid-id',
        version: 1,
      }
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(mockWorkspace))

      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.workspace.activeScriptId).toBe('test-id')
    })
  })

  describe('createScript', () => {
    it('should create script with provided name', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('My Drawing')
      })

      expect(result.current.workspace.scripts).toHaveLength(2)
      const newScript = result.current.workspace.scripts[1]
      expect(newScript.name).toBe('My Drawing')
      expect(newScript.id).toBeTruthy()
      expect(result.current.workspace.activeScriptId).toBe(newScript.id)
    })

    it('should auto-generate Untitled2 when no name provided', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript()
      })

      expect(result.current.workspace.scripts).toHaveLength(2)
      expect(result.current.workspace.scripts[1].name).toBe('Untitled2')
    })

    it('should generate Untitled4 when Untitled1 and Untitled3 exist', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Untitled3')
      })
      act(() => {
        result.current.createScript()
      })

      expect(result.current.workspace.scripts).toHaveLength(3)
      expect(result.current.workspace.scripts[2].name).toBe('Untitled4')
    })

    it('should trim whitespace from name', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('  Test Name  ')
      })

      expect(result.current.workspace.scripts[1].name).toBe('Test Name')
    })

    it('should throw error for duplicate names', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Duplicate')
      })

      expect(() => {
        act(() => {
          result.current.createScript('Duplicate')
        })
      }).toThrow('A script with this name already exists')
    })

    it('should switch to newly created script', () => {
      const { result } = renderHook(() => useWorkspace())
      const firstScriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.createScript('New Script')
      })

      expect(result.current.workspace.activeScriptId).not.toBe(firstScriptId)
      expect(result.current.activeScript.name).toBe('New Script')
    })
  })

  describe('deleteScript', () => {
    it('should delete script by id', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('To Delete')
      })
      const scriptToDelete = result.current.workspace.scripts[1]
      
      act(() => {
        result.current.deleteScript(scriptToDelete.id)
      })

      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts.find(s => s.id === scriptToDelete.id)).toBeUndefined()
    })

    it('should create new Untitled1 when deleting last script', () => {
      const { result } = renderHook(() => useWorkspace())
      const onlyScriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.deleteScript(onlyScriptId)
      })

      expect(result.current.workspace.scripts).toHaveLength(1)
      expect(result.current.workspace.scripts[0].name).toBe('Untitled1')
      expect(result.current.workspace.scripts[0].id).not.toBe(onlyScriptId)
    })

    it('should switch to first script when deleting active script', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Second')
      })
      const firstScriptId = result.current.workspace.scripts[0].id
      const secondScriptId = result.current.workspace.scripts[1].id
      
      // Delete the active script (Second)
      act(() => {
        result.current.deleteScript(secondScriptId)
      })

      expect(result.current.workspace.activeScriptId).toBe(firstScriptId)
    })

    it('should keep active script when deleting non-active script', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Second')
      })
      const firstScriptId = result.current.workspace.scripts[0].id
      const activeScriptId = result.current.workspace.activeScriptId
      
      // Delete the first script (not active)
      act(() => {
        result.current.deleteScript(firstScriptId)
      })

      expect(result.current.workspace.activeScriptId).toBe(activeScriptId)
    })
  })

  describe('renameScript', () => {
    it('should rename script', () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.renameScript(scriptId, 'New Name')
      })

      expect(result.current.workspace.scripts[0].name).toBe('New Name')
    })

    it('should trim whitespace from new name', () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.renameScript(scriptId, '  Trimmed Name  ')
      })

      expect(result.current.workspace.scripts[0].name).toBe('Trimmed Name')
    })

    it('should throw error for empty name', () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      
      expect(() => {
        act(() => {
          result.current.renameScript(scriptId, '   ')
        })
      }).toThrow('Script name cannot be empty')
    })

    it('should throw error for duplicate name', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Existing Name')
      })
      const scriptId = result.current.workspace.scripts[0].id
      
      expect(() => {
        act(() => {
          result.current.renameScript(scriptId, 'Existing Name')
        })
      }).toThrow('A script with this name already exists')
    })

    it('should allow renaming to same name (case-sensitive match)', () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      const originalName = result.current.workspace.scripts[0].name
      
      act(() => {
        result.current.renameScript(scriptId, originalName)
      })

      expect(result.current.workspace.scripts[0].name).toBe(originalName)
    })

    it('should update updatedAt timestamp', async () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      const originalUpdatedAt = result.current.workspace.scripts[0].updatedAt
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))
      
      act(() => {
        result.current.renameScript(scriptId, 'Updated Name')
      })

      expect(result.current.workspace.scripts[0].updatedAt).toBeGreaterThan(originalUpdatedAt)
    })
  })

  describe('selectScript', () => {
    it('should change active script', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Second')
      })
      const firstScriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.selectScript(firstScriptId)
      })

      expect(result.current.workspace.activeScriptId).toBe(firstScriptId)
      expect(result.current.activeScript.name).toBe('Untitled1')
    })
  })

  describe('updateScriptContent', () => {
    it('should update script content', () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.updateScriptContent(scriptId, 'FD 100\nRT 90')
      })

      expect(result.current.workspace.scripts[0].content).toBe('FD 100\nRT 90')
    })

    it('should update updatedAt timestamp', async () => {
      const { result } = renderHook(() => useWorkspace())
      const scriptId = result.current.workspace.scripts[0].id
      const originalUpdatedAt = result.current.workspace.scripts[0].updatedAt
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      act(() => {
        result.current.updateScriptContent(scriptId, 'FD 50')
      })

      expect(result.current.workspace.scripts[0].updatedAt).toBeGreaterThan(originalUpdatedAt)
    })

    it('should not affect other scripts', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Second')
      })
      const firstScriptId = result.current.workspace.scripts[0].id
      
      act(() => {
        result.current.updateScriptContent(firstScriptId, 'FD 100')
      })

      expect(result.current.workspace.scripts[0].content).toBe('FD 100')
      expect(result.current.workspace.scripts[1].content).toBe('')
    })
  })

  describe('persistence', () => {
    it('should save workspace to localStorage on changes', () => {
      const { result } = renderHook(() => useWorkspace())
      
      act(() => {
        result.current.createScript('Test Script')
      })

      const saved = localStorage.getItem(WORKSPACE_KEY)
      expect(saved).toBeTruthy()
      
      const parsed = JSON.parse(saved!)
      expect(parsed.scripts).toHaveLength(2)
      expect(parsed.scripts[1].name).toBe('Test Script')
    })

    it('should return null error on successful save', () => {
      const { result } = renderHook(() => useWorkspace())
      
      expect(result.current.error).toBeNull()
    })
  })
})
