import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import type { OnMount } from '@monaco-editor/react'
import { Box, Divider, Typography } from '@mui/material'
import { executeLogo } from './logo/interpreter'
import { generateOpenScad } from './logo/openscad'
import { parseLogo } from './logo/parser'
import { useSettings } from './hooks/useSettings'
import { useWorkspace, generateUntitledName } from './hooks/useWorkspace'
import { useSidebarCollapsed } from './hooks/useSidebarCollapsed'
import { HelpDialog } from './components/HelpDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { ScriptDialog } from './components/ScriptDialog'
import { DeleteScriptDialog } from './components/DeleteScriptDialog'
import { ErrorSnackbar } from './components/ErrorSnackbar'
import { WorkspaceSidebar } from './components/WorkspaceSidebar'
import { Preview } from './components/Preview'
import { OpenScadEditor } from './components/OpenScadEditor'
import { LogoEditor } from './components/LogoEditor'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

export type AppProps = {
  toggleDarkMode: () => void
  isDarkMode: boolean
}

export default function App(props: AppProps) {
  const { reloadSettings } = useSettings()
  const { workspace, activeScript, error: workspaceError, createScript, deleteScript, renameScript, selectScript, updateScriptContent } = useWorkspace()
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed()
  const { settings } = useSettings()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [progress, setProgress] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [activeSegments, setActiveSegments] = useState<ReturnType<typeof executeLogo>['segments']>([])
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [defaultNewScriptName, setDefaultNewScriptName] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scriptToRename, setScriptToRename] = useState<string | null>(null)
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null)
  
  const source = activeScript.content

  const parseResult = useMemo(() => parseLogo(source), [source])
  const runResult = useMemo(() => {
    try {
      return executeLogo(parseResult.commands, parseResult.comments)
    } catch (error) {
      // Add runtime error to diagnostics
      const errorMessage = error instanceof Error ? error.message : String(error)
      parseResult.diagnostics.push({
        message: `Runtime error: ${errorMessage}`,
        range: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
      })
      // Return empty result
      return { segments: [], polygons: [], markers: [] }
    }
  }, [parseResult])
  const openScad = useMemo(() => generateOpenScad(runResult.polygons, settings.indentSpaces, settings.optimizeCircles), [runResult.polygons, settings.indentSpaces, settings.optimizeCircles])

  useEffect(() => {
    runResultRef.current = runResult
  }, [runResult])

  // Update document title with script name
  useEffect(() => {
    document.title = `${activeScript.name} - Logo2OpenSCAD`
  }, [activeScript.name])

  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const monacoRef = useRef<typeof Monaco | null>(null)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])
  const runResultRef = useRef(runResult)

  const handlePlay = () => {
    setActiveSegments(runResult.segments)
    setProgress(0)
    lastTsRef.current = null
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  // Helper function to start preview with the latest segments from ref
  const startPreviewFromRef = () => {
    setActiveSegments(runResultRef.current.segments)
    setProgress(0)
    lastTsRef.current = null
    setIsPlaying(true)
  }

  // Auto-play preview when switching scripts
  useEffect(() => {
    if (runResult.segments.length > 0) {
      setActiveSegments(runResult.segments)
      setProgress(0)
      lastTsRef.current = null
      setIsPlaying(true)
    } else {
      setIsPlaying(false)
    }
  }, [activeScript.id])

  // Auto-play when runResult first has segments
  useEffect(() => {
    if (!hasAutoPlayed && runResult.segments.length > 0) {
      setHasAutoPlayed(true)
      handlePlay()
    }
  }, [hasAutoPlayed, runResult.segments, handlePlay])

  useEffect(() => {
    const segments = activeSegments
    const total = segments.length
    if (!isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      return
    }

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      setProgress((p) => {
        let next = p + dt * speed
        if (next >= total) {
          setIsPlaying(false)
          return total
        }

        // Skip ahead to show entire arc groups at once
        const currentIndex = Math.floor(next)
        if (currentIndex < segments.length && segments[currentIndex].arcGroup !== undefined) {
          const arcGroup = segments[currentIndex].arcGroup
          let lastArcIndex = currentIndex
          while (lastArcIndex < segments.length && segments[lastArcIndex].arcGroup === arcGroup) {
            lastArcIndex++
          }
          next = Math.max(next, lastArcIndex)
        }

        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, activeSegments, speed])

  useEffect(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) return
    const model = editor.getModel()
    if (!model) return

    const markers: Monaco.editor.IMarkerData[] = parseResult.diagnostics.map((d) => ({
      severity: monaco.MarkerSeverity.Error,
      message: d.message,
      startLineNumber: d.range.startLine,
      startColumn: d.range.startColumn,
      endLineNumber: d.range.endLine,
      endColumn: d.range.endColumn,
    }))

    monaco.editor.setModelMarkers(model, 'logo', markers)

    const errorLines = Array.from(new Set(parseResult.diagnostics.map((d) => d.range.startLine)))
    const decorations = errorLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 't2osLineError',
      },
    }))

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations)
  }, [parseResult.diagnostics])

  const onEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Add Ctrl+Enter keyboard shortcut to run preview
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, startPreviewFromRef)

    // Add Ctrl+S keyboard shortcut to run preview (same as Ctrl+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, startPreviewFromRef)
  }

  const handleSettingsOpen = () => setSettingsOpen(true)
  
  const handleSettingsClose = () => {
    setSettingsOpen(false)
    // Reload settings from localStorage to pick up changes from dialog
    reloadSettings()
    // Update preview if it was already showing
    if (activeSegments.length > 0) {
      // Wait for next render cycle after settings reload
      setTimeout(startPreviewFromRef, 0)
    }
  }
  
  const handleHelpOpen = () => setHelpOpen(true)
  const handleHelpClose = () => setHelpOpen(false)
  
  // Workspace handlers
  const handleSourceChange = (newSource: string) => {
    updateScriptContent(activeScript.id, newSource)
  }
  
  const handleCreateScript = () => {
    const defaultName = generateUntitledName(workspace.scripts.map(s => s.name))
    setDefaultNewScriptName(defaultName)
    setCreateDialogOpen(true)
  }
  
  const handleCreateConfirm = (name: string) => {
    createScript(name)
    if (!collapsed) {
      toggleSidebar() // Close sidebar after creating script
    }
  }
  
  const handleRenameScript = (scriptId: string) => {
    setScriptToRename(scriptId)
    setRenameDialogOpen(true)
  }
  
  const handleRenameConfirm = (newName: string) => {
    if (scriptToRename) {
      renameScript(scriptToRename, newName)
    }
  }
  
  const handleDeleteScript = (scriptId: string) => {
    setScriptToDelete(scriptId)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteConfirm = () => {
    if (scriptToDelete) {
      deleteScript(scriptToDelete)
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Collapsed sidebar column */}
        {collapsed && (
          <Box
            onClick={toggleSidebar}
            sx={{
              width: 32,
              flexShrink: 0,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 2,
              transition: (theme) =>
                theme.transitions.create(['background-color', 'width'], {
                  duration: theme.transitions.duration.short,
                }),
              '&:hover': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                width: 40,
              },
            }}
          >
            <Typography
              variant="button"
              sx={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                userSelect: 'none',
                letterSpacing: '0.1em',
                fontWeight: 500,
                transform: 'rotate(180deg)',
              }}
            >
              <span style={{ paddingLeft: 10 }}>Workspace</span>
              <ChevronLeftIcon />
            </Typography>
          </Box>
        )}

        <WorkspaceSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
          scripts={workspace.scripts}
          activeScriptId={workspace.activeScriptId}
          onSelectScript={selectScript}
          onCreateScript={handleCreateScript}
          onRenameScript={handleRenameScript}
          onDeleteScript={handleDeleteScript}
        />
        
        <LogoEditor
          scriptName={activeScript.name}
          source={source}
          parseResult={parseResult}
          onSourceChange={handleSourceChange}
          onEditorMount={onEditorMount}
          onHelpOpen={handleHelpOpen}
          onRenameScriptClicked={() => handleRenameScript(activeScript.id)}
        />

        <Divider orientation="vertical" flexItem />

        <Preview
          isPlaying={isPlaying}
          speed={speed}
          progress={progress}
          activeSegments={activeSegments}
          markers={runResult.markers}
          hasSegments={runResult.segments.length > 0}
          onPlay={handlePlay}
          onPause={handlePause}
          onSpeedChange={setSpeed}
        />

        <Divider orientation="vertical" flexItem />
        <OpenScadEditor 
          openScad={openScad} 
          handleSettingsOpen={handleSettingsOpen}
          toggleDarkMode={props.toggleDarkMode}
          isDarkMode={props.isDarkMode}
        />
      </Box>

      <SettingsDialog open={settingsOpen} onClose={handleSettingsClose} />
      <HelpDialog open={helpOpen} onClose={handleHelpClose} />
      
      <ScriptDialog
        open={createDialogOpen}
        title="Create New Script"
        initialValue={defaultNewScriptName}
        onClose={() => setCreateDialogOpen(false)}
        onConfirm={handleCreateConfirm}
      />
      
      <ScriptDialog
        open={renameDialogOpen}
        title="Rename Script"
        initialValue={scriptToRename ? workspace.scripts.find(s => s.id === scriptToRename)?.name : ''}
        onClose={() => {
          setRenameDialogOpen(false)
          setScriptToRename(null)
        }}
        onConfirm={handleRenameConfirm}
      />
      
      <DeleteScriptDialog
        open={deleteDialogOpen}
        scriptName={scriptToDelete ? workspace.scripts.find(s => s.id === scriptToDelete)?.name ?? '' : ''}
        onClose={() => {
          setDeleteDialogOpen(false)
          setScriptToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
      
      <ErrorSnackbar
        message={workspaceError}
        onClose={() => {}}
      />
    </Box>
  )
}
