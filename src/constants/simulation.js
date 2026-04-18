export const GAME_MINUTES_PER_HOUR = 60;
export const GAME_HOURS_PER_DAY = 24;
export const GAME_MINUTES_PER_DAY = GAME_HOURS_PER_DAY * GAME_MINUTES_PER_HOUR;
export const GAME_HOUR = GAME_MINUTES_PER_HOUR;
export const GAME_DAY = GAME_MINUTES_PER_DAY;

export const DEFAULT_TICKS_PER_DAY = 500;
export const DEFAULT_TICKS_PER_GAME_MINUTE = DEFAULT_TICKS_PER_DAY / GAME_MINUTES_PER_DAY;
export const DEFAULT_DAY_FRACTION = 0.6;
export const DEFAULT_SEASON_LENGTH_DAYS = 30;

/** Display names for the four seasons (index matches season integer 0-3). */
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
/** Emoji icons for the four seasons. */
export const SEASON_ICONS = ['🌸', '☀️', '🍂', '❄️'];

export const STATS_PANEL_HISTORY_LIMIT = 200;
export const ENTITY_BARS_MIN_ZOOM = 4;