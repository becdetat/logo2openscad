import { Box, Button, Checkbox, Divider, FormControlLabel, Paper, Slider, Stack, Typography } from "@mui/material";
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useEffect, useRef } from "react";
import { useSettings } from "../hooks/useSettings";
import type { LogoSegment, Marker } from "../logo/types";
import { alpha, useTheme } from "@mui/material/styles";
import { drawPreview } from "../logo/drawPreview";
import { clamp } from "../helpers/clamp";

export type PreviewProps = {
    isPlaying: boolean;
    speed: number;
    progress: number;
    activeSegments: LogoSegment[];
    markers: Marker[];
    hasSegments: boolean;
    onPlay: () => void;
    onPause: () => void;
    onSpeedChange: (speed: number) => void;
}

export function Preview(props: PreviewProps) {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { settings, setSettings } = useSettings();

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
            props.activeSegments,
            clamp(props.progress, 0, props.activeSegments.length),
            {
                penDown: theme.palette.primary.main,
                penUp: theme.palette.text.secondary,
                axis: alpha(theme.palette.text.secondary, 0.4),
            },
            settings.hidePenUp,
            settings.penWidth * dpr,
            dpr,
            props.markers,
        )
    }, [props.progress, props.activeSegments, props.markers, theme.palette.primary.main, theme.palette.text.secondary, settings.hidePenUp, settings.penWidth]);

    return (
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">Preview</Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={settings.hidePenUp}
                                    onChange={(e) => setSettings({ hidePenUp: e.target.checked })}
                                    size="small"
                                />
                            }
                            label="Hide PU"
                            sx={{ ml: 1 }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={props.onPlay}
                            disabled={props.isPlaying || !props.hasSegments}
                        >
                            Play
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PauseIcon />}
                            onClick={props.onPause}
                            disabled={!props.isPlaying}
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
                        value={props.speed}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(_, v) => props.onSpeedChange(Array.isArray(v) ? v[0] : v)}
                        sx={{ flex: 1 }}
                    />
                    <Typography variant="body2" sx={{ width: 44, textAlign: 'right' }}>
                        {props.speed}
                    </Typography>
                </Stack>
            </Box>
            <Divider />
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <Box component="canvas" ref={canvasRef} sx={{ width: '100%', height: '100%', display: 'block' }} />
            </Box>
        </Paper>
    );
}
