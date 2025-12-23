import { Box, Divider, IconButton, Paper, Stack, Typography, useTheme } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SettingsIcon from '@mui/icons-material/Settings'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { Editor } from "@monaco-editor/react";

export type OpenScadEditorProps = {
    openScad: string;
    handleSettingsOpen: () => void;
    toggleDarkMode: () => void;
    isDarkMode: boolean;
}

export function OpenScadEditor(props: OpenScadEditorProps) {
    const theme = useTheme();
  
    async function onCopy() {
        try {
            await navigator.clipboard.writeText(props.openScad)
        } catch {
            // ignore
        }
    }
  
    return (
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1">OpenSCAD</Typography>
                    <Stack direction="row" spacing={1}>
                        <IconButton aria-label="Toggle dark mode" onClick={props.toggleDarkMode} size="small">
                            {props.isDarkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                        </IconButton>
                        <IconButton aria-label="Settings" onClick={props.handleSettingsOpen} size="small">
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
                    value={props.openScad}
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
            <Divider />
            <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    <a href="https://github.com/becdetat/turtle2openscad" target="_blank" rel="noopener noreferrer">GitHub</a> | <a href="https://becdetat.com" target="_blank" rel="noopener noreferrer">Made with AI by Rebecca Scott</a> | {__APP_VERSION__}
                </Typography>
            </Box>
        </Paper>
    );
}