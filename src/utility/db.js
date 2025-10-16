// db.js
import { openDB } from 'idb';

const DB_NAME = 'EasyCloze';
const STORE_NAME = 'item';

let db;

function getDB() {
  if (!db) {
    db = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return db;
}

async function setItem(id, list) {
  const db = await getDB();
  await db.put(STORE_NAME, { id, list });
}

async function setList(list) {
  setItem('list', list);
}

async function getAllUnion() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const items = (await store.get('list'))?.list || [];
  const all = await store.getAll();
  const union = new Set();

  for (const item of all) {
    if (item.id === 'list') {
      continue;
    }
    if (!items.includes(item.id)) {
      await store.delete(item.id);
      continue;
    }
    item.list.forEach(val => union.add(val))
  }
  await tx.done;

  return [...union];
}

export default {
  setItem,
  setList,
  getAllUnion,
}
