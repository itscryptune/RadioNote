import {getSetting, setSetting} from './db.js';
import {getSelected} from './library.js';
 
const $ = selector => document.querySelector(selector);
const available = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
export function speak(text) {
  if (!available) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = document.documentElement.lang || 'en-US';
  utterance.rate = 0.95;
  speechSynthesis.speak(utterance);
  return true;
}
export function initSpeech() {
  $('#read-note').disabled = !available;
  $('#speak-status').disabled = !available;
  $('#read-note').addEventListener('click', () => {
    const note = getSelected();
    if (!note || !note.body.trim()) { $('#message').textContent = 'This note has no text to read.'; return; }
    speak(`${note.title}. ${note.body}`);
  });
  $('#speak-status').addEventListener('change', async event => {
    await setSetting('speakStatus', event.target.checked);
  });
  getSetting('speakStatus').then(value => { $('#speak-status').checked = !!value; }).catch(console.error);
  document.addEventListener('rn:announce', async event => {
    try { if (await getSetting('speakStatus')) speak(event.detail); } catch (error) { console.error(error); }
  });
}
