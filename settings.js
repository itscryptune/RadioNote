import {listNotes, clearNotes} from './db.js';
import {refreshLibrary} from './library.js';
 
const $ = selector => document.querySelector(selector);
export async function refreshStats() {
  const notes = await listNotes();
  $('#library-stats').textContent = `${notes.length} notes, ${notes.filter(note => note.audio).length} recordings · saved in this browser`;
}
export function initSettings() {
  $('#clear-library').addEventListener('click', async () => {
    if (!confirm('Erase ALL RadioNote notes and recordings on this browser?')) return;
    try {
      await clearNotes();
      $('#channel-filter').value = 'all';
      $('#favorites-only').checked = false;
      $('#search').value = '';
      await refreshLibrary(null);
      await refreshStats();
      $('#message').textContent = 'Library erased.';
    } catch (error) { console.error(error); $('#message').textContent = 'Could not clear library.'; }
  });
  document.addEventListener('rn:changed', () => refreshStats().catch(console.error));
  refreshStats().catch(console.error);
}