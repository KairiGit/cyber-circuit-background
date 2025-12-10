import { CircuitState } from './generator';
import {
    GRID_SIZE,
    COLOR_BG,
    COLOR_GRID,
    COLOR_TRACE,
    COLOR_NODE,
    COLOR_CHIP_BODY,
    COLOR_CHIP_BORDER,
    COLOR_TRACE_HIGHLIGHT,
    COLOR_SIGNAL,
    HOVER_THRESHOLD,
} from './constants';
import { Point } from '../../types';

export const renderStaticLayers = (
    bgCtx: CanvasRenderingContext2D,
    chipCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: CircuitState
) => {
    const { traces, chips } = state;

    // --- LAYER 1: Background & Traces ---
    bgCtx.fillStyle = COLOR_BG;
    bgCtx.fillRect(0, 0, width, height);

    // Grid
    bgCtx.strokeStyle = COLOR_GRID;
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    for (let x = 0; x <= width; x += GRID_SIZE * 4) {
        bgCtx.moveTo(x, 0);
        bgCtx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += GRID_SIZE * 4) {
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(width, y);
    }
    bgCtx.stroke();

    // Traces
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    traces.forEach((trace) => {
        if (trace.points.length < 2) return;

        bgCtx.beginPath();
        bgCtx.moveTo(trace.points[0].x, trace.points[0].y);
        for (let i = 1; i < trace.points.length; i++) {
            bgCtx.lineTo(trace.points[i].x, trace.points[i].y);
        }
        bgCtx.strokeStyle = COLOR_TRACE;
        bgCtx.lineWidth = 1.5;
        bgCtx.stroke();

        // Nodes
        bgCtx.fillStyle = COLOR_NODE;
        const radius = 2;
        bgCtx.beginPath();
        bgCtx.arc(trace.points[0].x, trace.points[0].y, radius, 0, Math.PI * 2);
        bgCtx.fill();

        const last = trace.points[trace.points.length - 1];
        bgCtx.beginPath();
        bgCtx.arc(last.x, last.y, radius, 0, Math.PI * 2);
        bgCtx.fill();
    });

    // --- LAYER 3: Chips (TOP STATIC) ---
    chipCtx.clearRect(0, 0, width, height);

    chips.forEach((chip) => {
        // Body
        chipCtx.fillStyle = COLOR_CHIP_BODY;
        chipCtx.fillRect(chip.x, chip.y, chip.width, chip.height);

        // Border
        chipCtx.strokeStyle = COLOR_CHIP_BORDER;
        chipCtx.lineWidth = 1;
        chipCtx.strokeRect(chip.x, chip.y, chip.width, chip.height);

        // Details
        chipCtx.fillStyle = COLOR_TRACE_HIGHLIGHT;
        if (chip.type === 'cpu') {
            const pad = 10;
            chipCtx.fillRect(
                chip.x + pad,
                chip.y + pad,
                chip.width - pad * 2,
                chip.height - pad * 2
            );
        } else {
            for (let i = 10; i < chip.width; i += 10) {
                chipCtx.fillRect(chip.x + i, chip.y + 5, 2, chip.height - 10);
            }
        }
    });
};

export const renderDynamicFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: CircuitState,
    mousePos: Point
) => {
    const { traces, chips, signals } = state;
    const mx = mousePos.x;
    const my = mousePos.y;

    ctx.clearRect(0, 0, width, height);

    // Helper: Distance squared from point p to segment vw
    const distToSegmentSquared = (p: { x: number, y: number }, v: Point, w: Point) => {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (
            p.y - (v.y + t * (w.y - v.y))) ** 2;
    };

    // 2. Interactive Traces
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Strict proximity: HOVER_THRESHOLD radius to the LINE itself
    const hoverThresholdSq = HOVER_THRESHOLD * HOVER_THRESHOLD;

    traces.forEach((trace) => {
        if (trace.points.length < 2) return;

        let minDistSq = Infinity;

        for (let i = 0; i < trace.points.length - 1; i++) {
            const dStr = distToSegmentSquared(
                { x: mx, y: my },
                trace.points[i],
                trace.points[i + 1]
            );
            if (dStr < minDistSq) minDistSq = dStr;
        }

        const isHovered = minDistSq < hoverThresholdSq;

        if (isHovered) {
            ctx.beginPath();
            ctx.moveTo(trace.points[0].x, trace.points[0].y);
            for (let i = 1; i < trace.points.length; i++) {
                ctx.lineTo(trace.points[i].x, trace.points[i].y);
            }
            ctx.strokeStyle = COLOR_TRACE_HIGHLIGHT;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = COLOR_SIGNAL;
            const radius = 3;
            ctx.beginPath();
            ctx.arc(trace.points[0].x, trace.points[0].y, radius, 0, Math.PI * 2);
            ctx.fill();
            const last = trace.points[trace.points.length - 1];
            ctx.beginPath();
            ctx.arc(last.x, last.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 3. Chip Interaction
    chips.forEach((chip) => {
        const centerX = chip.x + chip.width / 2;
        const centerY = chip.y + chip.height / 2;
        const distSq = (centerX - mx) ** 2 + (centerY - my) ** 2;

        if (distSq < 300 * 300) {
            const intensity = Math.max(0, 1 - Math.sqrt(distSq) / 300);
            if (intensity > 0.1) {
                // Make the glow slightly larger than chip so it peeks out
                ctx.fillStyle = `rgba(0, 242, 255, ${intensity * 0.3})`;
                ctx.fillRect(chip.x - 5, chip.y - 5, chip.width + 10, chip.height + 10);
            }
        }
    });

    // 4. Signals
    signals.forEach((signal) => {
        const trace = traces[signal.pathIndex];
        if (!trace || trace.points.length < 2) return;

        signal.progress += signal.speed;
        if (signal.progress >= 1) signal.progress = 0;

        const totalSegments = trace.points.length - 1;
        const segmentProgress = signal.progress * totalSegments;
        const currentSegmentIndex = Math.floor(segmentProgress);
        const segmentPercent = segmentProgress - currentSegmentIndex;

        const p1 = trace.points[currentSegmentIndex];
        const p2 = trace.points[currentSegmentIndex + 1];

        if (p1 && p2) {
            const x = p1.x + (p2.x - p1.x) * segmentPercent;
            const y = p1.y + (p2.y - p1.y) * segmentPercent;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
            grad.addColorStop(0, signal.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
};
