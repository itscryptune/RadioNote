const $ = selector => document.querySelector(selector);
const Recognizer = window.SpeechRecognition || window.webkitSpeechRecognition;
let listening = false;
let recognition = null;
 
function runCommand(words) {
  const command = words.toLowerCase().trim().replace(/[.!?]+$/, '');
  if (command === 'open library') $('[data-route="library"]').click();
  else if (command === 'new note') document.querySelector('main a[data-route="record"]').click();
  else if (command === 'open settings') $('[data-route="settings"]').click();
  else if (command.startsWith('search ')) {
    $('[data-route="library"]').click();
    $('#search').value = words.slice(7).trim();
    $('#search').dispatchEvent(new Event('input', {bubbles:true}));
  } else if (command === 'star note') $('#star-note').click();
  else if (command === 'read note') $('#read-note').click();
  else if (command === 'save note') $('#note-form').requestSubmit();
  else $('#message').textContent = `Command not found: ${words}`;
}
export function initVoice() {
  const button = $('#voice-command');
  if (!Recognizer) {
    button.disabled = true;
    $('#voice-feedback').textContent = 'NOT SUPPORTED HERE';
    return;
  }
  recognition = new Recognizer();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => { listening = true; button.textContent = 'Stop listening'; $('#voice-feedback').textContent = 'LISTENING'; };
  recognition.onend = () => { listening = false; button.textContent = 'Voice command'; if ($('#voice-feedback').textContent === 'LISTENING') $('#voice-feedback').textContent = 'READY'; };
  recognition.onerror = event => { $('#voice-feedback').textContent = `ERROR: ${event.error}`; };
  recognition.onresult = event => {
    const words = event.results[0][0].transcript.trim();
    $('#voice-feedback').textContent = words;
    runCommand(words);
  };
  button.addEventListener('click', () => {
    if (listening) recognition.stop();
    else { try { recognition.start(); } catch (error) { console.error(error); } }
  });
}
