import { AnimalState, LifeStage } from './entities.js';

const DEFAULT_FULL_AUDIT_INTERVAL_TICKS = 30;
const DEFAULT_SAMPLE_LIMIT = 5;
const DEFAULT_LOG_COOLDOWN_TICKS = 120;
const MAX_PLANT_STAGE = 6;

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function tileCoords(tileIndex, width) {
  return {
    x: tileIndex % width,
    y: Math.floor(tileIndex / width),
  };
}

export class SimulationSupervisor {
  constructor(config = {}) {
    this.enabled = config.supervisor_enabled !== false;
    this.fullAuditIntervalTicks = toPositiveInteger(
      config.supervisor_full_audit_interval_ticks,
      DEFAULT_FULL_AUDIT_INTERVAL_TICKS,
    );
    this.sampleLimit = toPositiveInteger(config.supervisor_sample_limit, DEFAULT_SAMPLE_LIMIT);
    this.logCooldownTicks = toPositiveInteger(
      config.supervisor_log_cooldown_ticks,
      DEFAULT_LOG_COOLDOWN_TICKS,
    );

    this._animalTileCounts = new Map();
    this._eggTileCounts = new Map();
    this._samples = [];
    this._sampleCounts = Object.create(null);
    this._countsByType = Object.create(null);
    this._issueCount = 0;
    this._lastLoggedTick = -Infinity;
    this._latestReport = null;
  }

  reset() {
    this._animalTileCounts.clear();
    this._eggTileCounts.clear();
    this._samples.length = 0;
    this._sampleCounts = Object.create(null);
    this._countsByType = Object.create(null);
    this._issueCount = 0;
    this._lastLoggedTick = -Infinity;
    this._latestReport = null;
  }

  shouldAudit(tick) {
    return this.enabled && tick > 0 && (tick % this.fullAuditIntervalTicks) === 0;
  }

  skipAudit(tick, phase = 'tickCleanup') {
    const report = {
      audited: false,
      tick,
      phase,
      issueCount: 0,
      countsByType: {},
      samples: [],
      animalsAudited: 0,
      cellsAudited: 0,
      shouldLog: false,
    };
    this._latestReport = report;
    return report;
  }

  getLatestReport() {
    return this._latestReport;
  }

  audit(world, spatialHash, phase = 'tickCleanup') {
    this._resetScratch();

    let animalsAudited = 0;
    for (const animal of world.animals) {
      animalsAudited++;
      this._auditAnimal(world, spatialHash, animal);
    }

    this._auditEggOverlaps(world);
    const cellsAudited = this._auditCells(world);

    const tick = world.clock.tick;
    const shouldLog = this._issueCount > 0 && (tick - this._lastLoggedTick) >= this.logCooldownTicks;
    if (shouldLog) this._lastLoggedTick = tick;

    const report = {
      audited: true,
      tick,
      phase,
      issueCount: this._issueCount,
      countsByType: { ...this._countsByType },
      samples: this._samples.slice(),
      animalsAudited,
      cellsAudited,
      shouldLog,
    };
    this._latestReport = report;
    return report;
  }

  _resetScratch() {
    this._animalTileCounts.clear();
    this._eggTileCounts.clear();
    this._samples.length = 0;
    this._sampleCounts = Object.create(null);
    this._countsByType = Object.create(null);
    this._issueCount = 0;
  }

  _recordIssue(category, detail) {
    this._issueCount++;
    this._countsByType[category] = (this._countsByType[category] || 0) + 1;
    const sampleCount = this._sampleCounts[category] || 0;
    if (sampleCount < this.sampleLimit) {
      this._samples.push({ category, ...detail });
      this._sampleCounts[category] = sampleCount + 1;
    }
  }

  _recordNumericIssue(category, animal, field, value, extra = {}) {
    this._recordIssue(category, {
      animalId: animal.id,
      species: animal.species,
      field,
      value,
      ...extra,
    });
  }

  _auditAnimal(world, spatialHash, animal) {
    const speciesConfig = world.config.animal_species?.[animal.species] || animal._config || null;
    const stage = animal.lifeStage;
    const isEgg = animal.alive && stage === LifeStage.EGG;
    const maxHp = isEgg && animal._eggMaxHp > 0
      ? animal._eggMaxHp
      : (speciesConfig?.max_hp ?? 0);

    if (!speciesConfig) {
      this._recordIssue('animal_species', {
        animalId: animal.id,
        species: animal.species,
      });
    }

    if (!Number.isFinite(animal.x) || !Number.isFinite(animal.y)) {
      this._recordIssue('animal_numeric', {
        animalId: animal.id,
        species: animal.species,
        field: 'position',
        x: animal.x,
        y: animal.y,
      });
      return;
    }

    if (!world.isInBounds(animal.x, animal.y)) {
      this._recordIssue('animal_bounds', {
        animalId: animal.id,
        species: animal.species,
        x: animal.x,
        y: animal.y,
      });
    }

    if (!Number.isInteger(animal.state) || animal.state < AnimalState.IDLE || animal.state > AnimalState.FLYING) {
      this._recordIssue('animal_state', {
        animalId: animal.id,
        species: animal.species,
        state: animal.state,
        reason: 'invalid_state',
      });
    }

    if (animal.alive && animal.state === AnimalState.DEAD) {
      this._recordIssue('animal_state', {
        animalId: animal.id,
        species: animal.species,
        state: animal.state,
        reason: 'alive_marked_dead',
      });
    }

    if (!animal.alive && animal.state === AnimalState.DEAD && animal._deathTick == null) {
      this._recordIssue('animal_state', {
        animalId: animal.id,
        species: animal.species,
        reason: 'missing_death_tick',
      });
    }

    if (!animal.alive) return;

    if (!Number.isFinite(animal.energy)) {
      this._recordNumericIssue('animal_numeric', animal, 'energy', animal.energy);
    } else if (speciesConfig?.max_energy != null && (animal.energy < 0 || animal.energy > speciesConfig.max_energy)) {
      this._recordNumericIssue('animal_numeric', animal, 'energy', animal.energy, {
        min: 0,
        max: speciesConfig.max_energy,
      });
    }

    if (!Number.isFinite(animal.hp)) {
      this._recordNumericIssue('animal_numeric', animal, 'hp', animal.hp);
    } else if (animal.hp < 0 || (maxHp > 0 && animal.hp > maxHp)) {
      this._recordNumericIssue('animal_numeric', animal, 'hp', animal.hp, {
        min: 0,
        max: maxHp,
      });
    }

    if (!Number.isFinite(animal.hunger)) {
      this._recordNumericIssue('animal_numeric', animal, 'hunger', animal.hunger);
    } else if (speciesConfig?.max_hunger != null && (animal.hunger < 0 || animal.hunger > speciesConfig.max_hunger)) {
      this._recordNumericIssue('animal_numeric', animal, 'hunger', animal.hunger, {
        min: 0,
        max: speciesConfig.max_hunger,
      });
    }

    if (!Number.isFinite(animal.thirst)) {
      this._recordNumericIssue('animal_numeric', animal, 'thirst', animal.thirst);
    } else if (speciesConfig?.max_thirst != null && (animal.thirst < 0 || animal.thirst > speciesConfig.max_thirst)) {
      this._recordNumericIssue('animal_numeric', animal, 'thirst', animal.thirst, {
        min: 0,
        max: speciesConfig.max_thirst,
      });
    }

    if (!Number.isFinite(animal.age) || animal.age < 0) {
      this._recordNumericIssue('animal_numeric', animal, 'age', animal.age, { min: 0 });
    }

    if (!Number.isFinite(animal.gestationTimer) || animal.gestationTimer < 0) {
      this._recordNumericIssue('animal_numeric', animal, 'gestationTimer', animal.gestationTimer, {
        min: 0,
      });
    }

    const tileIndex = world.idx(animal.x, animal.y);
    if (isEgg) incrementMap(this._eggTileCounts, tileIndex);
    else incrementMap(this._animalTileCounts, tileIndex);

    if (spatialHash && !spatialHash.hasEntity(animal)) {
      this._recordIssue('spatial_hash', {
        animalId: animal.id,
        species: animal.species,
        x: animal.x,
        y: animal.y,
        lifeStage: stage,
      });
    }
  }

  _auditEggOverlaps(world) {
    for (const [tileIndex, eggCount] of this._eggTileCounts) {
      const coords = tileCoords(tileIndex, world.width);
      if (eggCount > 1) {
        this._recordIssue('egg_overlap', {
          x: coords.x,
          y: coords.y,
          eggCount,
        });
      }
      const animalCount = this._animalTileCounts.get(tileIndex) || 0;
      if (animalCount > 0) {
        this._recordIssue('animal_egg_overlap', {
          x: coords.x,
          y: coords.y,
          animalCount,
          eggCount,
        });
      }
    }
  }

  _auditCells(world) {
    const size = world.width * world.height;
    for (let i = 0; i < size; i++) {
      const gridCount = world.animalGrid[i];
      const actualCount = this._animalTileCounts.get(i) || 0;
      if (gridCount !== actualCount) {
        const coords = tileCoords(i, world.width);
        this._recordIssue('occupancy_grid', {
          x: coords.x,
          y: coords.y,
          gridCount,
          actualCount,
        });
      }

      const plantType = world.plantType[i];
      const plantStage = world.plantStage[i];
      const plantAge = world.plantAge[i];
      if (plantType === 0) {
        if (plantStage !== 0 || plantAge !== 0) {
          const coords = tileCoords(i, world.width);
          this._recordIssue('plant_state', {
            x: coords.x,
            y: coords.y,
            plantType,
            plantStage,
            plantAge,
            reason: 'residual_state_without_plant',
          });
        }
        continue;
      }

      if (plantStage === 0 || plantStage > MAX_PLANT_STAGE) {
        const coords = tileCoords(i, world.width);
        this._recordIssue('plant_state', {
          x: coords.x,
          y: coords.y,
          plantType,
          plantStage,
          plantAge,
          reason: plantStage === 0 ? 'missing_stage' : 'invalid_stage',
        });
      }

      if (!world.activePlantTiles.has(i)) {
        const coords = tileCoords(i, world.width);
        this._recordIssue('plant_state', {
          x: coords.x,
          y: coords.y,
          plantType,
          plantStage,
          plantAge,
          reason: 'missing_active_tile',
        });
      }
    }

    for (const tileIndex of world.activePlantTiles) {
      if (tileIndex < 0 || tileIndex >= size) {
        this._recordIssue('plant_state', {
          tileIndex,
          reason: 'active_tile_out_of_bounds',
        });
        continue;
      }
      if (world.plantType[tileIndex] === 0 || world.plantStage[tileIndex] === 0) {
        const coords = tileCoords(tileIndex, world.width);
        this._recordIssue('plant_state', {
          x: coords.x,
          y: coords.y,
          plantType: world.plantType[tileIndex],
          plantStage: world.plantStage[tileIndex],
          plantAge: world.plantAge[tileIndex],
          reason: 'orphaned_active_tile',
        });
      }
    }

    return size;
  }
}

export function createSimulationSupervisor(config) {
  return new SimulationSupervisor(config);
}