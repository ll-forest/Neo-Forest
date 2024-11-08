import React, { useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Menu from './components/Menu';
import LoadingScreen from './components/LoadingScreen';
import { useAudioSystem } from './hooks/useAudioSystem';

function App() {
  const { audioSystem, isInitialized, handleUserInteraction } = useAudioSystem();

  const [gameState, setGameState] = React.useState({
    screen: 'menu',
    score: 0,
    health: 100,
    level: 1,
    wave: 1,
    maxWaves: 3,
    isPaused: false
  });

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isInitialized) return;
      
      switch(e.key) {
        case 'm':
        case 'M':
          audioSystem.toggleMute();
          break;
        case 'Escape':
          if (gameState.screen === 'game') {
            setGameState(prev => {
              const newIsPaused = !prev.isPaused;
              audioSystem.setMusicVolume(newIsPaused ? 0.1 : 0.3);
              return { ...prev, isPaused: newIsPaused };
            });
          }
          break;
        default:
          break;
      }
    };

    const handleVisibilityChange = () => {
      if (!isInitialized) return;

      if (document.hidden) {
        audioSystem.pauseAll();
        if (gameState.screen === 'game') {
          setGameState(prev => ({ ...prev, isPaused: true }));
        }
      } else {
        audioSystem.resumeAll();
        if (gameState.screen === 'game' && !gameState.isPaused) {
          audioSystem.setMusicVolume(0.3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState.screen, gameState.isPaused, isInitialized, audioSystem]);

  const startGame = () => {
    if (isInitialized) {
      audioSystem.prepareForGameStart();
    }
    setGameState(prev => ({
      ...prev,
      screen: 'loading',
      score: 0,
      health: 100,
      level: 1,
      wave: 1
    }));
  };

  const handleLoadComplete = () => {
    setGameState(prev => ({
      ...prev,
      screen: 'game',
      isPaused: false
    }));
  };

  const handleGameOver = (isPlayerDeath = false) => {
    if (isPlayerDeath) {
      if (isInitialized) {
        audioSystem.playSound('game-over');
      }
      setGameState(prev => ({
        ...prev,
        screen: 'menu',
        score: 0,
        health: 100,
        level: 1,
        wave: 1
      }));
    }
    // If not player death, let the wave/level system handle it
  };

  const handleNextWave = () => {
    setGameState(prev => {
      if (prev.wave >= prev.maxWaves) {
        // Level complete
        return {
          ...prev,
          level: prev.level + 1,
          wave: 1
        };
      } else {
        // Next wave
        return {
          ...prev,
          wave: prev.wave + 1
        };
      }
    });
  };

  return (
    <div 
      className="App h-screen w-screen bg-black overflow-hidden"
      onClickCapture={handleUserInteraction}
      onKeyDownCapture={handleUserInteraction}
      onTouchStartCapture={handleUserInteraction}
    >
      {gameState.screen === 'menu' ? (
        <Menu 
          onStart={startGame} 
          audioSystem={audioSystem}
          isAudioInitialized={isInitialized}
        />
      ) : gameState.screen === 'loading' ? (
        <LoadingScreen onLoadComplete={handleLoadComplete} />
      ) : (
        <GameCanvas
          gameState={gameState}
          setGameState={setGameState}
          onGameOver={handleGameOver}
          onNextWave={handleNextWave}
          audioSystem={audioSystem}
          isAudioInitialized={isInitialized}
        />
      )}
    </div>
  );
}

export default App;