import { Box, Button, Checkbox, Divider, FormControlLabel, IconButton, Paper, Slider, Stack, Tooltip, Typography } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap'
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import type { LogoSegment, Marker } from "../logo/types";
import { alpha, useTheme } from "@mui/material/styles";
import { createPreviewLayout, drawPreview, getRenderablePreviewSegments } from "../logo/drawPreview";
import type { PreviewLayout } from "../logo/drawPreview";
import { drawPreviewSvg } from "../logo/drawPreviewSvg";
import { clamp } from "../helpers/clamp";

function buildFilename(scriptName: string, ext: string): string {
    const safe = scriptName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    return `${safe}_${ts}.${ext}`
}

export type PreviewProps = {
    isPlaying: boolean;
    speed: number;
    progress: number;
    activeSegments: LogoSegment[];
    markers: Marker[];
    hasSegments: boolean;
    scriptName: string;
    activeScriptId: string;
    onPlay: () => void;
    onPause: () => void;
    onProgressChange: (progress: number) => void;
    onSpeedChange: (speed: number) => void;
    onSegmentClick?: (lineNumber: number) => void;
}

export function Preview(props: PreviewProps) {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const layoutRef = useRef<PreviewLayout | null>(null);
    const { settings, setSettings } = useSettings();
    const [hoveredSegment, setHoveredSegment] = useState<{ line: number; length: number; x: number; y: number; logoX: number; logoY: number } | null>(null);
    const [coordCopied, setCoordCopied] = useState(false);

    // Zoom / pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Refs for use in event listeners / effects that can't capture stale state
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);
    zoomRef.current = zoom;
    panRef.current = pan;

    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const hasDraggedRef = useRef(false);

    // Per-script zoom/pan persistence
    const savedViewRef = useRef<Map<string, { zoom: number; pan: { x: number; y: number } }>>(new Map());
    const liveViewRef = useRef({ zoom, pan });
    liveViewRef.current = { zoom, pan };

    useEffect(() => {
        const saved = savedViewRef.current.get(props.activeScriptId)
        setZoom(saved?.zoom ?? 1)
        setPan(saved?.pan ?? { x: 0, y: 0 })
        return () => {
            savedViewRef.current.set(props.activeScriptId, liveViewRef.current)
        }
    }, [props.activeScriptId])

    const isAtDefault = zoom === 1 && pan.x === 0 && pan.y === 0;

    const resetView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Non-passive wheel listener for zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const currentZoom = zoomRef.current;
            const currentPan = panRef.current;
            const newZoom = clamp(currentZoom * (1 - e.deltaY * 0.001), 0.1, 50);
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const ratio = newZoom / currentZoom;
            setZoom(newZoom);
            setPan({
                x: (cx - centerX) * (1 - ratio) + currentPan.x * ratio,
                y: (cy - centerY) * (1 - ratio) + currentPan.y * ratio,
            });
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    const toCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const findHoveredSegment = (layout: PreviewLayout, canvasX: number, canvasY: number, displayX: number, displayY: number) => {
        if (props.activeSegments.length === 0) return null;

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
            zoom,
            pan,
        )
    }, [props.progress, props.activeSegments, props.markers, theme.palette.primary.main, theme.palette.text.secondary, settings.hidePenUp, settings.penWidth, zoom, pan]);

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = true;
        setIsDragging(true);
        hasDraggedRef.current = false;
        dragStartRef.current = toCanvasCoords(event);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isDraggingRef.current && dragStartRef.current) {
            const current = toCanvasCoords(event);
            const dx = current.x - dragStartRef.current.x;
            const dy = current.y - dragStartRef.current.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) hasDraggedRef.current = true;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStartRef.current = current;
            setHoveredSegment(null);
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const displayX = event.clientX - rect.left;
        const displayY = event.clientY - rect.top;
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        const canvasX = displayX * scaleX;
        const canvasY = displayY * scaleY;

        const layout = createPreviewLayout(canvas, props.activeSegments, zoom, pan);
        layoutRef.current = layout;

        if (!layout) {
            setHoveredSegment(null);
            return;
        }

        const match = findHoveredSegment(layout, canvasX, canvasY, displayX, displayY);
        if (match) {
            const logo = layout.fromScreen({ x: canvasX, y: canvasY });
            setHoveredSegment({ ...match, logoX: logo.x, logoY: logo.y });
        } else {
            setHoveredSegment(null);
        }
    };

    const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        dragStartRef.current = null;
    };

    const handlePointerLeave = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        dragStartRef.current = null;
        setHoveredSegment(null);
    };

    const handleDoubleClick = () => {
        resetView();
    };

    const handleClick = () => {
        if (!hasDraggedRef.current && hoveredSegment && hoveredSegment.line > 0) {
            props.onSegmentClick?.(hoveredSegment.line);
        }
    };

    const exportPng = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = buildFilename(props.scriptName, 'png');
        a.click();
    };

    const exportSvg = () => {
        const svg = drawPreviewSvg(
            props.activeSegments,
            clamp(props.progress, 0, props.activeSegments.length),
            {
                penDown: theme.palette.primary.main,
                penUp: theme.palette.text.secondary,
                axis: alpha(theme.palette.text.secondary, 0.4),
            },
            settings.hidePenUp,
            settings.penWidth,
            props.markers,
        );
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildFilename(props.scriptName, 'svg');
        a.click();
        URL.revokeObjectURL(url);
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
                        {!isAtDefault && (
                            <Tooltip title="Reset zoom">
                                <IconButton size="small" onClick={resetView} aria-label="Reset zoom">
                                    <ZoomOutMapIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
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
                            onClick={exportPng}
                            disabled={!props.hasSegments}
                        >
                            PNG
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={exportSvg}
                            disabled={!props.hasSegments}
                        >
                            SVG
                        </Button>
                    </Stack>
                </Stack>
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Slider
                        min={0}
                        max={props.activeSegments.length}
                        step={1}
                        value={Math.floor(props.progress)}
                        disabled={!props.hasSegments}
                        onChange={(_, v) => {
                            const val = Array.isArray(v) ? v[0] : v;
                            if (props.isPlaying) props.onPause();
                            props.onProgressChange(val);
                        }}
                        sx={{ flex: 1 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
                        {Math.floor(props.progress)} / {props.activeSegments.length}
                    </Typography>
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
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onPointerCancel={handlePointerUp}
                    onDoubleClick={handleDoubleClick}
                    onClick={handleClick}
                    sx={{ width: '100%', height: '100%', display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
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
                        <Typography
                            variant="caption"
                            display="block"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${hoveredSegment.logoX.toFixed(2)}, ${hoveredSegment.logoY.toFixed(2)}`);
                                setCoordCopied(true);
                                setTimeout(() => setCoordCopied(false), 1000);
                            }}
                            sx={{ cursor: 'copy', userSelect: 'none' }}
                        >
                            {coordCopied ? 'Copied!' : `x: ${hoveredSegment.logoX.toFixed(2)}, y: ${hoveredSegment.logoY.toFixed(2)}`}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
