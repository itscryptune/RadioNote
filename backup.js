import {listNotes, putNote, listStations, putStation} from './db.js';
import {refreshLibrary} from './library.js';
import {refreshStats} from './settings.js';
 
const $ = selector => document.querySelector(selector);
function toDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function fromDataURL(value) {
  if (!/^data:audio\/[\w.+-]+;base64,/.test(value)) throw new Error('Invalid audio in backup');
  const [head, encoded] = value.split(',', 2);
  const mime = head.slice(5).split(';')[0];
  const bytes = atob(encoded);
  const data = Uint8Array.from(bytes, char => char.charCodeAt(0));
  return new Blob([data], {type:mime});
}
export function initBackup() {
  $('#export-notes').addEventListener('click', async () => {
    try {
      const notes = await listNotes();
      const stations = await listStations();
      const records = [];
      for (const note of notes) {
        const {audio, ...rest} = note;
        records.push({...rest, audioData:audio ? await toDataURL(audio) : null});
      }
      const json = JSON.stringify({format:'radionote', version:2, exportedAt:new Date().toISOString(), stations, records}, null, 2);
      const url = URL.createObjectURL(new Blob([json], {type:'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = `radionote-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('#message').textContent = `Exported ${notes.length} notes.`;
    } catch (error) { console.error(error); $('#message').textContent = 'Could not export the archive.'; }
  });
  $('#import-notes').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.format !== 'radionote' || data?.version !== 2 || !Array.isArray(data.records)) throw new Error('Unsupported RadioNote backup');

      if (!Array.isArray(data.stations)) throw new Error('Missing stations in backup');
      const incomingStations = data.stations.map(item => {
        if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !item.name.trim()) throw new Error('Invalid station');
        return {id:item.id, name:item.name.trim(), createdAt:Number.isFinite(item.createdAt) ? item.createdAt : Date.now()};
      });

      const records = data.records.map(row => {
        if (!row || typeof row.id !== 'string' || typeof row.title !== 'string' || !row.title.trim() ||
            !['thoughts','ideas','moments','work'].includes(row.channel) || typeof row.body !== 'string' ||
            !Number.isFinite(row.createdAt) || !Number.isFinite(row.updatedAt) ||
            !(row.audioData === null || row.audioData === undefined || typeof row.audioData === 'string')) throw new Error('Invalid note data');
        const {audioData, audio, ...rest} = row;
        return {...rest, favorite:row.favorite ? 1 : 0, audio:audioData ? fromDataURL(audioData) : null};
      });
      if (!confirm(`Import ${records.length} notes? IDs already in this browser will be overwritten.`)) return;

      for (const station of incomingStations) await putStation(station);
      for (const note of records) await putNote(note);
      $('#channel-filter').value = 'all';
      $('#favorites-only').checked = false;
      $('#search').value = '';
      await refreshLibrary(null);
      await refreshStats();
      document.dispatchEvent(new Event('rn:stations-changed'));
      $('#message').textContent = `Imported ${records.length} notes.`;
    } catch (error) { console.error(error); $('#message').textContent = `Import stopped: ${error.message}`; }
    finally { event.target.value = ''; }
  });
}
