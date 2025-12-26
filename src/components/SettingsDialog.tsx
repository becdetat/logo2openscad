import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Slider, Stack, TextField, Typography } from "@mui/material";
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useSettings } from "../hooks/useSettings";

export type SettingsDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
    const { settings, setSettings, DEFAULTS } = useSettings();

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="sm">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">Preview Pen Width (PD)</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                    size="small"
                                    onClick={() => setSettings({ penWidth: DEFAULTS.penWidth })}
                                    aria-label="Reset to default"
                                    disabled={settings.penWidth === DEFAULTS.penWidth}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                                <Slider
                                    value={settings.penWidth}
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    onChange={(_, v) => setSettings({ penWidth: Array.isArray(v) ? v[0] : v })}
                                    sx={{ width: 150 }}
                                />
                                <TextField
                                    type="number"
                                    value={settings.penWidth}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        if (Number.isFinite(val) && val > 0) {
                                            setSettings({ penWidth: val })
                                        }
                                    }}
                                    size="small"
                                    slotProps={{
                                        htmlInput: { min: 0.5, step: 0.5 }
                                    }}
                                    sx={{ width: 80 }}
                                />
                            </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Default: {DEFAULTS.penWidth}
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}