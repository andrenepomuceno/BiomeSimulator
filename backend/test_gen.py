"""Quick test: generate terrain and verify it works."""
import sys
sys.path.insert(0, '.')

from engine.map_generator import generate_terrain
from config import DEFAULT_CONFIG
import numpy as np

print("Generating 1000x1000 terrain...")
t, w, s = generate_terrain(DEFAULT_CONFIG)
print(f"Terrain shape: {t.shape}")

unique, counts = np.unique(t, return_counts=True)
for u, c in zip(unique, counts):
    names = {0: 'WATER', 1: 'SAND', 2: 'DIRT', 3: 'GRASS', 4: 'ROCK'}
    print(f"  {names.get(u, u)}: {c} ({c/t.size*100:.1f}%)")

print(f"Water proximity range: {w.min()}-{w.max()}")
print(f"Seed: {s}")
print("OK!")
