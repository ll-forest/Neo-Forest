import { useEffect, useState } from 'react';
import audioSystem from '../game/Audio';

export function useAudioSystem() {
  const [isInitialized, setIsInitialized] = useState(audioSystem.getIsInitialized());
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Handle initialization after user interaction
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      if (hasUserInteracted && !isInitialized) {
        try {
          await audioSystem.init(true);
          if (isMounted) {
            setIsInitialized(audioSystem.getIsInitialized());
          }
        } catch (error) {
          console.error('Failed to initialize audio:', error);
        }
      }
    };

    initAudio();

    return () => {
      isMounted = false;
    };
  }, [hasUserInteracted, isInitialized]);

  const handleUserInteraction = () => {
    setHasUserInteracted(true);
  };

  return {
    audioSystem,
    isInitialized,
    handleUserInteraction
  };
}