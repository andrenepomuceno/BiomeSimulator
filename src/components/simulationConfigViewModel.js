import { createSimulationConfig, DEFAULT_CONFIG } from '../engine/config.js';
import { formatTimeOfDay, resolveTicksPerDay } from '../utils/time.js';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function resolveNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function resolveBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function formatMultiplier(value) {
  return `${value.toFixed(2)}x`;
}

function formatTicks(value) {
  return `${NUMBER_FORMATTER.format(Math.round(value))} ticks`;
}

function formatTps(value) {
  return `${NUMBER_FORMATTER.format(Math.round(value))} tps`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatPopulationBudget(value) {
  return value > 0
    ? `${NUMBER_FORMATTER.format(Math.round(value))} animals`
    : 'Per-species defaults';
}

function formatClockLabel(clock, ticksPerDay) {
  const day = Number.isFinite(clock?.day)
    ? clock.day
    : Math.floor((clock?.tick || 0) / ticksPerDay);
  const tickInDay = Number.isFinite(clock?.tick_in_day)
    ? clock.tick_in_day
    : ((clock?.tick || 0) % ticksPerDay);

  return `Day ${day} · ${formatTimeOfDay(tickInDay, ticksPerDay)}`;
}

export function buildSimulationConfigSections(state = {}) {
  const mergedConfig = createSimulationConfig(state.gameConfig || {});
  const clock = state.clock || {};
  const climate = state.climate || {};
  const ticksPerDay = resolveTicksPerDay(mergedConfig.ticks_per_day);
  const liveTps = resolveNumber(state.tps, mergedConfig.ticks_per_second ?? DEFAULT_CONFIG.ticks_per_second);
  const liveHunger = resolveNumber(state.hungerMultiplier, mergedConfig.hunger_multiplier ?? DEFAULT_CONFIG.hunger_multiplier);
  const liveThirst = resolveNumber(state.thirstMultiplier, mergedConfig.thirst_multiplier ?? DEFAULT_CONFIG.thirst_multiplier);
  const isNight = typeof clock.is_night === 'boolean'
    ? clock.is_night
    : (clock.tick_in_day ?? 0) >= Math.floor(ticksPerDay * (mergedConfig.day_fraction ?? DEFAULT_CONFIG.day_fraction));

  return [
    {
      id: 'clock',
      title: 'Clock & Tempo',
      description: 'Live pacing and day-cycle values for the active world.',
      rows: [
        {
          id: 'speed',
          label: 'Simulation speed',
          value: formatTps(liveTps),
          source: 'live',
          hint: 'Current worker cadence mirrored by the toolbar slider.',
        },
        {
          id: 'clock-label',
          label: 'Current clock',
          value: formatClockLabel(clock, ticksPerDay),
          source: 'live',
          hint: 'Matches the time-of-day view shown in the toolbar.',
        },
        {
          id: 'phase',
          label: 'Current phase',
          value: isNight ? 'Night' : 'Day',
          source: 'live',
          hint: 'Whether the world is currently in daylight or night.',
        },
        {
          id: 'ticks-per-day',
          label: 'Ticks per day',
          value: formatTicks(ticksPerDay),
          source: 'world',
          hint: 'Length of a full day/night cycle.',
        },
        {
          id: 'day-fraction',
          label: 'Daylight share',
          value: formatPercent(resolveNumber(mergedConfig.day_fraction, DEFAULT_CONFIG.day_fraction)),
          source: 'world',
          hint: 'Fraction of each cycle spent in daylight.',
        },
        {
          id: 'season',
          label: 'Season',
          value: climate.seasonName ?? 'Spring',
          source: 'live',
          hint: 'Current season — Spring, Summer, Autumn or Winter (14 days each by default).',
        },
        {
          id: 'temperature',
          label: 'Temperature',
          value: climate.temperature != null ? `${climate.temperature.toFixed(1)} °C` : '— °C',
          source: 'live',
          hint: 'Ambient temperature derived from season and time of day. Affects plant growth, reproduction and mortality.',
        },
      ],
    },
    {
      id: 'need-rates',
      title: 'Need Rates',
      description: 'Hunger and thirst rate multipliers. Adjust them live in Stats \u2192 Settings.',
      rows: [
        {
          id: 'hunger-multiplier',
          label: 'Hunger multiplier',
          value: formatMultiplier(liveHunger),
          source: 'live',
          hint: 'Live value applied to need growth each tick.',
        },
        {
          id: 'thirst-multiplier',
          label: 'Thirst multiplier',
          value: formatMultiplier(liveThirst),
          source: 'live',
          hint: 'Live value applied to water demand each tick.',
        },
      ],
    },
    {
      id: 'vision-population',
      title: 'Vision & Population',
      description: 'Global fauna controls that shape visibility and population budgets.',
      rows: [
        {
          id: 'max-animal-population',
          label: 'Max animal population',
          value: formatPopulationBudget(resolveNumber(mergedConfig.max_animal_population, DEFAULT_CONFIG.max_animal_population)),
          source: 'world',
          hint: 'Global cap distributed proportionally across species when enabled.',
        },
        {
          id: 'global-vision',
          label: 'Global vision multiplier',
          value: formatMultiplier(resolveNumber(mergedConfig.animal_global_vision_multiplier, DEFAULT_CONFIG.animal_global_vision_multiplier)),
          source: 'world',
          hint: 'Multiplies the base vision range for all species before day and night modifiers apply.',
        },
        {
          id: 'night-vision-reduction',
          label: 'Night vision reduction',
          value: formatMultiplier(resolveNumber(mergedConfig.night_vision_reduction_factor, DEFAULT_CONFIG.night_vision_reduction_factor)),
          source: 'world',
          hint: 'Applied to non-nocturnal vision during the night phase.',
        },
        {
          id: 'nocturnal-day-vision',
          label: 'Nocturnal day vision',
          value: formatMultiplier(resolveNumber(mergedConfig.nocturnal_day_vision_factor, DEFAULT_CONFIG.nocturnal_day_vision_factor)),
          source: 'world',
          hint: 'Applied to nocturnal species while the world is in daylight.',
        },
      ],
    },
    {
      id: 'supervisor',
      title: 'Supervisor',
      description: 'Background checks that detect and report simulation anomalies in the worker.',
      rows: [
        {
          id: 'supervisor-enabled',
          label: 'Supervisor',
          value: resolveBoolean(mergedConfig.supervisor_enabled, DEFAULT_CONFIG.supervisor_enabled) ? 'Enabled' : 'Disabled',
          source: 'world',
          hint: 'When enabled, the worker runs periodic checks and sends supervisor alerts on anomalies.',
        },
        {
          id: 'full-audit-interval',
          label: 'Full audit interval',
          value: formatTicks(resolveNumber(mergedConfig.supervisor_full_audit_interval_ticks, DEFAULT_CONFIG.supervisor_full_audit_interval_ticks)),
          source: 'world',
          hint: 'How often the worker runs a full consistency scan across all entities.',
        },
        {
          id: 'sample-limit',
          label: 'Sample limit',
          value: NUMBER_FORMATTER.format(Math.round(resolveNumber(mergedConfig.supervisor_sample_limit, DEFAULT_CONFIG.supervisor_sample_limit))),
          source: 'world',
          hint: 'Maximum issue samples logged per audit category.',
        },
        {
          id: 'log-cooldown',
          label: 'Log cooldown',
          value: formatTicks(resolveNumber(mergedConfig.supervisor_log_cooldown_ticks, DEFAULT_CONFIG.supervisor_log_cooldown_ticks)),
          source: 'world',
          hint: 'Minimum ticks before the same audit warning can fire again.',
        },
      ],
    },
  ];
}