// src/game/Menu.js
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const PixelTree = ({ x, height, glowColor }) => (
  <g transform={`translate(${x}, 0)`}>
    <rect 
      x="-4" 
      y={height - 40} 
      width="8" 
      height="40" 
      className="fill-gray-800"
    />
    {[0, -20, -40].map((yOffset, i) => (
      <polygon
        key={i}
        points={`0,${height + yOffset - 60} 30,${height + yOffset} -30,${height + yOffset}`}
        className="fill-gray-900"
        style={{
          filter: `drop-shadow(0 0 ${2 + i}px ${glowColor})`
        }}
      />
    ))}
  </g>
);

const MenuScreen = ({ onStart, audioSystem, isAudioInitialized }) => {
  const [buttonHovered, setButtonHovered] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure background music is playing when component mounts
  useEffect(() => {
    if (isAudioInitialized && audioSystem && !audioSystem.isMuted) {
      audioSystem.resumeAll();
    }
  }, [isAudioInitialized, audioSystem]);

  // Calculate grid dimensions based on window size
  const getGridDimensions = () => {
    const baseGridSize = 80; // Base size of each grid cell
    return {
      cols: Math.ceil(windowDimensions.width / baseGridSize),
      rows: Math.ceil(windowDimensions.height / baseGridSize)
    };
  };

  const { cols, rows } = getGridDimensions();

  // Calculate number of trees based on screen width
  const getTreeCount = (baseCount) => {
    const multiplier = Math.max(1, windowDimensions.width / 1920);
    return Math.ceil(baseCount * multiplier);
  };

  const handleButtonHover = () => {
    setButtonHovered(true);
    if (isAudioInitialized) {
      audioSystem?.playSound('button-hover');
    }
  };

  const handleButtonLeave = () => {
    setButtonHovered(false);
    if (isAudioInitialized) {
      audioSystem?.stopSound('button-hover');
    }
  };

  const handleButtonClick = () => {
    if (isAudioInitialized) {
      audioSystem?.playSound('button-click');
      // Small delay to ensure sound plays before transition
      setTimeout(onStart, 150);
    } else {
      onStart();
    }
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-black">
        <div className="relative w-full h-full">
          {/* Vertical grid lines */}
          <div 
            className="absolute inset-0 flex"
            style={{ 
              gap: `${100 / cols}%`
            }}
          >
            {Array.from({ length: cols }).map((_, i) => (
              <div 
                key={i} 
                className="h-full border-r border-cyan-500 opacity-20 flex-1"
              />
            ))}
          </div>
          
          {/* Horizontal grid lines */}
          <div 
            className="absolute inset-0 flex flex-col" 
            style={{ gap: `${100 / rows}%` }}
          >
            {Array.from({ length: rows }).map((_, i) => (
              <div 
                key={i} 
                className="w-full border-b border-cyan-500 opacity-20 flex-1"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Forest Background Layer */}
      <div className="absolute inset-0 z-[1]">
        <svg className="w-full h-full" preserveAspectRatio="xMidYMax meet">
          {/* Background trees */}
          {Array.from({ length: getTreeCount(12) }).map((_, i) => (
            <PixelTree 
              key={`back-${i}`} 
              x={100 + i * 160} 
              height={500} 
              glowColor="#0ff3"
            />
          ))}
          {/* Middle layer trees */}
          {Array.from({ length: getTreeCount(8) }).map((_, i) => (
            <PixelTree 
              key={`mid-${i}`} 
              x={180 + i * 180} 
              height={550} 
              glowColor="#0ff5"
            />
          ))}
          {/* Front layer trees */}
          {Array.from({ length: getTreeCount(6) }).map((_, i) => (
            <PixelTree 
              key={`front-${i}`} 
              x={220 + i * 200} 
              height={600} 
              glowColor="#0ff7"
            />
          ))}
          
          <rect 
            x="0" 
            y="600" 
            width="100%" 
            height="200" 
            className="fill-black opacity-50"
          />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 mb-16">
          <h1 
            className="text-8xl font-bold text-cyan-400 tracking-widest animate-pulse select-none"
            style={{
              textShadow: `
                0 0 5px #0ff,
                0 0 10px #0ff,
                0 0 20px #0ff,
                0 0 40px #0ff,
                0 0 80px #0ff
              `
            }}
          >
            NEO·FOREST
          </h1>
          
          <div 
            className="text-xl text-cyan-300 tracking-[0.5em] opacity-70"
            style={{
              textShadow: '0 0 10px #0ff'
            }}
          >
            RECLAIM THE WILD
          </div>
        </div>

        <button
          className={`
            px-8 py-4 text-2xl font-bold
            border-2 border-cyan-400
            transition-all duration-300
            ${buttonHovered ? 'bg-cyan-400 text-black' : 'text-cyan-400'}
          `}
          style={{
            boxShadow: buttonHovered 
              ? '0 0 20px #0ff, inset 0 0 20px #0ff'
              : '0 0 10px #0ff',
            textShadow: buttonHovered
              ? 'none'
              : '0 0 5px #0ff, 0 0 10px #0ff'
          }}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
          onClick={handleButtonClick}
        >
          ENTER THE WILDERNESS
        </button>
        
        {/* Audio control button */}
        <button 
          onClick={() => {
            if (isAudioInitialized) {
              audioSystem?.playSound('button-click');
            }
            audioSystem?.toggleMute();
          }}
          onMouseEnter={() => {
            if (isAudioInitialized) {
              audioSystem?.playSound('button-hover');
            }
          }}
          onMouseLeave={() => {
            if (isAudioInitialized) {
              audioSystem?.stopSound('button-hover');
            }
          }}
          className="absolute bottom-8 right-8 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          {audioSystem?.isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-8 left-8 text-cyan-400 text-xs">
            Audio System: {isAudioInitialized ? '✅' : '❌'}
          </div>
        )}

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: getTreeCount(20) }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400 rounded-full opacity-50 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuScreen;