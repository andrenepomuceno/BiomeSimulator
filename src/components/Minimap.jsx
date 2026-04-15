/**
 * Minimap — downscaled overview of the full map with viewport rectangle.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import useSimStore from '../store/simulationStore';
import { DEEP_WATER, MOUNTAIN, SAND, SOIL, TERRAIN_COLORS, TERRAIN_NAMES, WATER } from '../utils/terrainColors';

const MINIMAP_SIZE = 200;
const LEGEND_TERRAINS = [DEEP_WATER, WATER, SAND, SOIL, MOUNTAIN];

function rgbaToCss(color = []) {
  const [r = 0, g = 0, b = 0, a = 255] = color;
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export default function Minimap({ onNavigate }) {
  const canvasRef = useRef(null);
  const terrainImgRef = useRef(null);
  const { terrainData, mapWidth, mapHeight, viewport } = useSimStore();

  // Build terrain ImageData when terrain changes
  useEffect(() => {
    if (!terrainData || !mapWidth) return;

    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);
    const cw = Math.ceil(mapWidth * scale);
    const ch = Math.ceil(mapHeight * scale);

    const imgData = new ImageData(cw, ch);
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

    terrainImgRef.current = imgData;
  }, [terrainData, mapWidth, mapHeight]);

  // Draw terrain + viewport rect (redraws fully each time viewport moves)
  useEffect(() => {
    const canvas = canvasRef.current;
    const imgData = terrainImgRef.current;
    if (!canvas || !imgData || !mapWidth) return;

    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d');

    // Redraw terrain base
    ctx.putImageData(imgData, 0, 0);

    // Draw viewport rectangle
    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      viewport.x * scale,
      viewport.y * scale,
      viewport.w * scale,
      viewport.h * scale
    );
  }, [viewport, mapWidth, mapHeight, terrainData]);

  const handleClick = useCallback((e) => {
    if (!mapWidth || !onNavigate) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = MINIMAP_SIZE / Math.max(mapWidth, mapHeight);
    const tx = Math.floor((e.clientX - rect.left) / scale);
    const ty = Math.floor((e.clientY - rect.top) / scale);
    onNavigate(tx, ty);
  }, [mapWidth, mapHeight, onNavigate]);

  const handleKeyDown = useCallback((event) => {
    if (!mapWidth || !mapHeight || !onNavigate) return;

    const horizontalStep = Math.max(8, Math.floor(viewport.w * 0.5));
    const verticalStep = Math.max(8, Math.floor(viewport.h * 0.5));
    const centerX = Math.floor(viewport.x + viewport.w / 2);
    const centerY = Math.floor(viewport.y + viewport.h / 2);

    let nextX = centerX;
    let nextY = centerY;

    if (event.key === 'ArrowLeft') nextX -= horizontalStep;
    else if (event.key === 'ArrowRight') nextX += horizontalStep;
    else if (event.key === 'ArrowUp') nextY -= verticalStep;
    else if (event.key === 'ArrowDown') nextY += verticalStep;
    else if (event.key === 'Home') {
      nextX = Math.floor(viewport.w / 2);
      nextY = Math.floor(viewport.h / 2);
    } else if (event.key === 'End') {
      nextX = mapWidth - Math.ceil(viewport.w / 2);
      nextY = mapHeight - Math.ceil(viewport.h / 2);
    } else {
      return;
    }

    event.preventDefault();
    onNavigate(
      Math.max(0, Math.min(mapWidth - 1, nextX)),
      Math.max(0, Math.min(mapHeight - 1, nextY)),
    );
  }, [mapWidth, mapHeight, onNavigate, viewport.h, viewport.w, viewport.x, viewport.y]);

  return (
    <div className="minimap-container">
      <div className="minimap-header">
        <span className="minimap-title">World Overview</span>
        <span className="minimap-hint">Click or use arrow keys</span>
      </div>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Minimap. Click to recenter the camera, or use arrow keys to move the viewport."
      />
      <div className="minimap-legend" aria-label="Terrain legend">
        {LEGEND_TERRAINS.map((terrainId) => (
          <span key={terrainId} className="minimap-legend-item">
            <span className="minimap-legend-swatch" style={{ background: rgbaToCss(TERRAIN_COLORS[terrainId]) }} aria-hidden="true" />
            <span>{TERRAIN_NAMES[terrainId]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
