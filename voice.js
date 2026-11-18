const $ = selector => document.querySelector(selector);
const Recognizer = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, phase = 'idle', mode = 'command', recorderBusy = false, heard = false, lastBusy = null;
 
const feedback = text => { $('#voice-feedback').textContent = text; };
function controls() {
  $('#voice-command').disabled = !Recognizer || recorderBusy;
  $('#voice-dictate').disabled = !Recognizer || recorderBusy;
  $('#voice-command').textContent = phase === 'idle' ? 'Voice command' : 'Stop listening';
  const busy = phase !== 'idle';
  if (busy !== lastBusy) {
    lastBusy = busy;
    document.dispatchEvent(new CustomEvent('rn:voice', {detail:{busy}}));
  }
}
function openStation(name) {
  document.querySelector(`nav a[data-route="${name}"]`)?.click();
}
function runCommand(words) {
  const command = words.toLowerCase().trim().replace(/[.!?]+$/, '');
  if (command === 'open library') openStation('library');
  else if (command === 'new note') document.querySelector('main a[data-route="record"]')?.click();
  else if (command === 'open settings') openStation('settings');
  else if (command.startsWith('search ')) {
    openStation('library');
    $('#search').value = words.slice(7).trim();
    $('#search').dispatchEvent(new Event('input', {bubbles:true}));
  } else if (command.startsWith('title ')) {
    if ($('[data-view="record"]').hidden) return feedback('Open a note first, then say its title.');
    $('#note-title').value = words.slice(6).trim();
  } else if (command.startsWith('dictate ')) {
    if ($('[data-view="record"]').hidden) return feedback('Open a note before dictating.');
    addWords(words.slice(8).trim());
  } else if (command === 'save note') {
    if ($('[data-view="record"]').hidden) return feedback('Open a note before saving.');
    $('#note-form').requestSubmit();
  } else if (command === 'star note' || command === 'read note') {
    if ($('#note-preview').hidden) return feedback('Select a note from the library first.');
    $(command === 'star note' ? '#star-note' : '#read-note').click();
  } else feedback(`Unknown command: ${words}`);
}
function addWords(words) {
  if (!words) return;
  const input = $('#note-body');
  input.value += `${input.value.trim() ? ' ' : ''}${words}`;
  input.dispatchEvent(new Event('input', {bubbles:true}));
  input.focus();
}
function start(nextMode) {
  if (recorderBusy) return feedback('Stop recording before using voice controls.');
  if (phase !== 'idle') return;
  mode = nextMode;
  heard = false;
  phase = 'starting';
  controls();
  feedback('CONNECTING TO SPEECH RECOGNITION');
  try { recognition.start(); }
  catch (error) { console.error(error); phase = 'idle'; controls(); feedback(`${error.name}: ${error.message}`); }
}
export function initVoice() {
  if (!Recognizer) {
    $('#voice-command').disabled = true;
    $('#voice-dictate').disabled = true;
    return feedback('Speech recognition is not supported in this browser. Try Chrome or Edge.');
  }
  recognition = new Recognizer();
  recognition.lang = 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => { phase = 'listening'; controls(); feedback(mode === 'dictate' ? 'SPEAK THE WORDS FOR YOUR NOTE' : 'LISTENING FOR A COMMAND'); };
  recognition.onresult = event => {
    const words = event.results[event.resultIndex]?.[0]?.transcript?.trim();
    if (!words) return;
    heard = true;
    feedback(`HEARD: ${words}`);
    if (mode === 'dictate') addWords(words);
    else runCommand(words);
  };
  recognition.onerror = event => {
    const hints = {'not-allowed':'Allow microphone access in your browser.',
      'no-speech':'No speech heard. Try again and speak clearly.', network:'Speech service unavailable; check your connection.',
      'audio-capture':'No working microphone detected.', 'language-not-supported':'Try changing recognition language.'};
    feedback(hints[event.error] || `Speech error: ${event.error}`);
    console.warn('Speech recognition:', event.error);
  };
  recognition.onend = () => {
    phase = 'idle';
    controls();
    if (!heard && $('#voice-feedback').textContent.includes('LISTENING')) feedback('No command heard. Try again.');
  };
  document.addEventListener('rn:recording', event => { recorderBusy = !!event.detail.busy; controls(); });
  $('#voice-dictate').addEventListener('click', () => {
    if (phase === 'idle') start('dictate');
    else recognition.stop();
  });
  $('#voice-command').addEventListener('click', () => {
    if (phase === 'idle') start('command');
    else recognition.stop();
  });
  controls();
}