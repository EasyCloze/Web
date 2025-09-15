export function generate_local_id(hint: number) {
  return 'L' + (hint ? hint : Date.now());
}

export function generate_archive_id(hint: number) {
  return 'LA' + (hint ? hint : Date.now());
}

export function is_archive_id(id: string) {
  return id.startsWith('LA');
}

export function key_remote(id: string) {
  return id + ':remote';
}

export function key_local(id: string) {
  return id;
}

export function current_version() {
  return Date.now();
}

export function get_version_date(ver: number) {
  return new Date(ver).toLocaleString();
}
