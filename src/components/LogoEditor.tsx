import { useState } from "react";
import { Box, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import StyleIcon from '@mui/icons-material/Style'
import Editor from '@monaco-editor/react'
import type { BeforeMount, OnMount } from '@monaco-editor/react'
import { alpha, useTheme } from "@mui/material/styles";
import type { ParseResult } from "../logo/types";
import { Edit } from "@mui/icons-material";
import { SnippetPanel } from "./SnippetPanel";

export type LogoEditorProps = {
    scriptName: string;
    source: string;
    parseResult: ParseResult;
    onSourceChange: (source: string) => void;
    onEditorBeforeMount: BeforeMount;
    onEditorMount: OnMount;
    onHelpOpen: () => void;
    onRenameScriptClicked: () => void;
    onInsertSnippet: (code: string) => void;
    isDarkMode: boolean;
}

export function LogoEditor(props: LogoEditorProps) {
    const theme = useTheme();
    const [snippetAnchorEl, setSnippetAnchorEl] = useState<HTMLElement | null>(null);

    return (
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
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1">
                        {props.scriptName}
                        <IconButton 
                            aria-label="Rename" 
                            onClick={props.onRenameScriptClicked} 
                            size="small"
                            sx={{ ml: 1 }}                           
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                    </Typography>
                    <small><kbd>Ctrl</kbd>+<kbd>Enter</kbd> or <kbd>Ctrl</kbd>+<kbd>S</kbd> to preview</small>
                    <IconButton
                        aria-label="Snippets"
                        onClick={(e) => setSnippetAnchorEl(e.currentTarget)}
                        size="small"
                    >
                        <StyleIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Help" onClick={props.onHelpOpen} size="small">
                        <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>
            <SnippetPanel
                anchorEl={snippetAnchorEl}
                open={Boolean(snippetAnchorEl)}
                onClose={() => setSnippetAnchorEl(null)}
                onInsert={props.onInsertSnippet}
                isDarkMode={props.isDarkMode}
            />
            <Divider />
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    language="logo"
                    value={props.source}
                    onChange={(v) => props.onSourceChange(v ?? '')}
                    beforeMount={props.onEditorBeforeMount}
                    onMount={props.onEditorMount}
                    theme={theme.palette.mode === 'dark' ? 'logo-dark' : 'logo-light'}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                    }}
                />
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1, maxHeight: 140, overflow: 'auto' }}>
                {props.parseResult.diagnostics.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No errors
                    </Typography>
                ) : (
                    <Stack spacing={0.5}>
                        {props.parseResult.diagnostics.slice(0, 50).map((d, idx) => (
                            <Typography key={idx} variant="body2" color="error">
                                L{d.range.startLine}: {d.message}
                            </Typography>
                        ))}
                    </Stack>
                )}
            </Box>
        </Paper>
    );
}
