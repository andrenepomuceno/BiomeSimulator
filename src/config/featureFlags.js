function parseBooleanFlag(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const IS_DEV = !!import.meta.env.DEV;
export const IS_PROD = !!import.meta.env.PROD;

export const FF_AUDIO_LOG_UI = parseBooleanFlag(import.meta.env.VITE_FF_AUDIO_LOG_UI, IS_DEV);
export const FF_CAPTURE_BRIDGE = parseBooleanFlag(import.meta.env.VITE_FF_CAPTURE_BRIDGE, IS_DEV);
