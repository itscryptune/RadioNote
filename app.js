import {openDB, putNote} from './db.js';
import {refreshLibrary} from './library.js';
 
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
    await putNote({id:crypto.randomUUID(), title, body:$('#note-body').value.trim(),
      channel:$('#note-channel').value, favorite:0, createdAt:now, updatedAt:now,
      audio:null, duration:0});
    $('#note-form').reset();
    await refreshLibrary();
    showView('library', true);
    $('#message').textContent = 'Text note saved.';
  } catch (error) { console.error(error); $('#message').textContent = 'Saving failed. Try again.'; }
});
$('#cancel-edit').addEventListener('click', () => showView('library', true));
showView(new URLSearchParams(location.search).get('view'));
openDB().then(() => refreshLibrary()).catch(error => { console.error(error); $('#message').textContent = 'Archive unavailable.'; });
