import React, { useEffect, useState } from 'react';

const LoadingScreen = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading time (adjust as needed)
    const duration = 2000; // 2 seconds
    const interval = 20; // Update every 20ms
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          onLoadComplete();
        }, 200); // Small delay after reaching 100%
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onLoadComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <h2 className="text-2xl font-bold text-cyan-400 mb-8 tracking-wider"
          style={{
            textShadow: `
              0 0 5px #0ff,
              0 0 10px #0ff
            `
          }}>
        LOADING WILDERNESS
      </h2>
      
      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-cyan-400 transition-all duration-200"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px #0ff, inset 0 0 5px #0ff'
          }}
        />
      </div>
      
      <p className="mt-4 text-cyan-400">
        {Math.round(progress)}%
      </p>
    </div>
  );
};

export default LoadingScreen;