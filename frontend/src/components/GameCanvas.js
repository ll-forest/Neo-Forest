// src/components/GameCanvas.js
import React, { useEffect, useRef } from 'react';
import GameEngine from '../game/Engine';
import InputHandler from '../game/systems/InputHandler';

const GameCanvas = ({ 
  gameState, 
  setGameState, 
  onGameOver,
  onNextWave, 
  audioSystem,
  isAudioInitialized 
}) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputHandlerRef = useRef(null);

  // Initialize game systems
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Handle canvas resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (engineRef.current) {
        engineRef.current.handleResize(canvas.width, canvas.height);
      }
    };
    
    handleResize();

    // Initialize game engine and input handler
    engineRef.current = new GameEngine(canvas);
    inputHandlerRef.current = new InputHandler();
    
    // Set up audio callbacks for abilities
    inputHandlerRef.current.onAbilityUse = (abilitySound) => {
      if (isAudioInitialized) {
        switch(abilitySound) {
          case 'light-attack':
          case 'heavy-attack':
          case 'special-attack':
            audioSystem?.playSound('combat-hit');
            break;
          case 'cyber-claws':
          case 'wall-climb':
          case 'neural-visor':
          case 'fury-surge':
          case 'tunnel-drive':
          case 'shield-strike':
            audioSystem?.playSound('ability-use');
            break;
          default:
            break;
        }
      }
    };

    engineRef.current.init();
    engineRef.current.inputHandler = inputHandlerRef.current;

    // Set up score callback
    engineRef.current.onScoreChange = (points) => {
      setGameState(prev => ({
        ...prev,
        score: prev.score + points
      }));
    };

    // Set up health callback
    engineRef.current.onHealthChange = (health) => {
      if (engineRef.current?.gameObjects?.player?.isDead) return;
      
      setGameState(prev => ({ ...prev, health }));
      
      if (health <= 0) {
        onGameOver(true);
      }
    };

    // Set up wave completion callback
    engineRef.current.onLevelComplete = () => {
      setTimeout(() => {
        onNextWave();
        setTimeout(() => {
          if (engineRef.current) {
            engineRef.current.startWave(gameState.wave + 1);
          }
        }, 100);
      }, 1000);
    };

    // Start the first wave
    engineRef.current.startWave(gameState.wave);
    engineRef.current.start();

    // Input event handlers
    const handleKeyDown = (e) => {
      if (gameState.isPaused && e.code !== 'Escape') return;
      
      // Handle pause toggle
      if (e.code === 'Escape') {
        setGameState(prev => {
          const newIsPaused = !prev.isPaused;
          if (isAudioInitialized) {
            audioSystem?.setMusicVolume(newIsPaused ? 0.1 : 0.3);
          }
          return { ...prev, isPaused: newIsPaused };
        });
        return;
      }

      inputHandlerRef.current?.handleKeyDown(e);
    };

    const handleKeyUp = (e) => {
      if (gameState.isPaused && e.code !== 'Escape') return;
      inputHandlerRef.current?.handleKeyUp(e);
    };

    // Handle mouse events for abilities
    const handleMouseDown = (e) => {
      if (gameState.isPaused) return;
      if (e.button === 0) { // Left click
        inputHandlerRef.current?.setNestedValue(
          inputHandlerRef.current.keys,
          'combat.lightAttack',
          true
        );
      } else if (e.button === 2) { // Right click
        inputHandlerRef.current?.setNestedValue(
          inputHandlerRef.current.keys,
          'combat.heavyAttack',
          true
        );
      }
    };

    const handleMouseUp = (e) => {
      if (gameState.isPaused) return;
      if (e.button === 0) {
        inputHandlerRef.current?.setNestedValue(
          inputHandlerRef.current.keys,
          'combat.lightAttack',
          false
        );
      } else if (e.button === 2) {
        inputHandlerRef.current?.setNestedValue(
          inputHandlerRef.current.keys,
          'combat.heavyAttack',
          false
        );
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [gameState.isPaused, gameState.wave, isAudioInitialized, audioSystem, onGameOver, onNextWave, setGameState]);

  // Handle pause state
  useEffect(() => {
    if (engineRef.current) {
      if (gameState.isPaused) {
        engineRef.current.pause();
      } else {
        engineRef.current.resume();
      }
    }
  }, [gameState.isPaused]);

  // Render cooldown indicators for abilities
  const renderCooldowns = () => {
    if (!inputHandlerRef.current) return null;

    const abilities = [
      { id: 'cyberClaws', name: 'Cyber Claws', key: 'F' },
      { id: 'furySurge', name: 'Fury Surge', key: 'C' },
      { id: 'tunnelDrive', name: 'Tunnel Drive', key: 'X' },
      { id: 'shieldStrike', name: 'Shield Strike', key: 'Z' }
    ];

    return (
      <div className="absolute bottom-4 left-4 flex space-x-4">
        {abilities.map(ability => {
          const cooldownPercent = inputHandlerRef.current.getCooldownPercent(ability.id);
          return (
            <div key={ability.id} className="text-cyan-400 text-sm">
              <div className="relative w-12 h-12 bg-gray-800 rounded-lg border border-cyan-400">
                {cooldownPercent > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-cyan-400 bg-opacity-30"
                    style={{ 
                      height: `${cooldownPercent}%`,
                      transition: 'height 0.1s linear'
                    }}
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold">{ability.key}</span>
                  <span className="text-xs">{cooldownPercent > 0 ? Math.ceil(cooldownPercent) + '%' : 'Ready'}</span>
                </div>
              </div>
              <div className="text-center mt-1">{ability.name}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-black relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Game HUD */}
      <div className="absolute top-4 right-4 text-cyan-400 space-y-2">
        <p>Score: {gameState.score}</p>
        <p>Health: {gameState.health}</p>
        <p>Level: {gameState.level}</p>
        <p>Wave: {gameState.wave}/{gameState.maxWaves}</p>
        <p>Enemies: {engineRef.current?.gameObjects.enemies.size ?? 0}</p>
      </div>

      {/* Ability Cooldowns */}
      {renderCooldowns()}

      {/* Pause Menu */}
      {gameState.isPaused && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg text-white space-y-4">
            <h2 className="text-2xl text-center">Paused</h2>
            <div className="space-y-2">
              <button
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
                onClick={() => {
                  if (isAudioInitialized) {
                    audioSystem?.playSound('button-click');
                  }
                  setGameState(prev => ({ ...prev, isPaused: false }));
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
              >
                Resume
              </button>
              <button
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                onClick={() => {
                  if (isAudioInitialized) {
                    audioSystem?.playSound('button-click');
                  }
                  setTimeout(() => onGameOver(true), 100);
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
              >
                Quit to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;