import {openDB, putNote} from './db.js';
import {refreshLibrary} from './library.js';
 
const $ = selector => document.querySelector(selector);
const stations = ['library', 'record', 'settings'];
const current = new URLSearchParams(location.search).get('view');
const view = stations.includes(current) ? current : 'library';
document.querySelectorAll('[data-view]').forEach(panel => panel.hidden = panel.dataset.view !== view);
$('#frequency').textContent = {library:'88.1', record:'96.4', settings:'104.2'}[view];
openDB().catch(error => { console.error(error); $('#message').textContent = 'Could not open the archive.'; });
 
$('#note-form').addEventListener('submit', async event => {
  event.preventDefault();
  const title = $('#note-title').value.trim();
  if (!title) { $('#note-title').focus(); return; }
  const now = Date.now();
  try {
    await putNote({id:crypto.randomUUID(), title, body:$('#note-body').value.trim(),
      channel:$('#note-channel').value, favorite:0, createdAt:now, updatedAt:now,
      audio:null, duration:0});
    location.href = '?view=library';
  } catch (error) {
    console.error(error);
    $('#message').textContent = 'Saving failed. Try again.';
  }
});
refreshLibrary().catch(error => { console.error(error); $('#message').textContent = 'Could not load saved notes.'; });
