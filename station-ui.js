import {listNotes} from './db.js';
 
const $ = selector => document.querySelector(selector);
const stations = [
  ['physics','Physics','101.1'], ['mathematics','Mathematics','102.4'],
  ['chemistry','Chemistry','103.2'], ['history','History','104.8'],
  ['programming','Programming','106.2'], ['thoughts','Thoughts','88.7'],
  ['ideas','Ideas','89.5'], ['moments','Moments','90.3'], ['work','Work','91.6']
];
let active = 'all';
 
function tune(channel) {
  active = channel;
  const station = stations.find(item => item[0] === channel);
  $('#frequency').textContent = station?.[2] || '88.1';
  $('#radio-station-label').textContent = station?.[1].toUpperCase() || 'ALL NOTES';
  document.querySelectorAll('[data-station]').forEach(button => {
    const chosen = button.dataset.station === channel;
    button.classList.toggle('chosen', chosen);
    button.setAttribute('aria-pressed', String(chosen));
  });
}
 
function choose(channel, show = true) {
  if (show) document.querySelector('nav a[data-route="library"]')?.click();
  $('#channel-filter').value = channel;
  $('#channel-filter').dispatchEvent(new Event('change', {bubbles:true}));
  tune(channel);
}
 
async function counts() {
  const notes = await listNotes();
  document.querySelectorAll('[data-station]').forEach(button => {
    const value = button.dataset.station;
    const total = value === 'all' ? notes.length : notes.filter(note => note.channel === value).length;
    button.querySelector('small').textContent = total;
  });
}
 
export function initStationUI() {
  const root = $('#station-shortcuts');
  const items = [['all','All notes','88.1'], ...stations];
  for (const [key, name] of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.station = key;
    button.innerHTML = `<span></span><small></small>`;
    button.querySelector('span').textContent = name;
    button.addEventListener('click', () => choose(key));
    root.append(button);
  }
  $('#channel-filter').addEventListener('change', () => tune($('#channel-filter').value));
  $('#station-new-note').addEventListener('click', () => {
    document.querySelector('main a[data-route="record"]')?.click();
    $('#note-channel').value = active === 'all' ? 'physics' : active;
    $('#note-title').focus();
  });
  document.addEventListener('rn:open-station', event => {
    const name = String(event.detail || '').trim().toLowerCase();
    const found = stations.find(item => item[0] === name || item[1].toLowerCase() === name);
    if (found) choose(found[0]);
    else $('#voice-feedback').textContent = `No station named ${name}`;
  });
  document.addEventListener('rn:new-station-note', event => {
    const name = String(event.detail || '').trim().toLowerCase();
    const found = stations.find(item => item[0] === name || item[1].toLowerCase() === name);
    if (!found) return $('#voice-feedback').textContent = `No station named ${name}`;
    tune(found[0]);
    $('#channel-filter').value = found[0];
    $('#station-new-note').click();
    $('#voice-feedback').textContent = `New ${found[1]} note ready`;
  });
  document.addEventListener('rn:changed', () => counts().catch(console.error));
  tune($('#channel-filter').value);
  counts().catch(console.error);
}
