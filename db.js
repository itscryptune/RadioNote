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