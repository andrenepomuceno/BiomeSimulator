# Sprite Authoring Guide

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](sprites.md)
Return to [Documentation Home](../README.md).

Reusable guide for creating and refining animal sprite templates in `src/utils/sprites/animals/templates/`.

---

## Scope

Use this guide when you:

- Create a new animal template
- Refactor a template to use `helpers.js`
- Ask an AI assistant to improve sprite quality in future prompts

---

## Coordinate Model

- Design grid is `64x64`.
- Output sprite is upscaled to `256x256` (`SCALE=4`) automatically.
- Template coordinates are authored in native `64x64` space (`_CM=1`).
- `px()` clips outside `[0..63]` on both axes. Keep all design coordinates in bounds.

---

## Grounding And Anchor Rules

The renderer uses different vertical anchors by species capability:

- Terrestrial species: `anchor.y = 0.78`
- Flying species (`can_fly: true`): `anchor.y = 1.0`

Practical implication:

- For terrestrial side views, feet contact should end near `y ~= 50` on the 64x64 grid.
- For flying species, body can intentionally float above shadow. Do not force feet to `y ~= 50`.

Quick math:

$$
64 \times 0.78 \approx 49.92
$$

---

## File Boundaries

- Template drawing code belongs in `src/utils/sprites/animals/templates/*.js`.
- Shared pixel helpers belong in `src/utils/sprites/helpers.js`.
- Species capability (`can_fly`) belongs in species config under `src/utils/sprites/animals/species/` and engine species registries.
- Keep renderer/engine responsibilities separated. Sprite template code should not add simulation rules.

---

## Helper Catalog (helpers.js)

### Core Draw

- `px`, `rect`, `vline`, `hline`, `circle`, `ellipse`, `dither`

Use for primitive silhouettes, outlines, and low-level control.

### Color And Material

- `darken`, `lighten`, `blend`, `noise`, `saturate`
- `gradientV`, `gradientH`, `gradientRadial`
- `rimLight`, `ao`, `innerGlow`

Use for volume, depth, and surface readability.

### Texture / Surface

- `speckle`, `anisotropicSpeckle`, `crosshatch`, `stripes`, `feather`, `bevel`
- `scalePattern`

Use for feathers, scales, shell grain, rough skin, and stylized material breakup.

### Shape And Curves

- `roundRect`, `triangle`, `arc`, `leafShape`
- `quadraticLine`
- `fillPolygon`

Use for beaks, fins, tails, spikes, and irregular silhouettes.

### Segment / Organic Body Helpers

- `thickLine`
- `quadraticThick`
- `segmentChain`
- `shadedEllipse`

These are the preferred high-level helpers for modern templates:

- `shadedEllipse`: one-call body segment with highlight/shadow/texture.
- `segmentChain`: smooth connected segmented bodies (worms, snake abdomen, larva).
- `quadraticThick`: tapered organic curves (tails, antennae, proboscis).
- `thickLine`: limbs and articulated appendages without square stair-stepping.

### Post-process

- `addOutline`

Use cautiously for readability boosts; avoid over-darkening detailed sprites.

---

## Recommended Build Pattern Per Sprite

1. Block silhouette first (body, head, tail masses).
2. Place locomotion anchors (legs/wings/fins) with frame offsets.
3. Add material pass (gradients, texture, scutes, feather marks).
4. Add focal details (eyes, beak/mandible, tongue, claws).
5. Verify directional parity (`DOWN`, `UP`, `LEFT`, `RIGHT`).
6. Verify contact/anchor behavior (grounded vs flying).

---

## Animation Conventions

- Typical frame triplet is `0, 1, 2`.
- Use small offsets for readability, for example:
  - `legOff = 0 / -2 / +2`
  - `wingOff = -2 / 0 / +2`
  - `tailSway = 0 / -1 / +1`
- Keep motion coherent with anatomy. Avoid random per-frame noise that breaks silhouette identity.

---

## Quality Checklist

Before finalizing a sprite template:

- Species silhouette is distinguishable at gameplay zoom.
- Overhead and side views read as the same creature.
- No out-of-bounds coordinates are relied upon.
- Eye and mouth landmarks are consistently placed.
- Limb endpoints do not jitter excessively between frames.
- Terrestrial feet align near `y ~= 50` in side view.
- Flying species are not artificially grounded.
- No duplicated ad-hoc geometry if a helper can express it clearly.

---

## See Also

- [Rendering Layers](layers.md)
- [Renderer Overview](overview.md)
- [Engine Animal Species](../engine/animal-species.md)
