# Emoji Textures (`utils/emojiTextures.js`)

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](emoji-textures.md)
Return to [Documentation Home](../README.md).

Generates PIXI textures from emoji characters via offscreen canvas.

| Function | Returns |
|----------|---------|
| `generateEmojiTextures()` | `{RABBIT, SQUIRREL, ..., SLEEPING, DEAD}` — 13 animal textures |
| `generatePlantEmojiTextures()` | `{'${type}_${stage}': Texture}` — 24 plant textures |

**Implementation details:**

- 64×64px canvas per emoji
- Cached as singletons (lazy-loaded on first use)
- `LINEAR` scale mode for smooth appearance at all zoom levels
