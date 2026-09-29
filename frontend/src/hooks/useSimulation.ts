import { useState, useEffect, useRef, useCallback } from 'react';
import { BackendState, BackendEvent, getSimulationState, getSimulationResults, BackendResults, stopSimulation } from '../services/api';

export function useSimulation(simulationId: string | null) {
  const [state, setState] = useState<BackendState | null>(null);
  const [results, setResults] = useState<BackendResults | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Poll backend state every 500ms while running
  useEffect(() => {
    if (!simulationId) return;
    let interval: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const data = await getSimulationState(simulationId);
        setState(data);
        if (data.status === 'COMPLETED') {
          clearInterval(interval);
          setIsPlaying(false);
          // Fetch final results
          try {
            const r = await getSimulationResults(simulationId);
            setResults(r);
          } catch {
            // results endpoint returns 400 if not completed yet — ignore
          }
        } else if (data.status === 'ERROR') {
          clearInterval(interval);
          setError('Simulation errored on backend');
        }
      } catch (e) {
        setError('Lost connection to backend');
      }
    };

    poll();
    interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [simulationId]);

  // Playback timer — advances playbackTime at (speed × realtime) rate
  useEffect(() => {
    if (!isPlaying) return;
    let lastTick = performance.now();
    let animFrame: number;

    const tick = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      setPlaybackTime(prev => {
        const totalTime = stateRef.current?.current_time ?? prev;
        const next = prev + dt * speedRef.current;
        if (next >= totalTime && stateRef.current?.status === 'COMPLETED') {
          setIsPlaying(false);
          return totalTime;
        }
        return Math.min(next, totalTime);
      });
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying]);

  const restart = useCallback(() => {
    setPlaybackTime(0);
    setIsPlaying(true);
  }, []);

  const stop = useCallback(async () => {
    setIsPlaying(false);
    if (simulationId) await stopSimulation(simulationId).catch(() => {});
  }, [simulationId]);

  // Events visible up to playbackTime (use backend time field)
  const allEvents: BackendEvent[] = state?.events ?? [];
  const visibleEvents: BackendEvent[] = allEvents.filter(e => e.time <= playbackTime);

  // Derive human-readable time string from seconds
  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `+${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    results,
    error,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    playbackTime,
    setPlaybackTime,
    allEvents,
    visibleEvents,
    totalSimTime: state?.current_time ?? 0,
    formatTime,
    restart,
    stop,
  };
}
