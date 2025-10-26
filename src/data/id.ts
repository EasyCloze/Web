export function generateLocalId(hint: number | null) {
  return 'L' + (hint ? hint : Date.now());
}

export function generateArchiveId(hint: number | null) {
  return 'LA' + (hint ? hint : Date.now());
}

export function isArchiveId(id: string) {
  return id.startsWith('LA');
}

export function currentVersion() {
  return Date.now();
}

export function getVersionDate(ver: number) {
  return new Date(ver).toLocaleString();
}
