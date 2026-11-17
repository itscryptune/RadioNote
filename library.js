import {listNotes} from './db.js';
 
const $ = selector => document.querySelector(selector);
let notes = [];
let selectedId = null;
 
function render() {
  const list = $('#note-list');
  list.replaceChildren();
  for (const note of notes) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = note.id;
    button.textContent = note.title;
    li.append(button);
    list.append(li);
  }
  $('#list-count').textContent = `${notes.length} notes saved`;
  const selected = notes.find(note => note.id === selectedId);
  $('#empty-preview').hidden = !!selected;
  $('#note-preview').hidden = !selected;
  if (!selected) return;
  $('#preview-title').textContent = selected.title;
  $('#preview-meta').textContent = selected.channel.toUpperCase();
  $('#preview-body').textContent = selected.body || 'No written note.';
}
export async function refreshLibrary() {
  notes = (await listNotes()).sort((a, b) => b.updatedAt - a.updatedAt);
  render();
}
$('#note-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  selectedId = button.dataset.id;
  render();
});
