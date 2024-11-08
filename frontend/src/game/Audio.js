import { Howl, Howler } from 'howler';

// Private state
const state = {
  sounds: {},
  backgroundMusic: null,
  isMuted: false,
  isInitialized: false,
  soundLoadStatus: {},
  activeSounds: new Set(),
  initializationPromise: null
};

// Create audio system as a plain object with methods
const audioSystem = {
  async init(userInitiated = false) {
    if (state.initializationPromise) {
      return state.initializationPromise;
    }

    if (state.isInitialized) {
      return Promise.resolve();
    }

    state.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('Starting audio system initialization...');

        if (!userInitiated) {
          console.log('Waiting for user interaction before initializing audio...');
          return resolve();
        }

        // Initialize background music first
        await new Promise((musicResolve, musicReject) => {
          state.backgroundMusic = new Howl({
            src: ['/assets/music/background.mp3'],
            loop: true,
            volume: 0.3,
            html5: false,
            onload: () => {
              console.log('Background music loaded successfully');
              musicResolve();
            },
            onloaderror: (_, error) => {
              console.error('Failed to load background music:', error);
              musicReject(error);
            }
          });
        });

        // Initialize sound effects
        const effects = {
          'button-hover': { src: '/assets/music/effects/button-hover.mp3', volume: 0.7 },
          'button-click': { src: '/assets/music/effects/button-click.mp3', volume: 0.7 },
          'combat-hit': { src: '/assets/music/effects/combat-hit.mp3', volume: 0.5 },
          'game-over': { src: '/assets/music/effects/game-over.mp3', volume: 0.7 }
        };

        // Load all effects
        await Promise.all(
          Object.entries(effects).map(([id, config]) => {
            return new Promise((effectResolve, effectReject) => {
              state.sounds[id] = new Howl({
                src: [config.src],
                volume: config.volume,
                html5: false,
                onload: () => {
                  state.soundLoadStatus[id] = 'loaded';
                  console.log(`Sound loaded: ${id}`);
                  effectResolve();
                },
                onloaderror: (_, error) => {
                  console.error(`Failed to load sound ${id}:`, error);
                  state.soundLoadStatus[id] = 'error';
                  effectReject(error);
                },
                onend: () => {
                  state.activeSounds.delete(id);
                }
              });
            });
          })
        );

        state.isInitialized = true;
        console.log('✅ Audio system initialized successfully');
        
        // Start background music if not muted
        if (!state.isMuted && state.backgroundMusic) {
          state.backgroundMusic.volume(0.3);
          state.backgroundMusic.play();
        }

        resolve();
      } catch (error) {
        console.error('❌ Failed to initialize audio system:', error);
        state.isInitialized = false;
        state.initializationPromise = null;
        reject(error);
      }
    });

    return state.initializationPromise;
  },

  stopSound(soundId) {
    if (!state.isInitialized || !state.sounds[soundId]) {
      return;
    }

    try {
      state.sounds[soundId].stop();
      state.activeSounds.delete(soundId);
      console.log(`Stopped sound: ${soundId}`);
    } catch (error) {
      console.error(`Error stopping ${soundId}:`, error);
    }
  },

  playSound(soundId) {
    if (!state.isInitialized || state.isMuted) {
      return;
    }

    const sound = state.sounds[soundId];
    if (!sound) {
      return;
    }

    try {
      // Special handling for combat sounds
      if (soundId === 'combat-hit') {
        if (state.activeSounds.has('combat-hit')) {
          return;
        }

        ['button-hover', 'button-click'].forEach(id => {
          this.stopSound(id);
        });

        const id = sound.play();
        state.activeSounds.add('combat-hit');
        
        setTimeout(() => {
          state.activeSounds.delete('combat-hit');
        }, 150);
        return;
      }

      // For button-click
      if (soundId === 'button-click') {
        if (state.activeSounds.has('combat-hit')) {
          return;
        }

        this.stopSound('button-click');
        
        const id = sound.play();
        state.activeSounds.add('button-click');
        
        setTimeout(() => {
          state.activeSounds.delete('button-click');
        }, 100);
        return;
      }

      // For hover sound
      if (soundId === 'button-hover') {
        if (state.activeSounds.has('combat-hit') || state.activeSounds.has('button-click')) {
          return;
        }

        this.stopSound('button-hover');
        const id = sound.play();
        state.activeSounds.add('button-hover');
        return;
      }

      // Default behavior for other sounds
      const id = sound.play();
      state.activeSounds.add(soundId);

    } catch (error) {
      console.error(`Error playing ${soundId}:`, error);
    }
  },

  toggleMute() {
    console.log('Toggling mute state');
    state.isMuted = !state.isMuted;
    
    if (state.backgroundMusic) {
      if (state.isMuted) {
        state.backgroundMusic.pause();
      } else {
        state.backgroundMusic.volume(0.3);
        state.backgroundMusic.play();
      }
    }
    
    if (state.isMuted) {
      state.activeSounds.forEach(soundId => {
        if (state.sounds[soundId]) {
          state.sounds[soundId].stop();
        }
      });
      state.activeSounds.clear();
    }
    
    console.log(`Mute state: ${state.isMuted}`);
    return state.isMuted;
  },

  setMusicVolume(volume) {
    if (state.backgroundMusic) {
      console.log(`Setting music volume: ${volume}`);
      state.backgroundMusic.volume(volume);
    }
  },

  pauseAll() {
    console.log('Pausing all audio');
    if (state.backgroundMusic) {
      state.backgroundMusic.pause();
    }
    
    state.activeSounds.forEach(soundId => {
      if (state.sounds[soundId]) {
        state.sounds[soundId].pause();
      }
    });
  },

  resumeAll() {
    console.log('Resuming all audio');
    if (!state.isMuted && state.backgroundMusic) {
      state.backgroundMusic.volume(0.3);
      state.backgroundMusic.play();
    }
  },

  prepareForGameStart() {
    ['button-hover', 'button-click'].forEach(id => {
      this.stopSound(id);
    });
    
    state.activeSounds.clear();
    
    if (state.backgroundMusic && !state.isMuted) {
      state.backgroundMusic.volume(0.3);
    }
  },

  destroy() {
    console.log('Destroying audio system');
    
    state.activeSounds.forEach(soundId => {
      if (state.sounds[soundId]) {
        state.sounds[soundId].stop();
      }
    });
    state.activeSounds.clear();
    
    Object.values(state.sounds).forEach(sound => {
      if (sound) sound.unload();
    });
    state.sounds = {};
    
    if (state.backgroundMusic && !state.isMuted) {
      state.backgroundMusic.volume(0.3);
    }
    
    state.soundLoadStatus = {};
    state.isInitialized = false;
    state.initializationPromise = null;
  },

  getIsInitialized() {
    return state.isInitialized;
  },

  getIsMuted() {
    return state.isMuted;
  }
};

export default audioSystem;