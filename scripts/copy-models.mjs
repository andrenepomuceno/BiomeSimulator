#!/usr/bin/env node
/**
 * copy-models.mjs
 *
 * Copies all 3D model assets referenced by the ThreeRenderer from the
 * `3dmodels/` source packs into `public/model-assets/`.
 *
 * Run from the project root:
 *   node scripts/copy-models.mjs
 *
 * Sources are keyed by the pack folder name under `3dmodels/`.
 * Each entry maps a destination path (relative to `public/model-assets/`)
 * to a source path (relative to the pack root).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '3dmodels');
const DEST = path.join(ROOT, 'public', 'model-assets');

// ---------------------------------------------------------------------------
// Model manifest — every model asset used by the renderer.
// Format: { packFolder: { 'dest/file': 'src/file', ... } }
// ---------------------------------------------------------------------------

const MANIFEST = {
  // ---------- Nature (kenney_nature-kit) ----------
  'kenney_nature-kit': {
    'nature/tree_oak.glb':          'Models/GLTF format/tree_oak.glb',
    'nature/tree_default.glb':      'Models/GLTF format/tree_default.glb',
    'nature/tree_detailed.glb':     'Models/GLTF format/tree_detailed.glb',
    'nature/tree_oak_dark.glb':     'Models/GLTF format/tree_oak_dark.glb',
    'nature/tree_palm.glb':         'Models/GLTF format/tree_palm.glb',
    'nature/stump_round.glb':       'Models/GLTF format/stump_round.glb',
    'nature/grass_leafs.glb':       'Models/GLTF format/grass_leafs.glb',
    'nature/plant_bushSmall.glb':   'Models/GLTF format/plant_bushSmall.glb',
    'nature/plant_bushDetailed.glb': 'Models/GLTF format/plant_bushDetailed.glb',
    'nature/crop_carrot.glb':       'Models/GLTF format/crop_carrot.glb',
    'nature/flower_yellowC.glb':    'Models/GLTF format/flower_yellowC.glb',
    'nature/flower_purpleB.glb':    'Models/GLTF format/flower_purpleB.glb',
    'nature/mushroom_red.glb':      'Models/GLTF format/mushroom_red.glb',
    'nature/cactus_tall.glb':       'Models/GLTF format/cactus_tall.glb',
    'nature/crops_leafsStageA.glb': 'Models/GLTF format/crops_leafsStageA.glb',
    'nature/LICENSE_kenney_nature-kit.txt': 'License.txt',
  },

  // ---------- Food items (kenney_food-kit) ----------
  'kenney_food-kit': {
    'nature/tomato.glb':            'Models/GLB format/tomato.glb',
    'nature/pepper.glb':            'Models/GLB format/pepper.glb',
    'nature/Textures/colormap.png': 'Models/GLB format/Textures/colormap.png',
    'items/meat-cooked.glb':        'Models/GLB format/meat-cooked.glb',
    'items/apple.glb':              'Models/GLB format/apple.glb',
    'items/pumpkin-basic.glb':      'Models/GLB format/pumpkin-basic.glb',
    'items/Textures/colormap.png':  'Models/GLB format/Textures/colormap.png',
    'items/LICENSE_kenney_food-kit.txt': 'License.txt',
    'nature/LICENSE_kenney_food-kit.txt': 'License.txt',
  },

  // ---------- Animals (kenney_cube-pets) ----------
  'kenney_cube-pets_1.0': {
    'animals/animal-beaver.glb':     'Models/GLB format/animal-beaver.glb',
    'animals/animal-bee.glb':        'Models/GLB format/animal-bee.glb',
    'animals/animal-bunny.glb':      'Models/GLB format/animal-bunny.glb',
    'animals/animal-cat.glb':        'Models/GLB format/animal-cat.glb',
    'animals/animal-caterpillar.glb': 'Models/GLB format/animal-caterpillar.glb',
    'animals/animal-cow.glb':        'Models/GLB format/animal-cow.glb',
    'animals/animal-crab.glb':       'Models/GLB format/animal-crab.glb',
    'animals/animal-deer.glb':       'Models/GLB format/animal-deer.glb',
    'animals/animal-dog.glb':        'Models/GLB format/animal-dog.glb',
    'animals/animal-fox.glb':        'Models/GLB format/animal-fox.glb',
    'animals/animal-hog.glb':        'Models/GLB format/animal-hog.glb',
    'animals/animal-parrot.glb':     'Models/GLB format/animal-parrot.glb',
    'animals/animal-polar.glb':      'Models/GLB format/animal-polar.glb',
    'animals/Textures/colormap.png': 'Models/GLB format/Textures/colormap.png',
    'animals/LICENSE_kenney_cube-pets.txt': 'License.txt',
  },
};

// ---------------------------------------------------------------------------
// Copy logic
// ---------------------------------------------------------------------------

let copied = 0;
let skipped = 0;
let errors = 0;

for (const [packFolder, files] of Object.entries(MANIFEST)) {
  const packDir = path.join(SRC, packFolder);
  if (!fs.existsSync(packDir)) {
    console.warn(`[SKIP] Pack not found: ${packFolder}`);
    skipped += Object.keys(files).length;
    continue;
  }

  for (const [destRel, srcRel] of Object.entries(files)) {
    const srcPath = path.join(packDir, srcRel);
    const destPath = path.join(DEST, destRel);

    if (!fs.existsSync(srcPath)) {
      console.error(`[ERROR] Source missing: ${srcPath}`);
      errors++;
      continue;
    }

    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    copied++;
  }
}

console.log(`\nDone. Copied: ${copied}, Skipped: ${skipped}, Errors: ${errors}`);
if (errors > 0) process.exit(1);
