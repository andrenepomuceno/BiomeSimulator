"""Terrain map generator using vectorized Perlin-like noise (pure NumPy)."""

import numpy as np
from collections import deque

from engine.world import WATER, SAND, DIRT, GRASS, ROCK


def generate_terrain(config):
    """Generate a terrain grid with natural-looking islands.

    Returns:
        terrain: numpy uint8 array (height, width)
        water_proximity: numpy uint8 array (height, width) — distance to nearest water
    """
    w = config["map_width"]
    h = config["map_height"]
    sea_level = config.get("sea_level", 0.38)
    island_count = config.get("island_count", 5)
    island_size = config.get("island_size_factor", 0.3)
    seed = config.get("seed") or np.random.randint(0, 2**31)

    rng = np.random.RandomState(seed)

    # Generate base heightmap with multi-octave gradient noise (fully vectorized)
    heightmap = _fbm_noise(w, h, seed=seed, octaves=6, scale=0.005)

    # Generate island mask — blend of circular islands
    island_mask = _generate_island_mask(w, h, island_count, island_size, rng)

    # Combine: heightmap * island mask
    combined = heightmap * island_mask

    # Normalize to 0..1
    cmin, cmax = combined.min(), combined.max()
    if cmax - cmin > 0:
        combined = (combined - cmin) / (cmax - cmin)
    else:
        combined = np.zeros_like(combined)

    # Classify terrain
    terrain = np.full((h, w), WATER, dtype=np.uint8)
    terrain[combined > sea_level] = SAND
    terrain[combined > sea_level + 0.05] = DIRT
    terrain[combined > sea_level + 0.12] = GRASS
    terrain[combined > sea_level + 0.45] = ROCK

    # Add secondary noise for terrain variation
    detail_noise = _fbm_noise(w, h, seed=seed + 9999, octaves=3, scale=0.015)
    # Scatter some sand/dirt patches within grass areas
    grass_mask = terrain == GRASS
    terrain[grass_mask & (detail_noise > 0.55)] = DIRT
    # Add some rock outcrops
    terrain[grass_mask & (detail_noise < -0.6)] = ROCK

    # Compute water proximity via BFS
    water_proximity = _compute_water_proximity(terrain, max_dist=255)

    return terrain, water_proximity, seed


# ---------------------------------------------------------------------------
# Pure-NumPy vectorized gradient noise (Perlin-like)
# ---------------------------------------------------------------------------

def _perlin_noise_2d(w, h, seed=0, scale=0.01):
    """Single-octave 2D gradient noise, fully vectorized with NumPy."""
    rng = np.random.RandomState(seed)

    # Build coordinate grid scaled
    xs = np.arange(w, dtype=np.float64) * scale
    ys = np.arange(h, dtype=np.float64) * scale
    gx, gy = np.meshgrid(xs, ys)  # (h, w)

    # Integer grid coords
    x0 = np.floor(gx).astype(np.int32)
    y0 = np.floor(gy).astype(np.int32)
    x1 = x0 + 1
    y1 = y0 + 1

    # Fractional parts
    fx = gx - x0.astype(np.float64)
    fy = gy - y0.astype(np.float64)

    # Smoothstep fade: 6t^5 - 15t^4 + 10t^3
    sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)

    # Random gradient table (large enough)
    max_coord = max(int(np.max(x1)) + 1, int(np.max(y1)) + 1, 2)
    table_size = max_coord + 256
    perm = rng.permutation(table_size).astype(np.int32)
    # Gradient vectors: random unit-ish vectors via angle
    angles = rng.uniform(0, 2 * np.pi, table_size)
    grad_x = np.cos(angles)
    grad_y = np.sin(angles)

    def _hash(ix, iy):
        """Hash grid coordinates to gradient index."""
        return perm[(perm[ix % table_size] + iy) % table_size]

    def _dot_grad(ix, iy, dx, dy):
        """Dot product of gradient at (ix,iy) with offset (dx,dy)."""
        idx = _hash(ix, iy)
        return grad_x[idx] * dx + grad_y[idx] * dy

    # Dot products at 4 corners
    n00 = _dot_grad(x0, y0, fx, fy)
    n10 = _dot_grad(x1, y0, fx - 1, fy)
    n01 = _dot_grad(x0, y1, fx, fy - 1)
    n11 = _dot_grad(x1, y1, fx - 1, fy - 1)

    # Bilinear interpolation with smoothstep
    nx0 = n00 + sx * (n10 - n00)
    nx1 = n01 + sx * (n11 - n01)
    result = nx0 + sy * (nx1 - nx0)

    return result


def _fbm_noise(w, h, seed=0, octaves=4, scale=0.005, lacunarity=2.0, persistence=0.5):
    """Fractal Brownian Motion — multi-octave gradient noise."""
    result = np.zeros((h, w), dtype=np.float64)
    amplitude = 1.0
    total_amp = 0.0
    freq = scale

    for i in range(octaves):
        octave = _perlin_noise_2d(w, h, seed=seed + i * 31, scale=freq)
        result += amplitude * octave
        total_amp += amplitude
        amplitude *= persistence
        freq *= lacunarity

    return result / total_amp


def _generate_island_mask(w, h, island_count, size_factor, rng):
    """Create a mask with multiple island-shaped blobs."""
    mask = np.zeros((h, w), dtype=np.float64)
    cx_base, cy_base = w / 2, h / 2
    max_dim = max(w, h)

    for _ in range(island_count):
        # Random island center, biased toward center of map
        ix = rng.normal(cx_base, w * 0.25)
        iy = rng.normal(cy_base, h * 0.25)
        # Random island radius
        ir = max_dim * size_factor * rng.uniform(0.3, 1.0)

        # Distance from this island center for each cell
        ys = np.arange(h)[:, None]
        xs = np.arange(w)[None, :]
        dist = np.sqrt((xs - ix) ** 2 + (ys - iy) ** 2)

        # Smooth falloff
        contrib = np.clip(1.0 - (dist / ir) ** 2, 0, 1)
        mask = np.maximum(mask, contrib)

    return mask


def _compute_water_proximity(terrain, max_dist=255):
    """BFS from all water tiles to compute distance to nearest water."""
    h, w = terrain.shape
    dist = np.full((h, w), max_dist, dtype=np.uint8)

    queue = deque()
    water_mask = terrain == WATER
    ys, xs = np.where(water_mask)
    for y, x in zip(ys, xs):
        dist[y, x] = 0
        queue.append((y, x))

    while queue:
        cy, cx = queue.popleft()
        cd = dist[cy, cx]
        if cd >= max_dist - 1:
            continue
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w:
                nd = cd + 1
                if nd < dist[ny, nx]:
                    dist[ny, nx] = nd
                    queue.append((ny, nx))

    return dist
