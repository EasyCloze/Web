import { isPositive } from "../common/number";
import { generateLocalId, isArchiveId } from "./id";

export type Item = {
  id: string;
  remoteVer: number;
  remoteVal: string | null;
  ref: number;
  ver: number;
  val: string | null;
}

export enum ItemState {
  Archived,
  DeletedArchived,
  CreatedEmpty,
  Created,
  CreatedInvalid,
  DeletedCreated,
  Normal,
  DeletedNormal,
  Updated,
  UpdatedInvalid,
  DeletedUpdated,
  ConflictMissing,
  ConflictUpdated,
  ConflictDeleted,
}

export const maxContentLength = 4096;

export function initialItem(id: string): Item {
  return { id, remoteVer: 0, remoteVal: null, ref: 0, ver: 0, val: null };
}

export function itemState(item: Item, loggedIn: boolean): ItemState {
  const { id, remoteVer, ref, ver, val } = item;
  if (isArchiveId(id)) {
    if (isPositive(ver)) {
      return ItemState.Archived;
    } else {
      return ItemState.DeletedArchived;
    }
  } else {
    if (ref === remoteVer) {
      if (remoteVer === 0) {
        if (isPositive(ver)) {
          if (!loggedIn) {
            return ItemState.Normal;
          } else if (val === null) {
            return ItemState.CreatedEmpty;
          } else if (val.length <= maxContentLength) {
            return ItemState.Created;
          } else {
            return ItemState.CreatedInvalid;
          }
        } else {
          return ItemState.DeletedCreated;
        }
      } else {
        if (val === null) {
          if (isPositive(ver)) {
            return ItemState.Normal;
          } else {
            return ItemState.DeletedNormal;
          }
        } else {
          if (isPositive(ver)) {
            if (val.length <= maxContentLength) {
              return ItemState.Updated;
            } else {
              return ItemState.UpdatedInvalid;
            }
          } else {
            return ItemState.DeletedUpdated;
          }
        }
      }
    } else {
      if (remoteVer === 0) {
        return ItemState.ConflictMissing;
      } else {
        if (isPositive(ver)) {
          return ItemState.ConflictUpdated;
        } else {
          return ItemState.ConflictDeleted;
        }
      }
    }
  }
}

export function normalizeItem(item: Item): Item {
  const { id, remoteVer, remoteVal, val } = item;
  if (val === remoteVal) {
    return { id, remoteVer, remoteVal, ref: remoteVer, ver: remoteVer, val: null };
  }
  return item;
}

export type ItemSyncOp = 'C' | 'R' | 'U' | 'D';

export type ItemSyncLocal = {
  id: string;
  op: ItemSyncOp;
  ref?: number;
  ver?: number;
  val?: string | null;
}

export type ItemSyncRemote = {
  id: string;
  newId?: string;
  ver: number;
  val?: string | null;
}

export function itemSync(item: Item): ItemSyncLocal | null {
  const { id, remoteVer, ref, ver, val } = item;
  switch (itemState(item, true)) {
    case ItemState.Created:
      return { id, op: 'C', ver, val };
    case ItemState.Normal:
    case ItemState.UpdatedInvalid:
    case ItemState.ConflictUpdated:
    case ItemState.ConflictDeleted:
      return { id, op: 'R', ref: remoteVer };
    case ItemState.Updated:
      return { id, op: 'U', ref, ver, val };
    case ItemState.DeletedNormal:
    case ItemState.DeletedUpdated:
      return { id, op: 'D', ref };
    case ItemState.Archived:
    case ItemState.DeletedArchived:
    case ItemState.CreatedEmpty:
    case ItemState.CreatedInvalid:
    case ItemState.DeletedCreated:
    case ItemState.ConflictMissing:
      return null;
  }
}

export function itemMerge(item: Item, tempVal: string | null, remote: ItemSyncRemote | null): Item | null {
  const { id, remoteVer, ref, ver, val } = item;
  if (remote === null) {
    if (isPositive(ver)) {
      if (ver === 0) {
        return item;  // CreatedEmpty unsynced
      } else {
        if (val !== null) {
          if (remoteVer === 0) {
            return item;  // unsynced 
          } else {
            return { id: generateLocalId(ver), remoteVer: 0, remoteVal: null, ref, ver, val };  // Updated missing
          }
        } else {
          return null;  // Normal deleted
        }
      }
    } else {
      return null;  // deleted
    }
  } else {
    if (remote.newId !== undefined) {
      return normalizeItem({ id: remote.newId, remoteVer: remote.ver, remoteVal: tempVal, ref: remote.ver, ver, val });  // Created synced
    } else {
      if (ref !== remote.ver) {
        if (remote.val === undefined) {
          return normalizeItem({ id, remoteVer: remote.ver, remoteVal: tempVal, ref: remote.ver, ver, val });  // Updated synced
        } else {
          if (isPositive(ver) && val === null) {
            return { id, remoteVer: remote.ver, remoteVal: remote.val, ref: remote.ver, ver: remote.ver, val };  // Normal updated
          } else {
            return normalizeItem({ id, remoteVer: remote.ver, remoteVal: remote.val, ref, ver, val });  // Updated conflicting
          }
        }
      } else {
        return item;  // Normal unchanged
      }
    }
  }
}

export function itemFromRemote(remote: ItemSyncRemote): Item {
  return { id: remote.id, remoteVer: remote.ver, remoteVal: remote.val!, ref: remote.ver, ver: remote.ver, val: null };
}

export function itemToLocal(item: Item): Item | null {
  return itemMerge(item, null, null);
}
