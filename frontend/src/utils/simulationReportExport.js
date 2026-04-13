import { DEFAULT_TICKS_PER_DAY } from '../constants/simulation.js';
import { buildDayLabel, resolveTicksPerDay, ticksToDay } from './time.js';
import { PLANT_TYPE_NAMES, SPECIES_INFO } from './terrainColors.js';

export const DIET_GROUPS = {
  Herbivore: ['RABBIT', 'SQUIRREL', 'BEETLE', 'GOAT', 'DEER', 'MOSQUITO', 'CATERPILLAR', 'CRICKET'],
  Carnivore: ['FOX', 'WOLF', 'SNAKE', 'HAWK', 'CROCODILE'],
  Omnivore: ['BOAR', 'BEAR', 'RACCOON', 'CROW', 'LIZARD'],
};

export function deriveSimulationReportData(statsHistory, ticksPerDay) {
  if (!statsHistory || statsHistory.length === 0) return null;

  const ticks = statsHistory.map(s => s.tick);
  const speciesKeys = Object.keys(SPECIES_INFO);
  const speciesData = {};
  speciesKeys.forEach(k => {
    speciesData[k] = statsHistory.map(s => (s.species && s.species[k]) || 0);
  });

  const dietData = {};
  Object.entries(DIET_GROUPS).forEach(([diet, speciesList]) => {
    dietData[diet] = statsHistory.map(s =>
      speciesList.reduce((sum, sp) => sum + ((s.species && s.species[sp]) || 0), 0)
    );
  });

  const plantsTotal = statsHistory.map(s => s.plants_total || 0);
  const fruits = statsHistory.map(s => s.fruits || 0);

  const peaks = {};
  const mins = {};
  speciesKeys.forEach(k => {
    const arr = speciesData[k];
    peaks[k] = Math.max(...arr);
    mins[k] = Math.min(...arr);
  });

  const totalAnimals = statsHistory.map(s =>
    speciesKeys.reduce((sum, k) => sum + ((s.species && s.species[k]) || 0), 0)
  );

  const diversity = statsHistory.map(s => {
    const counts = speciesKeys.map(k => (s.species && s.species[k]) || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return -counts.reduce((sum, c) => {
      if (c === 0) return sum;
      const p = c / total;
      return sum + p * Math.log(p);
    }, 0);
  });

  const extinctions = [];
  speciesKeys.forEach(k => {
    const arr = speciesData[k];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === 0 && arr[i - 1] > 0) {
        extinctions.push({ species: k, tick: ticks[i] });
      }
    }
  });

  const plantTypeKeys = Object.keys(PLANT_TYPE_NAMES).filter(k => k !== '0');
  const plantSpeciesData = {};
  plantTypeKeys.forEach(k => {
    plantSpeciesData[k] = statsHistory.map(s => (s.plant_types && s.plant_types[k]) || 0);
  });

  const plantPeaks = {};
  const plantMins = {};
  plantTypeKeys.forEach(k => {
    const arr = plantSpeciesData[k];
    plantPeaks[k] = Math.max(...arr);
    plantMins[k] = Math.min(...arr);
  });

  const tpd = resolveTicksPerDay(ticksPerDay);
  const tickLabels = ticks.map(t => buildDayLabel(t, tpd));

  return {
    ticks,
    tickLabels,
    speciesKeys,
    speciesData,
    dietData,
    plantsTotal,
    fruits,
    peaks,
    mins,
    totalAnimals,
    diversity,
    extinctions,
    plantTypeKeys,
    plantSpeciesData,
    plantPeaks,
    plantMins,
  };
}

export function buildSimulationReportText(data, ticksPerDay, generatedAt = new Date()) {
  if (!data) return '';

  const tpd = resolveTicksPerDay(ticksPerDay || DEFAULT_TICKS_PER_DAY);
  const lastTick = data.ticks[data.ticks.length - 1] || 0;
  const days = ticksToDay(lastTick, tpd);
  const currentTotal = data.totalAnimals[data.totalAnimals.length - 1] || 0;
  const peakTotal = Math.max(...data.totalAnimals);
  const currentDiversity = data.diversity[data.diversity.length - 1] || 0;
  const peakDiversity = Math.max(...data.diversity);
  const currentPlants = data.plantsTotal[data.plantsTotal.length - 1] || 0;
  const peakPlants = Math.max(...data.plantsTotal);
  const currentFruits = data.fruits[data.fruits.length - 1] || 0;

  const lines = [];
  lines.push('=== ECOGAME SIMULATION REPORT ===');
  lines.push(`Generated: ${generatedAt.toLocaleString()}`);
  lines.push('');

  lines.push('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  lines.push('\u2551         \ud83d\udcca SUMMARY               \u2551');
  lines.push('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  lines.push('');
  lines.push(`Simulation Time:  ${days} days (${lastTick.toLocaleString()} ticks)`);
  lines.push(`Total Animals:    ${currentTotal} (Peak: ${peakTotal})`);
  lines.push(`Living Plants:    ${currentPlants.toLocaleString()} (Peak: ${peakPlants.toLocaleString()})`);
  lines.push(`Fruiting Plants:  ${currentFruits.toLocaleString()}`);
  lines.push(`Biodiversity:     ${currentDiversity.toFixed(3)} (Peak: ${peakDiversity.toFixed(3)})`);
  const activeCount = data.speciesKeys.filter(k => (data.speciesData[k][data.speciesData[k].length - 1] || 0) > 0).length;
  lines.push(`Active Species:   ${activeCount} / ${data.speciesKeys.length}`);
  lines.push(`Extinction Events: ${data.extinctions.length}`);
  lines.push('');

  lines.push('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  lines.push('\u2551     \ud83d\udc3e POPULATION                \u2551');
  lines.push('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  lines.push('');

  lines.push('Animal Species Details:');
  lines.push('  ' + 'Species'.padEnd(14) + 'Current'.padStart(9) + 'Peak'.padStart(9) + 'Min'.padStart(9) + '  Diet'.padEnd(14) + 'Status');
  lines.push('  ' + '-'.repeat(68));
  data.speciesKeys.forEach(k => {
    const current = data.speciesData[k][data.speciesData[k].length - 1] || 0;
    const extinct = data.peaks[k] > 0 && current === 0;
    const status = data.peaks[k] === 0 ? 'Never spawned' : extinct ? 'Extinct' : 'Alive';
    const diet = Object.entries(DIET_GROUPS).find(([, list]) => list.includes(k));
    const dietName = diet ? diet[0] : '-';
    lines.push(
      '  ' + (SPECIES_INFO[k]?.name || k).padEnd(14) +
      String(current).padStart(9) +
      String(data.peaks[k]).padStart(9) +
      String(data.mins[k]).padStart(9) +
      '  ' + dietName.padEnd(12) + status
    );
  });
  lines.push('');

  const visibleSpecies = data.speciesKeys.filter(k => data.peaks[k] > 0);
  const step = Math.max(1, Math.floor(data.ticks.length / 150));
  const lastIdx = data.ticks.length - 1;
  const dietNames = Object.keys(DIET_GROUPS);

  lines.push('Total Animal Population Over Time:');
  let totalHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8) + 'Total'.padStart(8);
  dietNames.forEach(d => { totalHeader += d.slice(0, 9).padStart(11); });
  lines.push(totalHeader);
  lines.push('  ' + '-'.repeat(totalHeader.length - 2));

  for (let i = 0; i < data.ticks.length; i += step) {
    const day = ticksToDay(data.ticks[i], tpd);
    let row = '  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8) + String(data.totalAnimals[i]).padStart(8);
    dietNames.forEach(d => { row += String(data.dietData[d][i]).padStart(11); });
    lines.push(row);
  }
  if (lastIdx % step !== 0) {
    const day = ticksToDay(data.ticks[lastIdx], tpd);
    let row = '  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8) + String(data.totalAnimals[lastIdx]).padStart(8);
    dietNames.forEach(d => { row += String(data.dietData[d][lastIdx]).padStart(11); });
    lines.push(row);
  }
  lines.push('');

  lines.push('Per-Species Population Over Time:');
  const spNames = visibleSpecies.map(k => (SPECIES_INFO[k]?.name || k).slice(0, 8));
  let popHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8);
  spNames.forEach(n => { popHeader += n.padStart(9); });
  lines.push(popHeader);
  lines.push('  ' + '-'.repeat(popHeader.length - 2));

  for (let i = 0; i < data.ticks.length; i += step) {
    const day = ticksToDay(data.ticks[i], tpd);
    let row = '  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8);
    visibleSpecies.forEach(k => { row += String(data.speciesData[k][i]).padStart(9); });
    lines.push(row);
  }
  if (lastIdx % step !== 0) {
    const day = ticksToDay(data.ticks[lastIdx], tpd);
    let row = '  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8);
    visibleSpecies.forEach(k => { row += String(data.speciesData[k][lastIdx]).padStart(9); });
    lines.push(row);
  }
  lines.push('');

  lines.push('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  lines.push('\u2551      \u2696 ECOSYSTEM BALANCE         \u2551');
  lines.push('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  lines.push('');

  lines.push('Biodiversity (Shannon Index) Over Time:');
  let divHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8) + 'Diversity'.padStart(11);
  lines.push(divHeader);
  lines.push('  ' + '-'.repeat(divHeader.length - 2));

  for (let i = 0; i < data.ticks.length; i += step) {
    const day = Math.floor(data.ticks[i] / tpd);
    lines.push('  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8) + data.diversity[i].toFixed(3).padStart(11));
  }
  if (lastIdx % step !== 0) {
    const day = Math.floor(data.ticks[lastIdx] / tpd);
    lines.push('  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8) + data.diversity[lastIdx].toFixed(3).padStart(11));
  }
  lines.push('');

  if (data.extinctions.length > 0) {
    lines.push('Extinction Events:');
    data.extinctions.forEach(ev => {
      const day = Math.floor(ev.tick / tpd);
      lines.push(`  Day ${day} (tick ${ev.tick}): ${SPECIES_INFO[ev.species]?.name || ev.species} went extinct`);
    });
    lines.push('');
  }

  lines.push('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  lines.push('\u2551          \ud83c\udf3f FLORA                \u2551');
  lines.push('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
  lines.push('');

  lines.push('Plant Species Details:');
  lines.push('  ' + 'Species'.padEnd(16) + 'Current'.padStart(9) + 'Peak'.padStart(9) + 'Min'.padStart(9) + '  Status');
  lines.push('  ' + '-'.repeat(56));
  data.plantTypeKeys.forEach(k => {
    const arr = data.plantSpeciesData[k];
    const current = arr[arr.length - 1] || 0;
    const peak = data.plantPeaks[k];
    const min = data.plantMins[k];
    const status = peak === 0 ? 'Never seeded' : (peak > 0 && current === 0) ? 'Extinct' : 'Growing';
    lines.push(
      '  ' + (PLANT_TYPE_NAMES[k] || `Type ${k}`).padEnd(16) +
      String(current).padStart(9) +
      String(peak).padStart(9) +
      String(min).padStart(9) +
      '  ' + status
    );
  });
  lines.push('');

  lines.push('Plant Population Over Time:');
  let floraHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8) + 'Plants'.padStart(9) + 'Fruiting'.padStart(10);
  lines.push(floraHeader);
  lines.push('  ' + '-'.repeat(floraHeader.length - 2));

  for (let i = 0; i < data.ticks.length; i += step) {
    const day = Math.floor(data.ticks[i] / tpd);
    lines.push(
      '  ' + String(day).padStart(5) +
      String(data.ticks[i]).padStart(8) +
      String(data.plantsTotal[i]).padStart(9) +
      String(data.fruits[i]).padStart(10)
    );
  }
  if (lastIdx % step !== 0) {
    const day = Math.floor(data.ticks[lastIdx] / tpd);
    lines.push(
      '  ' + String(day).padStart(5) +
      String(data.ticks[lastIdx]).padStart(8) +
      String(data.plantsTotal[lastIdx]).padStart(9) +
      String(data.fruits[lastIdx]).padStart(10)
    );
  }
  lines.push('');

  const visiblePlants = data.plantTypeKeys.filter(k => data.plantPeaks[k] > 0);
  if (visiblePlants.length > 0) {
    lines.push('Plant Species Over Time:');
    const pNames = visiblePlants.map(k => (PLANT_TYPE_NAMES[k] || `T${k}`).slice(0, 10));
    let pHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8);
    pNames.forEach(n => { pHeader += n.padStart(11); });
    lines.push(pHeader);
    lines.push('  ' + '-'.repeat(pHeader.length - 2));

    for (let i = 0; i < data.ticks.length; i += step) {
      const day = Math.floor(data.ticks[i] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8);
      visiblePlants.forEach(k => { row += String(data.plantSpeciesData[k][i]).padStart(11); });
      lines.push(row);
    }
    if (lastIdx % step !== 0) {
      const day = Math.floor(data.ticks[lastIdx] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8);
      visiblePlants.forEach(k => { row += String(data.plantSpeciesData[k][lastIdx]).padStart(11); });
      lines.push(row);
    }
    lines.push('');
  }

  lines.push('=== END OF REPORT ===');
  return lines.join('\n');
}
