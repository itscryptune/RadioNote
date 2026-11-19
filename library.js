import {listNotes, putNote, deleteNote} from './db.js';
 
const $ = selector => document.querySelector(selector);
let notes = [];
let selectedId = null;
let playerURL = null;
export const getSelected = () => notes.find(note => note.id === selectedId) || null;
 
function render() {
  const search = $('#search').value.trim().toLowerCase();
  const matches = notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(search));
  const list = $('#note-list');
  list.replaceChildren();
  for (const note of matches) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = note.id;
    button.classList.toggle('selected', note.id === selectedId);
    const title = document.createElement('strong');
    title.textContent = `${note.favorite ? '★ ' : ''}${note.title}`;
    const meta = document.createElement('small');
    meta.textContent = `${note.channel} · ${new Date(note.createdAt).toLocaleDateString()}`;
    button.append(title, meta);
    li.append(button);
    list.append(li);
  }
  if (!matches.some(note => note.id === selectedId)) selectedId = null;
  $('#list-count').textContent = `${matches.length} ${matches.length === 1 ? 'note' : 'notes'} here`;
  const player = $('#note-audio');
  player.pause();
  player.removeAttribute('src');
  player.load();
  if (playerURL) URL.revokeObjectURL(playerURL);
  playerURL = null;
  player.hidden = true;
  const selected = getSelected();
  $('#empty-preview').hidden = !!selected;
  $('#note-preview').hidden = !selected;
  if (!selected) { $('.library-grid').classList.remove('reading'); return; }
  $('#preview-title').textContent = selected.title;
  $('#preview-meta').textContent = `${selected.channel.toUpperCase()} / ${new Date(selected.createdAt).toLocaleDateString()}`;
  $('#preview-body').textContent = selected.body || 'No written note.';
  $('#star-note').textContent = selected.favorite ? '★ Unstar' : '☆ Star';
  if (selected.audio instanceof Blob && selected.audio.size) {
    playerURL = URL.createObjectURL(selected.audio);
    player.src = playerURL;
    player.hidden = false;
    player.load();
  }
}
export async function refreshLibrary(selectId = selectedId) {
  notes = (await listNotes($('#channel-filter').value, $('#favorites-only').checked))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  selectedId = selectId;
  render();
}
$('#note-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  selectedId = button.dataset.id;
  render();
  $('.library-grid').classList.add('reading');
});
$('#search').addEventListener('input', render);
$('#reader-back').addEventListener('click', () => $('.library-grid').classList.remove('reading'));
$('#channel-filter').addEventListener('change', () => refreshLibrary().catch(console.error));
$('#favorites-only').addEventListener('change', () => refreshLibrary().catch(console.error));
$('#edit-note').addEventListener('click', () => {
  const note = getSelected();
  if (note) document.dispatchEvent(new CustomEvent('rn:edit', {detail:note}));
});
$('#star-note').addEventListener('click', async () => {
  const note = getSelected();
  if (!note) return;
  try {
    await putNote({...note, favorite:note.favorite ? 0 : 1, updatedAt:Date.now()});
    await refreshLibrary(note.id);
    $('#message').textContent = 'Star updated.';
    document.dispatchEvent(new Event('rn:changed'));
  } catch (error) { console.error(error); $('#message').textContent = 'Could not update star.'; }
});
$('#delete-note').addEventListener('click', async () => {
  const note = getSelected();
  if (!note || !confirm(`Delete "${note.title}"?`)) return;
  try {
    await deleteNote(note.id);
    selectedId = null;
    await refreshLibrary(null);
    $('#message').textContent = 'Note deleted.';
    document.dispatchEvent(new Event('rn:changed'));
  } catch (error) { console.error(error); $('#message').textContent = 'Could not delete note.'; }
});
$('#note-audio').addEventListener('error', () => {
  if ($('#note-audio').getAttribute('src'))
    $('#message').textContent = 'Could not play this saved clip. Try its original recording browser or check the file.';
});