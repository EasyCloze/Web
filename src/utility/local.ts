export function local(key: string): [
  string | null,
  (item: string | null) => void
] {
  return [
    localStorage.getItem(key),
    (item: string | null) => {
      item ? localStorage.setItem(key, item) : localStorage.removeItem(key);
    }
  ];
}

export function localJson(key: string): [
  any,
  (item: any) => void
] {
  const [item, setItem] = local(key);

  return [
    item ? JSON.parse(item) : null,
    (item: any) => { item ? setItem(JSON.stringify(item)) : setItem(null); }
  ]
}
