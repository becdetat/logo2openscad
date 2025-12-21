import { Box, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { alpha, useTheme } from "@mui/material/styles";
import type { ParseResult } from "../turtle/types";

export type LogoEditorProps = {
    source: string;
    parseResult: ParseResult;
    onSourceChange: (source: string) => void;
    onEditorMount: OnMount;
    onHelpOpen: () => void;
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
                    <Typography variant="subtitle1">Turtle Script</Typography>
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
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                >
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
                    <Typography variant="body2" color="text.secondary">
                        <a href="https://github.com/becdetat/turtle2openscad" target="_blank" rel="noopener noreferrer">Github</a> | <a href="https://becdetat.com" target="_blank" rel="noopener noreferrer">Made with AI by Rebecca Scott</a>
                    </Typography>
                </Stack>
            </Box>
        </Paper>
    );
}
