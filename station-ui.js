import {listNotes, listStations, putStation, deleteStation} from './db.js';
 
const $ = selector => document.querySelector(selector);
let stations = [];
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
async function rebuildStations() {
  const saved = await listStations();
  saved.sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
  stations = saved.map((item, i) => [item.id, item.name, (88.1 + i * 1.7).toFixed(1)]);
  const currentFilter = $('#channel-filter').value;
  const currentNote = $('#note-channel').value;
  for (const select of [$('#channel-filter'), $('#note-channel')]) {
    const items = select.id === 'channel-filter'
      ? [['all', 'All stations'], ['unfiled', 'Unsorted'], ...stations]
      : [['unfiled', 'Unsorted'], ...stations];
    select.replaceChildren();
    for (const [id, name] of items) select.add(new Option(name, id));
  }
  $('#channel-filter').value = [...$('#channel-filter').options].some(x => x.value === currentFilter) ? currentFilter : 'all';
  $('#note-channel').value = [...$('#note-channel').options].some(x => x.value === currentNote) ? currentNote : 'unfiled';
  const root = $('#station-shortcuts');
  root.replaceChildren();
  for (const [id, name] of [['all', 'All notes'], ['unfiled', 'Unsorted'], ...stations]) {
    const row = document.createElement('div');
    row.className = 'station-entry';
    const chooseButton = document.createElement('button');
    chooseButton.type = 'button';
    chooseButton.dataset.station = id;
    chooseButton.innerHTML = '<span></span><small></small>';
    chooseButton.querySelector('span').textContent = name;
    chooseButton.addEventListener('click', () => choose(id));
    row.append(chooseButton);
    if (id !== 'all' && id !== 'unfiled') {
      const rename = document.createElement('button');
      rename.type = 'button'; rename.textContent = 'Edit'; rename.title = `Rename ${name}`;
      rename.addEventListener('click', async () => {
        const next = prompt('Station name:', name)?.trim();
        if (!next || next === name) return;
        if (saved.some(item => item.id !== id && item.name.toLowerCase() === next.toLowerCase())) return alert('This station name already exists.');
        await putStation({...saved.find(item => item.id === id), name:next});
        await rebuildStations();
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Delete'; remove.title = `Delete ${name}`;
      remove.addEventListener('click', async () => {
        if (!confirm(`Delete station "${name}"? Its notes will move to Unsorted.`)) return;
        await deleteStation(id);
        if (active === id) active = 'all';
        await rebuildStations();
        choose(active, false);
        document.dispatchEvent(new Event('rn:changed'));
      });
      row.append(rename, remove);
    }
    root.append(row);
  }
  tune($('#channel-filter').value);
  await counts();
}


export function initStationUI() {
  rebuildStations().catch(console.error);
  $('#channel-filter').addEventListener('change', () => tune($('#channel-filter').value));
  $('#station-add').addEventListener('click', async () => {
    const name = prompt('New station name:')?.trim();
    if (!name) return;
    const existing = await listStations();
    if (existing.some(item => item.name.toLowerCase() === name.toLowerCase())) return alert('Station already exists.');
    const id = crypto.randomUUID();
    await putStation({id, name, createdAt:Date.now()});
    await rebuildStations();
    choose(id);
  });
  $('#station-new-note').addEventListener('click', () => {
    document.querySelector('main a[data-route="record"]')?.click();
    $('#note-channel').value = active === 'all' ? 'unfiled' : active;
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
  document.addEventListener('rn:stations-changed', () => rebuildStations().catch(console.error));
  document.addEventListener('rn:changed', () => counts().catch(console.error));
  function step(direction) {
    const order = ['all', 'unfiled', ...stations.map(item => item[0])];
    const index = order.indexOf(active);
    choose(order[(index + direction + order.length) % order.length]);
  }
  $('#tune-prev').addEventListener('click', () => step(-1));
  $('#tune-next').addEventListener('click', () => step(1));
  $('#radio-play').addEventListener('click', async () => {
    const audio = $('#note-audio');
    if (!$('#note-preview').hidden && audio.src) {
      try {
        if (audio.paused) await audio.play();
        else audio.pause();
      } catch (error) { $('#message').textContent = `Playback failed: ${error.message}`; }
    } else if (!$('#note-preview').hidden && $('#preview-body').textContent.trim()) {
      $('#read-note').click();
    } else $('#message').textContent = 'Select a note first.';
  });
  tune($('#channel-filter').value);
  counts().catch(console.error);
}
        