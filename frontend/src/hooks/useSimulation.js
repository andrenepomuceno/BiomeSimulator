/**
 * useSimulation hook — manages WebSocket connection and sim state syncing.
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { decode } from '../utils/msgpack';
import useSimStore from '../store/simulationStore';

export function useSimulation() {
  const socketRef = useRef(null);
  const {
    setConnected, setClock, setAnimals, setPltChanges, setStats,
    viewport, setViewport,
  } = useSimStore();

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Send initial viewport
      socket.emit('viewport', viewport);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('tick', (data) => {
      try {
        let state;
        if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          state = decode(data);
        } else if (data instanceof Blob) {
          // Handle blob
          data.arrayBuffer().then(buf => {
            const s = decode(buf);
            _applyState(s);
          });
          return;
        } else {
          state = data;
        }
        _applyState(state);
      } catch (e) {
        console.warn('Failed to decode tick:', e);
      }
    });

    function _applyState(state) {
      if (state.clock) setClock(state.clock);
      if (state.animals) setAnimals(state.animals);
      if (state.plant_changes) setPltChanges(state.plant_changes);
      if (state.stats) setStats(state.stats);
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendViewport = useCallback((vp) => {
    setViewport(vp);
    if (socketRef.current?.connected) {
      socketRef.current.emit('viewport', vp);
    }
  }, [setViewport]);

  return { sendViewport };
}
