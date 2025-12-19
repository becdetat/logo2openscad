import { alpha, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, useTheme } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { helpContent } from "../helpContent";

export type HelpDialogProps = {
    open: boolean
    onClose: () => void
}

export function HelpDialog(props: HelpDialogProps) {
    const theme = useTheme()

    return (
        <Dialog 
            open={props.open} 
            onClose={props.onClose} 
            maxWidth="md" 
            fullWidth>
            <DialogTitle>Help</DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        '& h1': { fontSize: '2rem', mt: 2, mb: 1 },
                        '& h2': { fontSize: '1.5rem', mt: 3, mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
                        '& h3': { fontSize: '1.2rem', mt: 2, mb: 1 },
                        '& h4': { fontSize: '1rem', mt: 1.5, mb: 0.5, fontWeight: 600 },
                        '& p': { mb: 1 },
                        '& code': {
                        backgroundColor: alpha(theme.palette.text.primary, 0.05),
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.875em',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        },
                        '& pre': {
                        backgroundColor: alpha(theme.palette.text.primary, 0.05),
                        padding: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        mb: 2,
                        },
                        '& pre code': {
                        backgroundColor: 'transparent',
                        padding: 0,
                        },
                        '& ul, & ol': { pl: 3, mb: 1 },
                        '& li': { mb: 0.5 },
                        '& hr': { my: 2, borderColor: 'divider' },
                    }}
                >
                <ReactMarkdown>{helpContent}</ReactMarkdown>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}