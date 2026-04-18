export function toAssetUrl(relativePath) {
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}
