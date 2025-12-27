import { Box, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { alpha, useTheme } from "@mui/material/styles";
import type { ParseResult } from "../logo/types";
import { Edit } from "@mui/icons-material";

export type LogoEditorProps = {
    scriptName: string;
    source: string;
    parseResult: ParseResult;
    onSourceChange: (source: string) => void;
    onEditorMount: OnMount;
    onHelpOpen: () => void;
    onRenameScriptClicked: () => void;
}

export function LogoEditor(props: LogoEditorProps) {
    const theme = useTheme();

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
                    <IconButton aria-label="Help" onClick={props.onHelpOpen} size="small">
                        <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>
            <Divider />
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    defaultLanguage="plaintext"
                    value={props.source}
                    onChange={(v) => props.onSourceChange(v ?? '')}
                    onMount={props.onEditorMount}
                    theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
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
