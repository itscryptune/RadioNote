import {getSetting, setSetting} from './db.js';
import {getSelected} from './library.js';
 
const $ = selector => document.querySelector(selector);
const available = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let current = null;
export function speak(text) {
  if (!available || !text?.trim()) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  current = utterance;
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang === 'en-IN') || voices.find(voice => voice.lang.startsWith('en')) || null;
  utterance.onerror = event => {
    if (current !== utterance) return;
    if (!['canceled', 'interrupted'].includes(event.error)) {
      console.warn('Speech output:', event.error);
      $('#message').textContent = `Read aloud failed: ${event.error}`;
    }
    current = null;
  };
  utterance.onend = () => { if (current === utterance) current = null; };
  speechSynthesis.resume();
  speechSynthesis.speak(utterance);
  return true;
}
export function initSpeech() {
  $('#read-note').disabled = !available;
  $('#speak-status').disabled = !available;
  $('#read-note').addEventListener('click', () => {
    const note = getSelected();
    if (!note || !note.body?.trim()) { $('#message').textContent = 'Select a note with written text first.'; return; }
    if (speak(`${note.title}. ${note.body}`)) $('#message').textContent = 'Reading note aloud. Check device audio output if silent.';
  });
  $('#speak-status').addEventListener('change', async event => {
    try { await setSetting('speakStatus', event.target.checked); }
    catch (error) { console.error(error); $('#message').textContent = 'Could not save speech setting.'; }
  });
  getSetting('speakStatus').then(value => { $('#speak-status').checked = !!value; }).catch(console.error);
  document.addEventListener('rn:announce', async event => {
    try { if (await getSetting('speakStatus')) speak(event.detail); }
    catch (error) { console.error(error); }
  });
}