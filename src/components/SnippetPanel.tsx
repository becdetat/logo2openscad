import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Divider, List, ListItemButton, ListItemText, Popover, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { parseLogo } from '../logo/parser'
import { executeLogo } from '../logo/interpreter'
import { drawPreviewSvg } from '../logo/drawPreviewSvg'
import { BUILT_IN_SNIPPETS } from '../logo/snippets'

export type SnippetPanelProps = {
    anchorEl: HTMLElement | null
    open: boolean
    onClose: () => void
    onInsert: (code: string) => void
    isDarkMode: boolean
}

export function SnippetPanel({ anchorEl, open, onClose, onInsert, isDarkMode }: SnippetPanelProps) {
    const theme = useTheme()
    const [selectedId, setSelectedId] = useState(BUILT_IN_SNIPPETS[0].id)
    const listRef = useRef<HTMLUListElement>(null)

    useEffect(() => {
        if (open) {
            setSelectedId(BUILT_IN_SNIPPETS[0].id)
            setTimeout(() => listRef.current?.focus(), 0)
        }
    }, [open])

    const thumbnails = useMemo(() => {
        const map = new Map<string, string>()
        for (const snippet of BUILT_IN_SNIPPETS) {
            try {
                const parseResult = parseLogo(snippet.code)
                if (parseResult.diagnostics.length > 0) continue
                const runResult = executeLogo(parseResult.commands, parseResult.comments)
                if (runResult.segments.length === 0) continue
                const svgStr = drawPreviewSvg(
                    runResult.segments,
                    runResult.segments.length,
                    {
                        penDown: theme.palette.primary.main,
                        penUp: alpha(theme.palette.text.secondary, 0.5),
                        axis: alpha(theme.palette.text.secondary, 0.15),
                    },
                    false,
                    1.5,
                    [],
                    120,
                    120,
                )
                map.set(snippet.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`)
            } catch {
                // skip — failed thumbnail shows "No preview"
            }
        }
        return map
    }, [theme.palette.primary.main, theme.palette.text.secondary])

    const selectedSnippet = BUILT_IN_SNIPPETS.find(s => s.id === selectedId) ?? BUILT_IN_SNIPPETS[0]
    const thumbnailSrc = thumbnails.get(selectedId)

    const handleInsert = () => {
        onInsert(selectedSnippet.code)
        onClose()
    }

    const handleListKeyDown = (event: React.KeyboardEvent) => {
        const idx = BUILT_IN_SNIPPETS.findIndex(s => s.id === selectedId)
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (idx < BUILT_IN_SNIPPETS.length - 1) setSelectedId(BUILT_IN_SNIPPETS[idx + 1].id)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (idx > 0) setSelectedId(BUILT_IN_SNIPPETS[idx - 1].id)
        } else if (event.key === 'Enter') {
            handleInsert()
        }
    }

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{ sx: { width: 580, height: 420, display: 'flex', flexDirection: 'column' } }}
        >
            <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1">Snippets</Typography>
            </Box>
            <Divider />

            <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                {/* Left: snippet list */}
                <Box sx={{ width: 160, borderRight: 1, borderColor: 'divider', overflow: 'auto', flexShrink: 0 }}>
                    <List
                        ref={listRef}
                        dense
                        tabIndex={0}
                        onKeyDown={handleListKeyDown}
                        sx={{ py: 0, outline: 'none' }}
                    >
                        {BUILT_IN_SNIPPETS.map(s => (
                            <ListItemButton
                                key={s.id}
                                selected={selectedId === s.id}
                                onClick={() => setSelectedId(s.id)}
                                onDoubleClick={() => { onInsert(s.code); onClose() }}
                                sx={{ py: 0.75 }}
                            >
                                <ListItemText
                                    primary={s.name}
                                    slotProps={{ primary: { variant: 'body2', noWrap: true } }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>

                {/* Right: thumbnail + code */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    {/* Thumbnail */}
                    <Box sx={{
                        height: 140,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: 1,
                        borderColor: 'divider',
                        backgroundColor: isDarkMode ? '#1a1a2e' : '#f8f8f8',
                    }}>
                        {thumbnailSrc
                            ? <img src={thumbnailSrc} width={120} height={120} alt={selectedSnippet.name} />
                            : <Typography variant="caption" color="text.secondary">No preview</Typography>
                        }
                    </Box>

                    {/* Code */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                        <pre style={{
                            margin: 0,
                            padding: 8,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                            color: isDarkMode ? '#d4d4d4' : '#333333',
                            borderRadius: 4,
                        }}>
                            {selectedSnippet.code}
                        </pre>
                    </Box>
                </Box>
            </Box>

            <Divider />
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" size="small" onClick={handleInsert}>
                    Insert
                </Button>
            </Box>
        </Popover>
    )
}
