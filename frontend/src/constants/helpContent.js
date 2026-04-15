import {
  WATER,
  SAND,
  SOIL,
  FERTILE_SOIL,
  DEEP_WATER,
  MOUNTAIN,
  MUD,
  TERRAIN_NAMES,
  PLANT_TYPE_NAMES,
  SPECIES_INFO,
} from '../utils/terrainColors.js';

const TOOL_REFERENCE = [
  {
    label: '🔍 Select',
    value: 'Click an animal, plant, or tile to inspect live data in the right sidebar.',
    note: 'Shortcut: 1. Use this when you want to understand what the simulation is doing right now.',
  },
  {
    label: '🎨 Paint',
    value: 'Replace terrain tiles to reshape coastlines, water access, and movement lanes.',
    note: 'Shortcut: 2. Small terrain edits can completely change where plants grow and how animals travel.',
  },
  {
    label: '🐾 Place',
    value: 'Spawn animals or plants directly into the world.',
    note: 'Shortcut: 3. Useful for setting up experiments or repopulating a region after a collapse.',
  },
  {
    label: '🗑️ Erase',
    value: 'Remove animals or clean up cluttered areas of the map.',
    note: 'Shortcut: 4. Use carefully when you want to isolate one species or simplify a test.',
  },
];

const SHORTCUT_REFERENCE = [
  {
    label: 'Space',
    value: 'Start, resume, or pause the simulation.',
    note: 'This is the fastest way to move between observing and editing.',
  },
  {
    label: 'N',
    value: 'Advance the simulation by one tick while paused.',
    note: 'Use this when you want to inspect a single decision, movement, or interaction at a time.',
  },
  {
    label: '[ / ]',
    value: 'Decrease or increase the simulation speed in 5 TPS steps.',
    note: 'Keyboard speed changes use the same 1 to 60 TPS range as the toolbar slider.',
  },
  {
    label: 'Escape',
    value: 'Close the current major modal, or open the menu if no modal is active.',
    note: 'Works for the menu, guide, config (including its audio tab), report, and entity summary window.',
  },
  {
    label: 'G / R / C / E',
    value: 'Toggle the Guide, Report, Config, and Entity Summary panels directly.',
    note: 'These modal shortcuts still work while another major modal is open so you can switch context quickly.',
  },
  {
    label: 'M',
    value: 'Mute or unmute audio output instantly.',
    note: 'This toggles the same persisted mute setting used by the configuration modal.',
  },
  {
    label: '1 / 2 / 3 / 4',
    value: 'Switch directly between Select, Paint, Place, and Erase.',
    note: 'Tool shortcuts are disabled while a major modal is open so typing and navigation stay predictable.',
  },
  {
    label: 'W / A / S / D or Arrow Keys',
    value: 'Pan the camera continuously while the key is held.',
    note: 'This gives you keyboard navigation without needing to drag the canvas.',
  },
  {
    label: '+ / -',
    value: 'Zoom the camera in or out from the current view.',
    note: 'Keyboard zoom uses the same 1.15x step as the mouse wheel.',
  },
  {
    label: 'Ctrl/Cmd + Z / Y',
    value: 'Undo or redo the most recent terrain painting operation.',
    note: 'History is terrain-only for now and resets when a new world is generated or loaded.',
  },
];

const SIMULATION_CONTROL_REFERENCE = [
  {
    label: 'Start / Resume',
    value: 'Run the ecosystem continuously.',
    note: 'Best for seeing broader population trends and movement patterns.',
  },
  {
    label: 'Pause',
    value: 'Freeze the world so you can inspect tiles, animals, and panels safely.',
    note: 'Pause before editing if you want predictable before-and-after comparisons.',
  },
  {
    label: 'Step',
    value: 'Advance the simulation by one tick while paused.',
    note: 'Ideal for checking how a single action changes hunger, thirst, or position.',
  },
  {
    label: 'Reset',
    value: 'Stop the current run and return to a paused starting state.',
    note: 'Use the menu after reset when you want a completely new world.',
  },
  {
    label: 'Speed Slider',
    value: 'Change the simulation ticks per second.',
    note: 'Lower speeds are better for learning. Higher speeds are better for long trends.',
  },
  {
    label: 'Config',
    value: 'Open the unified settings modal: runtime config, audio controls/log, and background execution behavior.',
    note: 'Use this when you want the current world baseline, control audio output, or change hidden-tab pause behavior.',
  },
];

const NEEDS_REFERENCE = [
  {
    title: '⚡ Energy',
    body: 'Every action spends energy. When energy hits zero, the animal must sleep to recover before it can reliably act again.',
  },
  {
    title: '🍗 Hunger',
    body: 'Hunger rises over time. Herbivores look for plants, carnivores hunt prey, and omnivores can adapt to both sources.',
  },
  {
    title: '💧 Thirst',
    body: 'Animals still need access to water even if food is nearby. Water-heavy maps often create safer survival loops.',
  },
  {
    title: '❤️ HP',
    body: 'HP drops when animals starve, dehydrate, or lose fights. Low HP is often a late symptom of earlier resource problems.',
  },
];

function buildDietExamples(diet) {
  return Object.values(SPECIES_INFO)
    .filter(species => species.diet === diet)
    .slice(0, 4)
    .map(species => `${species.emoji} ${species.name}`)
    .join(', ');
}

const DIET_REFERENCE = [
  {
    label: 'Herbivores',
    value: buildDietExamples('Herbivore'),
    note: 'Depend on plant availability and safe routes between food and water.',
  },
  {
    label: 'Omnivores',
    value: buildDietExamples('Omnivore'),
    note: 'Adapt well and often become strong survivors when one food source disappears.',
  },
  {
    label: 'Carnivores',
    value: buildDietExamples('Carnivore'),
    note: 'Need prey populations to stay healthy, so they usually rise after herbivores expand.',
  },
];

const TERRAIN_REFERENCE = [
  {
    label: TERRAIN_NAMES[WATER],
    value: 'Core drinking resource and a natural movement barrier for many land animals.',
  },
  {
    label: TERRAIN_NAMES[SAND],
    value: 'Usually a transition zone. Useful for coastlines but not as productive as fertile land.',
  },
  {
    label: TERRAIN_NAMES[SOIL],
    value: 'A dependable base for general plant growth and animal travel.',
  },
  {
    label: TERRAIN_NAMES[FERTILE_SOIL],
    value: 'One of the best surfaces for sustaining dense plant life and herbivore traffic.',
  },
  {
    label: TERRAIN_NAMES[MUD],
    value: 'Often slows or complicates routes, creating natural chokepoints near wet areas.',
  },
  {
    label: TERRAIN_NAMES[MOUNTAIN],
    value: 'Creates hard edges and habitat boundaries that some species can cross better than others.',
  },
  {
    label: TERRAIN_NAMES[DEEP_WATER],
    value: 'A stronger water barrier that separates regions and can trap populations on small land pockets.',
  },
];

const PLANT_REFERENCE = [
  {
    label: `${PLANT_TYPE_NAMES[1]}, ${PLANT_TYPE_NAMES[2]}, ${PLANT_TYPE_NAMES[6]}`,
    value: 'Fast, approachable plant examples for testing herbivore feeding behavior.',
  },
  {
    label: `${PLANT_TYPE_NAMES[4]}, ${PLANT_TYPE_NAMES[10]}, ${PLANT_TYPE_NAMES[12]}`,
    value: 'Longer-lived plants that shape stable food pockets over time.',
  },
  {
    label: `${PLANT_TYPE_NAMES[7]}, ${PLANT_TYPE_NAMES[8]}, ${PLANT_TYPE_NAMES[15]}`,
    value: 'Fruit-bearing or seasonal-looking plants that help make local abundance visible.',
  },
];

const MAJOR_PANEL_CARDS = [
  {
    title: '☰ Menu',
    body: 'Create a new world, adjust map and population settings, or save and load a state file.',
  },
  {
    title: '❓ Guide',
    body: 'Use this modal as the fast explanation layer for controls, systems, and panel meanings.',
  },
  {
    title: '⚙ Config',
    body: 'Inspect the active world configuration, including live timing and multiplier values, without editing them here.',
  },
  {
    title: '📈 Report',
    body: 'Open historical charts when you want to compare trends instead of only reading the current frame.',
  },
  {
    title: '📋 Entities',
    body: 'Browse animals and plants in one place, then jump directly to the item you want to inspect.',
  },
];

const SIDEBAR_PANEL_CARDS = [
  {
    title: '🗺️ Minimap',
    body: 'Shows overall terrain shape and lets you reposition the camera quickly.',
  },
  {
    title: '📊 Stats Panel',
    body: 'Summarizes live populations so you can spot booms and crashes without opening the full report.',
  },
  {
    title: '🔬 Entity Inspector',
    body: 'Best place to understand an individual animal, a plant tile, or the terrain under your cursor.',
  },
  {
    title: '🧰 Terrain Editor',
    body: 'Holds brush size, terrain selection, and entity placement controls for direct world editing.',
  },
];

const READING_TIPS = [
  'Use the inspector for current state, then open Report to see whether that local pattern is becoming a larger trend.',
  'When a species collapses, compare food supply, nearby water, and predator pressure before assuming combat is the cause.',
  'If a map feels quiet, increase speed for a while, then pause and inspect the busiest clusters.',
];

export const HELP_TABS = [
  {
    id: 'getting-started',
    label: '🚀 Getting Started',
    title: 'Learn the island in one run',
    intro: 'BiomeSimulator is easiest to read when you alternate between letting the world run and pausing to inspect what changed.',
    chips: ['Generate a world', 'Run one day', 'Inspect a herbivore', 'Open the report'],
    callout: {
      title: 'Best first session',
      body: 'Start the default world, let one in-game day pass, click an animal, inspect one plant tile, then open the Report to compare the local view against the historical trends.',
    },
    sections: [
      {
        heading: 'What is BiomeSimulator?',
        body: 'BiomeSimulator is a sandbox ecosystem game where animals, plants, and terrain interact in real time. Species survive by balancing energy, hunger, thirst, safety, and reproduction while the food chain shifts around them. You play as an observer and world shaper: run the simulation, inspect behavior, and edit the map to see how the ecosystem responds.',
      },
      {
        heading: 'Quick loop',
        bullets: [
          'Open the menu and generate a world if you want a fresh ecosystem.',
          'Press Start or hit Space to begin simulation time.',
          'Use Select to inspect animals, plants, and terrain as soon as something interesting happens.',
          'Pause often and read the inspector before making edits, so cause and effect stay clear.',
          'Open Report or Entities once the world becomes busy and local inspection is no longer enough.',
        ],
      },
      {
        heading: 'What you are looking at',
        body: 'The center canvas shows the living world. The left sidebar helps you navigate and read broad population health, while the right sidebar explains the currently selected thing in detail.',
        cards: [
          {
            title: 'World Canvas',
            body: 'Terrain, plants, animals, and moment-to-moment movement all live here.',
          },
          {
            title: 'Left Sidebar',
            body: 'Use the minimap and live counts to understand where the action is building.',
          },
          {
            title: 'Right Sidebar',
            body: 'Inspect exact vitals, terrain details, and editing tools without leaving the main screen.',
          },
        ],
      },
      {
        heading: 'Good first experiments',
        bullets: [
          'Paint a narrow water channel and watch how it changes animal routes.',
          'Place a few extra herbivores and see whether predators eventually follow.',
          'Raise the speed, wait for a shift in population, then pause and inspect the busiest tile cluster.',
        ],
      },
    ],
  },
  {
    id: 'controls',
    label: '🎮 Controls',
    title: 'Run, inspect, and edit without guessing',
    intro: 'The toolbar controls time, the active editor tool, and access to the larger modal views. Most learning happens by switching between these controls quickly.',
    chips: ['Space to play/pause', 'Escape for modal control', '1-4 for tools', 'Edit live terrain'],
    sections: [
      {
        heading: 'Simulation controls',
        rows: SIMULATION_CONTROL_REFERENCE,
      },
      {
        heading: 'Editor tools',
        rows: TOOL_REFERENCE,
      },
      {
        heading: 'Keyboard shortcuts',
        rows: SHORTCUT_REFERENCE,
      },
    ],
  },
  {
    id: 'ecosystem-basics',
    label: '🌿 Ecosystem Basics',
    title: 'Read the main survival loops',
    intro: 'Visible ecosystem behavior comes from a few pressures repeating over time: needs, terrain access, food chains, and safe movement.',
    chips: ['Needs drive behavior', 'Water shapes survival', 'Plants feed the base', 'Predators follow prey'],
    callout: {
      title: 'Read systems in order',
      body: 'If an animal looks weak, check energy, hunger, and thirst first. If a whole species looks weak, inspect its terrain access and food supply next.',
    },
    sections: [
      {
        heading: 'Core needs',
        cards: NEEDS_REFERENCE,
      },
      {
        heading: 'How animals choose actions',
        bullets: [
          'Animals keep ongoing actions such as sleeping, eating, or drinking until those actions finish.',
          'Urgent thirst and hunger usually outrank calmer behaviors like wandering or mating.',
          'Threats can force prey species to flee before they deal with other goals.',
          'Low energy pushes animals toward rest even if food and water are nearby.',
          'When needs are stable, animals can search proactively, roam, or look for mates.',
        ],
      },
      {
        heading: 'Diet groups',
        rows: DIET_REFERENCE,
      },
      {
        heading: 'Terrain and plants',
        rows: TERRAIN_REFERENCE,
        secondaryRows: PLANT_REFERENCE,
        secondaryTitle: 'Plant examples',
      },
    ],
  },
  {
    id: 'panels-and-data',
    label: '📊 Panels & Data',
    title: 'Know where each answer lives',
    intro: 'The app already separates immediate facts from long-range trends. The fastest way to understand the simulation is to open the panel that matches your question.',
    chips: ['Use local data first', 'Then confirm with trends', 'Inspect outliers', 'Navigate by minimap'],
    sections: [
      {
        heading: 'Major panels',
        cards: MAJOR_PANEL_CARDS,
      },
      {
        heading: 'Always-on side panels',
        cards: SIDEBAR_PANEL_CARDS,
      },
      {
        heading: 'How to read the data',
        bullets: READING_TIPS,
      },
    ],
  },
];