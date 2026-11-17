import {openDB, putNote} from './db.js';
import {refreshLibrary} from './library.js';
import {initSettings, refreshStats} from './settings.js';
import {initRecorder, getDraft, setDraft} from './recorder.js';
import {initSpeech} from './speech.js';

let editing = null;
 
const $ = selector => document.querySelector(selector);
const stations = ['library', 'record', 'settings'];
export function showView(value, push = false) {
  const view = stations.includes(value) ? value : 'library';
  document.querySelectorAll('[data-view]').forEach(panel => panel.hidden = panel.dataset.view !== view);
  document.querySelectorAll('[data-route]').forEach(link => {
    link.classList.toggle('active', link.dataset.route === view);
    if (link.closest('nav')) {
      if (link.dataset.route === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  });
  $('#frequency').textContent = {library:'88.1', record:'96.4', settings:'104.2'}[view];
  if (push) {
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.pushState({view}, '', url);
  }
}
document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  showView(link.dataset.route, true);
}));
window.addEventListener('popstate', () => showView(new URLSearchParams(location.search).get('view')));
$('#note-form').addEventListener('submit', async event => {
  event.preventDefault();
  const title = $('#note-title').value.trim();
  if (!title) { $('#note-title').focus(); return; }
  const now = Date.now();
  try {
    const note = {id:editing?.id || crypto.randomUUID(), title, body:$('#note-body').value.trim(),
        channel:$('#note-channel').value, favorite:editing?.favorite || 0,
        createdAt:editing?.createdAt || now, updatedAt:now,
        audio:getDraft().audio, duration:getDraft().duration};
    await putNote(note);
    editing = null;
    $('#note-form').reset();
    setDraft(null);
    $('#editor-heading').textContent = 'Leave a note';
    await refreshLibrary(note.id);
    await refreshStats();
    showView('library', true);
    $('#message').textContent = 'Note saved.';
    document.dispatchEvent(new CustomEvent('rn:announce', {detail:'Note saved.'}));
  } catch (error) { console.error(error); $('#message').textContent = 'Saving failed. Try again.'; }
});
document.addEventListener('rn:edit', event => {
    editing = event.detail;
    $('#note-title').value = editing.title;
    $('#note-body').value = editing.body;
    $('#note-channel').value = editing.channel;
    setDraft(editing.audio, editing.duration);
    $('#editor-heading').textContent = 'Edit note';
    showView('record', true);
});
$('#cancel-edit').addEventListener('click', () => {
    editing = null;
    $('#note-form').reset();
    setDraft(null);
    $('#editor-heading').textContent = 'Leave a note';
    showView('library', true);
});
document.querySelectorAll('a[data-route="record"]').forEach(link => link.addEventListener('click', () => {
    editing = null;
    $('#note-form').reset();
    setDraft(null);
    $('#editor-heading').textContent = 'Leave a note';
}));
showView(new URLSearchParams(location.search).get('view'));
openDB().then(() => refreshLibrary()).catch(error => { console.error(error); $('#message').textContent = 'Archive unavailable.'; });
initSettings();
initRecorder(); 
initSpeech();