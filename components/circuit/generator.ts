import { Chip, Point, TracePath, Signal } from '../../types';
import {
    GRID_SIZE,
    CHIP_COUNT_FACTOR,
    TRACE_COUNT_FACTOR,
    SIGNAL_DENSITY,
    COLOR_SIGNAL,
    COLOR_SIGNAL_SECONDARY,
} from './constants';

export interface CircuitState {
    traces: TracePath[];
    chips: Chip[];
    signals: Signal[];
    gridOccupied: boolean[][];
}

// Utility: Random Integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// Utility: Snap to grid
const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

export const generateCircuit = (width: number, height: number): CircuitState => {
    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);

    // Initialize Grid State (false = empty)
    const grid: boolean[][] = Array(cols)
        .fill(null)
        .map(() => Array(rows).fill(false));
    const chips: Chip[] = [];
    const traces: TracePath[] = [];
    const signals: Signal[] = [];

    // 1. Generate Chips (Rectangles)
    const totalPixels = width * height;
    const numChips = Math.max(3, Math.floor(totalPixels * CHIP_COUNT_FACTOR));

    for (let i = 0; i < numChips; i++) {
        const chipW = randomInt(2, 6) * GRID_SIZE;
        const chipH = randomInt(2, 6) * GRID_SIZE;
        const chipX = snap(randomInt(GRID_SIZE, width - chipW - GRID_SIZE));
        const chipY = snap(randomInt(GRID_SIZE, height - chipH - GRID_SIZE));

        // Mark grid as occupied
        const startCol = chipX / GRID_SIZE;
        const startRow = chipY / GRID_SIZE;
        const endCol = startCol + chipW / GRID_SIZE;
        const endRow = startRow + chipH / GRID_SIZE;

        let overlap = false;
        // Check overlap with buffer
        for (let c = startCol - 1; c <= endCol + 1; c++) {
            for (let r = startRow - 1; r <= endRow + 1; r++) {
                if (c >= 0 && c < cols && r >= 0 && r < rows && grid[c][r]) {
                    overlap = true;
                }
            }
        }

        if (!overlap) {
            chips.push({
                x: chipX,
                y: chipY,
                width: chipW,
                height: chipH,
                type: Math.random() > 0.7 ? 'cpu' : 'memory',
            });

            // Mark actual occupation
            for (let c = startCol; c < endCol; c++) {
                for (let r = startRow; r < endRow; r++) {
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        grid[c][r] = true;
                    }
                }
            }
        }
    }

    // 2. Generate Traces (Lines)
    const numTraces = Math.floor(totalPixels * TRACE_COUNT_FACTOR);

    for (let i = 0; i < numTraces; i++) {
        let currX = snap(randomInt(GRID_SIZE, width - GRID_SIZE));
        let currY = snap(randomInt(GRID_SIZE, height - GRID_SIZE));
        let col = currX / GRID_SIZE;
        let row = currY / GRID_SIZE;

        // Find valid start point
        if (grid[col]?.[row]) continue;

        const points: Point[] = [{ x: currX, y: currY }];
        const pathLength = randomInt(5, 20); // Segments
        let direction = randomInt(0, 3); // 0: N, 1: E, 2: S, 3: W

        for (let s = 0; s < pathLength; s++) {
            // Change direction randomly, but prefer straight or 90 deg
            if (Math.random() < 0.3) {
                direction = (direction + (Math.random() > 0.5 ? 1 : 3)) % 4;
            }

            const len = randomInt(2, 6) * GRID_SIZE;
            let dx = 0;
            let dy = 0;

            if (direction === 0) dy = -len;
            else if (direction === 1) dx = len;
            else if (direction === 2) dy = len;
            else if (direction === 3) dx = -len;

            const nextX = currX + dx;
            const nextY = currY + dy;

            // Boundary Check
            if (
                nextX < GRID_SIZE ||
                nextX > width - GRID_SIZE ||
                nextY < GRID_SIZE ||
                nextY > height - GRID_SIZE
            ) {
                break;
            }

            // Collision Check
            const nextCol = Math.round(nextX / GRID_SIZE);
            const nextRow = Math.round(nextY / GRID_SIZE);

            if (grid[nextCol]?.[nextRow]) {
                // Hit a chip, connect to it and stop
                points.push({ x: nextX, y: nextY });
                break;
            }

            currX = nextX;
            currY = nextY;
            points.push({ x: nextX, y: nextY });
        }

        if (points.length > 1) {
            traces.push({ points, length: points.length });

            // 3. Generate Signals for this trace
            if (Math.random() < SIGNAL_DENSITY) {
                signals.push({
                    pathIndex: traces.length - 1,
                    progress: Math.random(),
                    speed: 0.005 + Math.random() * 0.01,
                    color: Math.random() > 0.8 ? COLOR_SIGNAL_SECONDARY : COLOR_SIGNAL,
                });
            }
        }
    }

    return { traces, chips, signals, gridOccupied: grid };
};
