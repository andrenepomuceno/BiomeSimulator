import { GameRenderer } from './GameRenderer.js';
import { ThreeRenderer } from './ThreeRenderer.js';

export function createRenderer(mode, container, onViewportChange, onTileClick, onEffectEvent) {
  if (mode === 'three') {
    return new ThreeRenderer(container, onViewportChange, onTileClick, onEffectEvent);
  }
  return new GameRenderer(container, onViewportChange, onTileClick, onEffectEvent);
}
