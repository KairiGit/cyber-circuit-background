import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Point } from '../types';
import { generateCircuit, CircuitState } from './circuit/generator';
import { renderStaticLayers, renderDynamicFrame } from './circuit/renderer';

const CircuitCanvas: React.FC = () => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const chipCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const mouseRef = useRef<Point>({ x: -1000, y: -1000 });

  // Game state refs
  const stateRef = useRef<CircuitState>({
    traces: [],
    chips: [],
    signals: [],
    gridOccupied: [],
  });

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
        renderStaticLayers(bgCtx, chipCtx, innerWidth, innerHeight, newState);
      }

      setDimensions({ width: innerWidth, height: innerHeight });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array as imported functions are stable

  // Handle Mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animation Loop (Dynamic Layer)
  useEffect(() => {
    // Wait for dimensions to be set
    if (!dynamicCanvasRef.current || dimensions.width === 0) return;

    const canvas = dynamicCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      renderDynamicFrame(
        ctx,
        dimensions.width,
        dimensions.height,
        stateRef.current,
        mouseRef.current
      );
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <>
      {/* Layer 1: Traces & Grid (Bottom) */}
      <canvas
        ref={staticCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
      {/* Layer 2: Signals & Glows (Middle) */}
      <canvas
        ref={dynamicCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
      {/* Layer 3: Chips (Top) */}
      <canvas
        ref={chipCanvasRef}
        className="block absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />
    </>
  );
};

export default CircuitCanvas;
