import { Box, Button, Checkbox, Divider, FormControlLabel, Paper, Slider, Stack, Typography } from "@mui/material";
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useEffect, useRef, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import type { LogoSegment, Marker } from "../logo/types";
import { alpha, useTheme } from "@mui/material/styles";
import { createPreviewLayout, drawPreview, getRenderablePreviewSegments } from "../logo/drawPreview";
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
    onSegmentClick?: (lineNumber: number) => void;
}

export function Preview(props: PreviewProps) {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { settings, setSettings } = useSettings();
    const [hoveredSegment, setHoveredSegment] = useState<{ line: number; length: number; x: number; y: number } | null>(null);

    const findHoveredSegment = (canvasX: number, canvasY: number, displayX: number, displayY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || props.activeSegments.length === 0) return null;

        const layout = createPreviewLayout(canvas, props.activeSegments);
        if (!layout) return null;

        const visibleSegments = getRenderablePreviewSegments(
            props.activeSegments,
            clamp(props.progress, 0, props.activeSegments.length),
            settings.hidePenUp,
        );

        const hitRadius = 8;
        let bestMatch: { line: number; length: number; x: number; y: number; distance: number } | null = null;

        for (const { segment, drawFraction } of visibleSegments) {
            const from = layout.toScreen(segment.from);
            const to = layout.toScreen(segment.to);
            const visibleTo = {
                x: from.x + (to.x - from.x) * drawFraction,
                y: from.y + (to.y - from.y) * drawFraction,
            };
            const dx = visibleTo.x - from.x;
            const dy = visibleTo.y - from.y;
            const lengthSquared = dx * dx + dy * dy;

            let t = 0;
            if (lengthSquared > 0) {
                t = ((canvasX - from.x) * dx + (canvasY - from.y) * dy) / lengthSquared;
                t = Math.max(0, Math.min(1, t));
            }

            const nearestX = from.x + dx * t;
            const nearestY = from.y + dy * t;
            const distance = Math.hypot(canvasX - nearestX, canvasY - nearestY);
            if (distance > hitRadius) continue;

            if (!bestMatch || distance < bestMatch.distance) {
                bestMatch = {
                    line: segment.sourceLine ?? 0,
                    length: Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y),
                    x: displayX,
                    y: displayY,
                    distance,
                };
            }
        }

        if (!bestMatch || bestMatch.line <= 0) return null;
        return bestMatch;
    };

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

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const displayX = event.clientX - rect.left;
        const displayY = event.clientY - rect.top;
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        setHoveredSegment(findHoveredSegment(displayX * scaleX, displayY * scaleY, displayX, displayY));
    };

    const handlePointerLeave = () => {
        setHoveredSegment(null);
    };

    const handleClick = () => {
        if (hoveredSegment && hoveredSegment.line > 0) {
            props.onSegmentClick?.(hoveredSegment.line);
        }
    };

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
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Box
                    component="canvas"
                    ref={canvasRef}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerLeave}
                    onClick={handleClick}
                    sx={{ width: '100%', height: '100%', display: 'block', cursor: hoveredSegment ? 'pointer' : 'default' }}
                />
                {hoveredSegment && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: hoveredSegment.x,
                            top: hoveredSegment.y,
                            transform: 'translate(12px, 12px)',
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            backgroundColor: alpha(theme.palette.background.paper, 0.96),
                            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                            boxShadow: theme.shadows[3],
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                    >
                        <Typography variant="caption" display="block">
                            Source line: {hoveredSegment.line}
                        </Typography>
                        <Typography variant="caption" display="block">
                            Length: {hoveredSegment.length.toFixed(2)}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
