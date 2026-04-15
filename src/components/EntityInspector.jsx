/**
 * EntityInspector — shows details of selected entity or tile.
 */
import React, { useMemo } from 'react';
import useSimStore from '../store/simulationStore';
import { buildAnimalSpeciesConfig } from '../engine/animalSpecies';
import { buildFruitSpoilAges, buildStageAges, getPlantByTypeId } from '../engine/plantSpecies';
import { resolveTicksPerDay } from '../utils/time';
import { resolveTicksPerGameMinute } from '../utils/gameTime.js';
import AnimalInspector from './inspector/AnimalInspector.jsx';
import TileInspector from './inspector/TileInspector.jsx';

export default function EntityInspector({ onFocusEntity, requestAnimalDetail }) {
  const {
    selectedEntity,
    selectedTile,
    clearSelection,
    setSelectedEntity,
    clock,
    gameConfig,
  } = useSimStore();

  const ticksPerDay = resolveTicksPerDay(clock.ticks_per_day);
  const ticksPerGameMinute = resolveTicksPerGameMinute(ticksPerDay);
  const effectiveAnimalSpeciesConfig = useMemo(
    () => gameConfig?.animal_species || buildAnimalSpeciesConfig(ticksPerGameMinute),
    [gameConfig?.animal_species, ticksPerGameMinute],
  );
  const effectivePlantStageAges = useMemo(
    () => gameConfig?.plant_stage_ages || buildStageAges(ticksPerGameMinute),
    [gameConfig?.plant_stage_ages, ticksPerGameMinute],
  );
  const effectivePlantFruitSpoilAges = useMemo(
    () => gameConfig?.plant_fruit_spoil_ages || buildFruitSpoilAges(ticksPerGameMinute),
    [gameConfig?.plant_fruit_spoil_ages, ticksPerGameMinute],
  );

  if (selectedEntity) {
    return (
      <AnimalInspector
        entity={selectedEntity}
        clearSelection={clearSelection}
        onFocusEntity={onFocusEntity}
        requestAnimalDetail={requestAnimalDetail}
        setSelectedEntity={setSelectedEntity}
        clock={clock}
        gameConfig={gameConfig}
        speciesConfig={effectiveAnimalSpeciesConfig[selectedEntity.species]}
        ticksPerDay={ticksPerDay}
      />
    );
  }

  if (selectedTile) {
    return (
      <TileInspector
        tile={selectedTile}
        clearSelection={clearSelection}
        requestAnimalDetail={requestAnimalDetail}
        setSelectedEntity={setSelectedEntity}
        clock={clock}
        gameConfig={gameConfig}
        effectivePlantStageAges={effectivePlantStageAges}
        effectivePlantFruitSpoilAges={effectivePlantFruitSpoilAges}
        ticksPerDay={ticksPerDay}
        getPlantByTypeId={getPlantByTypeId}
      />
    );
  }

  return (
    <div className="sidebar-section entity-info">
      <h6>Inspector</h6>
      <div className="small text-muted">Click on a tile or entity to inspect</div>
    </div>
  );
}
