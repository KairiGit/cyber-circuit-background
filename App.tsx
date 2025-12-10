import React from 'react';
import CircuitCanvas from './components/CircuitCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505]">
      {/* 
        The CircuitCanvas is the star of the show here.
        It sits at z-0. 
        Any foreground content would go in a relative container with z-10.
      */}
      <CircuitCanvas />
      
      {/* 
        Optional: Vignette overlay to give it a more cinematic feel 
        and focus attention on the center.
      */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%)'
        }}
      />
      
      {/* 
        Scanline effect for extra retro-tech feel 
      */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-5"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
          backgroundSize: '100% 4px'
        }}
      />
    </div>
  );
};

export default App;
