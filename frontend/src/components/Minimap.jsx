/**
 * Minimap — downscaled overview of the full map with viewport rectangle.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import useSimStore from '../store/simulationStore';
import { TERRAIN_COLORS } from '../utils/terrainColors';

const MINIMAP_SIZE = 200;

export default function Minimap({ onNavigate }) {
  const canvasRef = useRef(null);
  const { terrainData, mapWidth, mapHeight, viewport } = useSimStore();

  // Draw terrain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !terrainData || !mapWidth) return;

    const ctx = canvas.getContext('2d');
    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);
    const cw = Math.ceil(mapWidth * scale);
    const ch = Math.ceil(mapHeight * scale);
    canvas.width = cw;
    canvas.height = ch;

    const imgData = ctx.createImageData(cw, ch);
    const pixels = imgData.data;

    for (let my = 0; my < ch; my++) {
      for (let mx = 0; mx < cw; mx++) {
        const tx = Math.floor(mx / scale);
        const ty = Math.floor(my / scale);
        const ti = ty * mapWidth + tx;
        const t = terrainData[ti] || 0;
        const color = TERRAIN_COLORS[t] || [0, 0, 0, 255];
        const pi = (my * cw + mx) * 4;
        pixels[pi] = color[0];
        pixels[pi + 1] = color[1];
        pixels[pi + 2] = color[2];
        pixels[pi + 3] = color[3];
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [terrainData, mapWidth, mapHeight]);

  // Draw viewport rect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapWidth) return;

    const ctx = canvas.getContext('2d');
    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);

    // Redraw terrain first (simple approach)
    // For performance, we could use a separate overlay canvas
    // But minimap is small, so this is fine

    // Draw viewport rectangle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      viewport.x * scale,
      viewport.y * scale,
      viewport.w * scale,
      viewport.h * scale
    );
  }, [viewport, mapWidth, mapHeight]);

  const handleClick = useCallback((e) => {
    if (!mapWidth || !onNavigate) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);
    const tx = Math.floor((e.clientX - rect.left) / scale);
    const ty = Math.floor((e.clientY - rect.top) / scale);
    onNavigate(tx, ty);
  }, [mapWidth, mapHeight, onNavigate]);

  return (
    <div className="minimap-container">
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onClick={handleClick}
      />
    </div>
  );
}
