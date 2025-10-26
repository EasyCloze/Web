import { Item } from "./item";
import { isArchiveId } from "./id";

export const maxSyncNumber = 6;

export function asIdArraySorted(list: ReadonlyMap<string, Item>): string[] {
  return Array.from(list.keys()).sort();
}

export function findArchiveIndex(list: string[]): number {
  const index = list.findIndex(id => isArchiveId(id));
  return index === -1 ? list.length : index;
}

export function asArraySorted(list: ReadonlyMap<string, Item>): Item[] {
  return asIdArraySorted(list).map(id => list.get(id)!);
}
