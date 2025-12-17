import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SettingsIcon from '@mui/icons-material/Settings'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import { executeTurtle } from './turtle/interpreter'
import { generateOpenScad } from './turtle/openscad'
import { parseTurtle } from './turtle/parser'
import { defaultTurtleScript } from './turtle/sample'
import { clamp } from './helpers/clamp'
import { drawPreview } from './turtle/drawPreview'
import { useSettings } from './hooks/useSettings'

export default function App() {
  const theme = useTheme()
  const { settings, setSettings, resetArcPoints, DEFAULTS } = useSettings()

  const [source, setSource] = useState(defaultTurtleScript)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [progress, setProgress] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeSegments, setActiveSegments] = useState<ReturnType<typeof executeTurtle>['segments']>([])

  const parseResult = useMemo(() => parseTurtle(source), [source])
  const runResult = useMemo(
    () => executeTurtle(parseResult.commands, { arcPointsPer90Deg: settings.arcPointsPer90Deg }, parseResult.comments),
    [parseResult.commands, settings.arcPointsPer90Deg, parseResult.comments],
  )
  const openScad = useMemo(() => generateOpenScad(runResult.polygons), [runResult.polygons])

  useEffect(() => {
    runResultRef.current = runResult
  }, [runResult])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const nextW = Math.max(1, Math.floor(rect.width * dpr))
    const nextH = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW
      canvas.height = nextH
    }

    drawPreview(
      ctx,
      canvas,
      activeSegments,
      clamp(progress, 0, activeSegments.length),
      {
        penDown: theme.palette.primary.main,
        penUp: theme.palette.text.secondary,
        axis: alpha(theme.palette.text.secondary, 0.4),
      },
    )
  }, [progress, activeSegments, theme.palette.primary.main, theme.palette.text.secondary])

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

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(openScad)
    } catch {
      // ignore
    }
  }

  const handleSettingsOpen = () => setSettingsOpen(true)
  const handleSettingsClose = () => setSettingsOpen(false)

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            ['--t2os-error-line-bg' as any]: alpha(theme.palette.error.main, 0.12),
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1">Turtle Script</Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              value={source}
              onChange={(v) => setSource(v ?? '')}
              onMount={onEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1, maxHeight: 140, overflow: 'auto' }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              {parseResult.diagnostics.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No errors
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {parseResult.diagnostics.slice(0, 50).map((d, idx) => (
                    <Typography key={idx} variant="body2" color="error">
                      L{d.range.startLine}: {d.message}
                    </Typography>
                  ))}
                </Stack>
              )}
              <Typography variant="body2" color="text.secondary">
                <a href="https://github.com/becdetat/turtle2openscad" target="_blank" rel="noopener noreferrer">Github</a> | <a href="https://becdetat.com" target="_blank" rel="noopener noreferrer">Made with AI by Rebecca Scott</a>
              </Typography>
            </Stack>
          </Box>
        </Paper>

        <Divider orientation="vertical" flexItem />

        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">Preview</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePlay}
                  disabled={isPlaying || runResult.segments.length === 0}
                >
                  Play
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={handlePause}
                  disabled={!isPlaying}
                >
                  Pause
                </Button>
              </Stack>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                Speed (segments/sec)
              </Typography>
              <Slider
                value={speed}
                min={1}
                max={20}
                step={1}
                onChange={(_, v) => setSpeed(Array.isArray(v) ? v[0] : v)}
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ width: 44, textAlign: 'right' }}>
                {speed}
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Box component="canvas" ref={canvasRef} sx={{ width: '100%', height: '100%', display: 'block' }} />
          </Box>
        </Paper>

        <Divider orientation="vertical" flexItem />

        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">OpenSCAD</Typography>
              <Stack direction="row" spacing={1}>
                <IconButton aria-label="Settings" onClick={handleSettingsOpen} size="small">
                  <SettingsIcon fontSize="small" />
                </IconButton>
                <IconButton aria-label="Copy OpenSCAD" onClick={onCopy} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              value={openScad}
              language="plaintext"
              theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                lineNumbers: 'on',
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                folding: false,
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Dialog open={settingsOpen} onClose={handleSettingsClose} maxWidth="sm">
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Points per 90° of arc</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={resetArcPoints}
                    aria-label="Reset to default"
                    disabled={settings.arcPointsPer90Deg === DEFAULTS.arcPointsPer90Deg}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    type="number"
                    value={settings.arcPointsPer90Deg}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (Number.isFinite(val) && val > 0) {
                        setSettings({ arcPointsPer90Deg: val })
                      }
                    }}
                    size="small"
                    inputProps={{ min: 1, step: 1 }}
                    sx={{ width: 120 }}
                  />
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Default: {DEFAULTS.arcPointsPer90Deg}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
