import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Slider, Stack, TextField, Typography } from "@mui/material";
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useEffect, useState } from "react";
import { useSettings, type Settings } from "../hooks/useSettings";

export type SettingsDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
    const { settings, setSettings, DEFAULTS } = useSettings();
    const [localSettings, setLocalSettings] = useState<Settings>(settings);

    // Update local settings when dialog opens or settings change externally
    useEffect(() => {
        if (props.open) {
            setLocalSettings(settings);
        }
    }, [props.open, settings]);

    // Only save settings when dialog is closed
    const handleClose = () => {
        setSettings(localSettings);
        props.onClose();
    };

    return (
        <Dialog open={props.open} onClose={handleClose} maxWidth="sm">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">Preview Pen Width (PD)</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                    size="small"
                                    onClick={() => setLocalSettings({ ...localSettings, penWidth: DEFAULTS.penWidth })}
                                    aria-label="Reset to default"
                                    disabled={localSettings.penWidth === DEFAULTS.penWidth}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                                <Slider
                                    value={localSettings.penWidth}
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    onChange={(_, v) => setLocalSettings({ ...localSettings, penWidth: Array.isArray(v) ? v[0] : v })}
                                    sx={{ width: 150 }}
                                />
                                <TextField
                                    type="number"
                                    value={localSettings.penWidth}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        if (Number.isFinite(val) && val > 0) {
                                            setLocalSettings({ ...localSettings, penWidth: val })
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

                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">OpenSCAD Indent Spaces</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                    size="small"
                                    onClick={() => setLocalSettings({ ...localSettings, indentSpaces: DEFAULTS.indentSpaces })}
                                    aria-label="Reset to default"
                                    disabled={localSettings.indentSpaces === DEFAULTS.indentSpaces}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                                <Slider
                                    value={localSettings.indentSpaces}
                                    min={1}
                                    max={8}
                                    step={1}
                                    onChange={(_, v) => setLocalSettings({ ...localSettings, indentSpaces: Array.isArray(v) ? v[0] : v })}
                                    sx={{ width: 150 }}
                                    marks
                                />
                                <TextField
                                    type="number"
                                    value={localSettings.indentSpaces}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        if (Number.isFinite(val) && val >= 1 && val <= 8) {
                                            setLocalSettings({ ...localSettings, indentSpaces: val })
                                        }
                                    }}
                                    size="small"
                                    slotProps={{
                                        htmlInput: { min: 1, max: 8, step: 1 }
                                    }}
                                    sx={{ width: 80 }}
                                />
                            </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Default: {DEFAULTS.indentSpaces}
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}