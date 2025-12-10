import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateCircuit, CircuitState } from './circuit/generator';
import { renderStaticLayers, renderDynamicFrame } from './circuit/renderer';
import { ACTIVATION_INTERVAL_MS, ACTIVATION_DURATION_MS, MAX_ACTIVE_TRACES, MAX_ACTIVE_CHIPS, ACTIVATION_RADIUS } from './circuit/constants';

interface Activation {
  index: number;
  startTime: number;
}

const CircuitCanvas: React.FC = () => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const chipCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Game state refs
  const stateRef = useRef<CircuitState>({
    traces: [],
    chips: [],
    signals: [],
    gridOccupied: [],
  });

  // Activation State
  const activeTracesRef = useRef<Activation[]>([]);
  const activeChipsRef = useRef<Activation[]>([]);
  const lastActivationTimeRef = useRef<number>(0);

  // Handle Resize => Init & Render Static
  useEffect(() => {
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      const dpr = window.devicePixelRatio || 1;

      const setupCanvas = (ref: React.RefObject<HTMLCanvasElement>) => {
        if (ref.current) {
          ref.current.width = innerWidth * dpr;
          ref.current.height = innerHeight * dpr;
          ref.current.style.width = `${innerWidth}px`;
          ref.current.style.height = `${innerHeight}px`;
          const ctx = ref.current.getContext('2d');
          if (ctx) ctx.scale(dpr, dpr);
          return ctx;
        }
        return null;
      };

      const bgCtx = setupCanvas(staticCanvasRef);
      // Ensure dynamic canvas is scaled even if we don't draw immediately
      setupCanvas(dynamicCanvasRef);
      const chipCtx = setupCanvas(chipCanvasRef);

      if (bgCtx && chipCtx) {
        const newState = generateCircuit(innerWidth, innerHeight);
        stateRef.current = newState;
        // Reset activations on new circuit
        activeTracesRef.current = [];
        activeChipsRef.current = [];
        renderStaticLayers(bgCtx, chipCtx, innerWidth, innerHeight, newState);
      }

      setDimensions({ width: innerWidth, height: innerHeight });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Listener Removed

  // Animation Loop (Dynamic Layer & Logic)
  useEffect(() => {
    // Wait for dimensions to be set
    if (!dynamicCanvasRef.current || dimensions.width === 0) return;

    const canvas = dynamicCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = (time: number) => {
      const { traces, chips } = stateRef.current;

      // 1. Logic: Manage Activations
      // Clean up old
      activeTracesRef.current = activeTracesRef.current.filter(a => time - a.startTime < ACTIVATION_DURATION_MS);
      activeChipsRef.current = activeChipsRef.current.filter(a => time - a.startTime < ACTIVATION_DURATION_MS);

      // Add new
      if (time - lastActivationTimeRef.current > ACTIVATION_INTERVAL_MS) {
        lastActivationTimeRef.current = time;

        // Try add trace cluster
        if (activeTracesRef.current.length < MAX_ACTIVE_TRACES && traces.length > 0) {
          const centerIdx = Math.floor(Math.random() * traces.length);
          const centerTrace = traces[centerIdx];
          const p = centerTrace.points[0];

          // Find neighbors (Cluster activation)
          const rSq = ACTIVATION_RADIUS * ACTIVATION_RADIUS;

          for (let i = 0; i < traces.length; i++) {
            if (activeTracesRef.current.length >= MAX_ACTIVE_TRACES) break;

            const t = traces[i];
            if (t.points.length < 1) continue;
            const tp = t.points[0];
            const dSq = (p.x - tp.x) ** 2 + (p.y - tp.y) ** 2;

            if (dSq < rSq) {
              if (!activeTracesRef.current.some(at => at.index === i)) {
                activeTracesRef.current.push({ index: i, startTime: time });
              }
            }
          }
        }

        // Try add chip cluster
        if (activeChipsRef.current.length < MAX_ACTIVE_CHIPS && chips.length > 0) {
          const centerIdx = Math.floor(Math.random() * chips.length);
          const centerChip = chips[centerIdx];
          const cx = centerChip.x + centerChip.width / 2;
          const cy = centerChip.y + centerChip.height / 2;
          const rSq = ACTIVATION_RADIUS * ACTIVATION_RADIUS;

          for (let i = 0; i < chips.length; i++) {
            if (activeChipsRef.current.length >= MAX_ACTIVE_CHIPS) break;
            const c = chips[i];
            const ccx = c.x + c.width / 2;
            const ccy = c.y + c.height / 2;
            const dSq = (cx - ccx) ** 2 + (cy - ccy) ** 2;

            if (dSq < rSq) {
              if (!activeChipsRef.current.some(ac => ac.index === i)) {
                activeChipsRef.current.push({ index: i, startTime: time });
              }
            }
          }
        }
      }

      // Prepare render data
      const activeTraces = activeTracesRef.current.map(a => ({
        index: a.index,
        opacity: 1 - (time - a.startTime) / ACTIVATION_DURATION_MS
      }));
      const activeChips = activeChipsRef.current.map(a => ({
        index: a.index,
        opacity: 1 - (time - a.startTime) / ACTIVATION_DURATION_MS
      }));

      renderDynamicFrame(
        ctx,
        dimensions.width,
        dimensions.height,
        stateRef.current,
        activeTraces,
        activeChips
      );
      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <>
      <canvas
        ref={staticCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
      <canvas
        ref={dynamicCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
      <canvas
        ref={chipCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
    </>
  );
};

export default CircuitCanvas;
