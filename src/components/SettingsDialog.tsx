import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

export type SettingsDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="sm">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        No settings are currently available. Arc resolution is now controlled by the EXTSETFN command within scripts.
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}