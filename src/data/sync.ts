import { api } from "../common/api";
import { Item, ItemSyncLocal, ItemSyncRemote, itemSync, itemMerge, itemFromRemote, itemToLocal } from "./item";
import { maxSyncNumber } from "./list";

export const idleSyncInterval = 5 * 60 * 1000;
export const minSyncInterval = 10 * 1000;
export const updateDelayInterval = 3 * 60 * 1000;

export function localRefresh(list: Item[]): [toAdd: Item[], toUpdate: Item[], toDelete: string[]] {
  const toAdd: Item[] = [];
  const toDelete: string[] = [];
  list.forEach(item => {
    const merged = itemToLocal(item);
    if (!merged) {
      toDelete.push(item.id);
    } else {
      if (merged.id !== item.id) {
        toDelete.push(item.id);
        toAdd.push(merged);
      } else {
        // unchanged
      }
    }
  });
  return [toAdd, [], toDelete];
}

async function query(token: string, local: ItemSyncLocal[]): Promise<ItemSyncRemote[]> {
  const response = await fetch(api('/item/sync'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(local),
  });
  if (response.status !== 200) {
    throw response.status;
  }
  return (await response.json()) as ItemSyncRemote[];
}

export async function sync(token: string, list: Item[], getCurrentItem: (id: string) => Item | null): Promise<[toAdd: Item[], toUpdate: Item[], toDelete: string[]]> {
  const remote = await query(token, list.map(itemSync).filter(item => item !== null).slice(0, maxSyncNumber));

  const requestSet: Map<string, Item> = list.reduce((map, item: Item) => { map.set(item.id, item); return map; }, new Map<string, Item>());

  const toAdd: Item[] = [];
  const toUpdate: Item[] = [];
  const toDelete: string[] = [];

  remote.forEach(item => {
    if (requestSet.has(item.id)) {
      const request = requestSet.get(item.id)!;
      const current = getCurrentItem(item.id) ?? request;
      const merged = itemMerge(current, request.val, item)!;
      if (merged.id !== item.id) {
        toDelete.push(item.id);
        toAdd.push(merged);
      } else {
        if (merged.remoteVer !== current.remoteVer) {
          toUpdate.push(merged);
        } else {
          // unchanged
        }
      }
      requestSet.delete(item.id);
    } else {
      toAdd.push(itemFromRemote(item));
    }
  });

  requestSet.forEach(item => {
    const merged = itemToLocal(getCurrentItem(item.id) ?? item);
    if (!merged) {
      if (item.ver > 0 && item.val !== null) {
        // unchanged
      } else {
        toDelete.push(item.id);
      }
    } else {
      if (merged.id !== item.id) {
        toDelete.push(item.id);
        toAdd.push(merged);
      } else {
        // unchanged
      }
    }
  });

  return [toAdd, toUpdate, toDelete];
}
