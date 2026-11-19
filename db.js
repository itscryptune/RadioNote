let dbPromise;
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('radionote', 3);
    request.onupgradeneeded = event => {
      const db = request.result;
      if (event.oldVersion === 0) {
        const notes = db.createObjectStore('notes', {keyPath:'id'});
        notes.createIndex('channel', 'channel');
        notes.createIndex('favorite', 'favorite');
        notes.createIndex('channelFavorite', ['channel', 'favorite']);
        db.createObjectStore('settings', {keyPath:'key'});
    }
    if (!db.objectStoreNames.contains('stations')) {
      const store = db.createObjectStore('stations', {keyPath:'id'});
      if (event.oldVersion > 0) {
        const notes = request.transaction.objectStore('notes').getAll();
        notes.onsuccess = () => {
          const ids = new Set(notes.result.map(note => note.channel).filter(id => id && id !== 'unfiled'));
          ids.forEach(id => store.put({id, name:id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), createdAt:Date.now()}));
          };
      }
    }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => { dbPromise = null; reject(request.error); };
    request.onblocked = () => { console.warn('Close other RadioNote tabs to finish the database upgrade.'); };
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
 export async function getSetting(key, fallback = false) {
  const db = await openDB();
  const value = await resultOf(db.transaction('settings').objectStore('settings').get(key));
  return value?.value ?? fallback;
}
export async function setSetting(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({key, value});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function listStations() {
  const db = await openDB();
  return resultOf(db.transaction('stations').objectStore('stations').getAll());
}
export async function putStation(station) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stations', 'readwrite');
    tx.objectStore('stations').put(station);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function deleteStation(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['stations', 'notes'], 'readwrite');
    const notes = tx.objectStore('notes');
    const found = notes.index('channel').getAll(id);
    found.onsuccess = () => {
      for (const note of found.result) notes.put({...note, channel:'unfiled', updatedAt:Date.now()});
      tx.objectStore('stations').delete(id);
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}