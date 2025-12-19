import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import type { OnMount } from '@monaco-editor/react'
import { Box, Divider } from '@mui/material'
import { executeTurtle } from './turtle/interpreter'
import { generateOpenScad } from './turtle/openscad'
import { parseTurtle } from './turtle/parser'
import { defaultTurtleScript } from './turtle/sample'
import { useSettings } from './hooks/useSettings'
import { HelpDialog } from './components/HelpDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Preview } from './components/Preview'
import { OpenScadEditor } from './components/OpenScadEditor'
import { LogoEditor } from './components/LogoEditor'

const STORAGE_KEY = 'turtle2openscad:script'

export default function App() {
  const { settings, reloadSettings } = useSettings()
  const [source, setSource] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ?? defaultTurtleScript
    } catch {
      return defaultTurtleScript
    }
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [progress, setProgress] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [activeSegments, setActiveSegments] = useState<ReturnType<typeof executeTurtle>['segments']>([])
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)

  const parseResult = useMemo(() => parseTurtle(source), [source])
  const runResult = useMemo(
    () => executeTurtle(parseResult.commands, { arcPointsPer90Deg: settings.arcPointsPer90Deg }, parseResult.comments),
    [parseResult.commands, settings.arcPointsPer90Deg, parseResult.comments],
  )
  const openScad = useMemo(() => generateOpenScad(runResult.polygons), [runResult.polygons])

  useEffect(() => {
    runResultRef.current = runResult
  }, [runResult])

  // Save source to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, source)
    } catch {
      // ignore
    }
  }, [source])

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

  useEffect(() => {
    setIsPlaying(false)
  }, [source])

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

    monaco.editor.setModelMarkers(model, 'turtle', markers)

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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      setActiveSegments(runResultRef.current.segments)
      setProgress(0)
      lastTsRef.current = null
      setIsPlaying(true)
    })
  }

  const handleSettingsOpen = () => setSettingsOpen(true)
  
  const handleSettingsClose = () => {
    setSettingsOpen(false)
    // Reload settings from localStorage to pick up changes from dialog
    reloadSettings()
    // Update preview if it was already showing
    if (activeSegments.length > 0) {
      // Wait for next render cycle after settings reload
      setTimeout(() => {
        setActiveSegments(runResultRef.current.segments)
        setProgress(0)
        lastTsRef.current = null
        setIsPlaying(true)
      }, 0)
    }
  }
  
  const handleHelpOpen = () => setHelpOpen(true)
  const handleHelpClose = () => setHelpOpen(false)

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <LogoEditor
          source={source}
          parseResult={parseResult}
          onSourceChange={setSource}
          onEditorMount={onEditorMount}
          onHelpOpen={handleHelpOpen}
        />

        <Divider orientation="vertical" flexItem />

        <Preview
          isPlaying={isPlaying}
          speed={speed}
          progress={progress}
          activeSegments={activeSegments}
          hasSegments={runResult.segments.length > 0}
          onPlay={handlePlay}
          onPause={handlePause}
          onSpeedChange={setSpeed}
        />

        <Divider orientation="vertical" flexItem />
        <OpenScadEditor 
          openScad={openScad} 
          handleSettingsOpen={handleSettingsOpen}
        />
      </Box>

      <SettingsDialog open={settingsOpen} onClose={handleSettingsClose} />
      <HelpDialog open={helpOpen} onClose={handleHelpClose} />
    </Box>
  )
}
