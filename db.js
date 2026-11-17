let dbPromise;
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('radionote', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const notes = db.createObjectStore('notes', {keyPath:'id'});
      notes.createIndex('channel', 'channel');
      notes.createIndex('favorite', 'favorite');
      notes.createIndex('channelFavorite', ['channel', 'favorite']);
      db.createObjectStore('settings', {keyPath:'key'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = null; reject(request.error); };
  });
  return dbPromise;
}
export async function putNote(note) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function resultOf(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function listNotes(channel = 'all', starred = false) {
  const db = await openDB();
  const store = db.transaction('notes').objectStore('notes');
  const request = channel !== 'all' && starred ? store.index('channelFavorite').getAll([channel, 1])
    : channel !== 'all' ? store.index('channel').getAll(channel)
    : starred ? store.index('favorite').getAll(1) : store.getAll();
  return resultOf(request);
}
export async function deleteNote(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function clearNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
