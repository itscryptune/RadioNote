import {openDB, putNote} from './db.js';
import {refreshLibrary} from './library.js';
import {initSettings, refreshStats} from './settings.js';
import {initRecorder, getDraft, setDraft, isRecording} from './recorder.js';
import {initSpeech} from './speech.js';
import {initVoice} from './voice.js';
import {initBackup} from './backup.js';
import {initStationUI, activeStation, setStation} from './station-ui.js';

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
  if (push) { 
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.pushState({view}, '', url);
  }
}
function compose(channel = 'unfiled') {
  if (isRecording()) {
    $('#message').textContent = 'Stop recording before opening another note.';
    return;
  }
  editing = null;
    $('#note-form').reset();
    setDraft(null);
    $('#editor-heading').textContent = 'Leave a note';
    $('#note-channel').value = channel;
    showView('record', true);
    $('#note-title').focus();
}
document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  if (link.dataset.route === 'record')
    compose(activeStation() === 'all' ? 'unfiled' : activeStation());
  else showView(link.dataset.route, true);
}));
window.addEventListener('popstate', () => showView(new URLSearchParams(location.search).get('view')));
$('#note-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (isRecording()) {
    $('#message').textContent = 'Stop recording and wait for CLIP READY before saving.';
    return;
  }
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
    document.dispatchEvent(new Event('rn:changed'));
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
document.addEventListener('rn:compose', event => {
  compose(event.detail?.channel || 'unfiled');
});
$('#cancel-edit').addEventListener('click', () => {
    if (isRecording()) {
      $('#message').textContent = 'Stop recording before leaving the editor.';
      return;
    }
    editing = null;
    $('#note-form').reset();
    setDraft(null);
    $('#editor-heading').textContent = 'Leave a note';
    showView('library', true);
});
showView(new URLSearchParams(location.search).get('view'));
initSettings();
initRecorder();
initSpeech();
initVoice();
initBackup();
openDB().then(async () => {
  await initStationUI();
  await refreshLibrary();
  await refreshStats();
}).catch(error => {
  console.error(error);
  $('#message').textContent = 'Archive unavailable. Close other RadioNote tabs and reload.';
});
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}