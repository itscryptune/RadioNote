const $ = selector => document.querySelector(selector);
let media = null;
let chunks = [];
let began = 0;
let tick = null;
let draft = {audio:null, duration:0};
let draftURL = null;
 
export const getDraft = () => draft;
export function setDraft(audio = null, duration = 0) {
  if (draftURL) URL.revokeObjectURL(draftURL);
  draft = {audio, duration};
  draftURL = audio ? URL.createObjectURL(audio) : null;
  const player = $('#draft-audio');
  player.pause();
  player.removeAttribute('src');
  if (draftURL) player.src = draftURL;
  player.hidden = !audio;
  $('#clear-audio').hidden = !audio;
  player.load();
}
function stopTracks() {
  media?.stream.getTracks().forEach(track => track.stop());
  media = null;
  clearInterval(tick);
  tick = null;
  $('#record-start').disabled = false;
  $('#record-stop').disabled = true;
}
export function initRecorder() {
  const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  $('#record-start').disabled = !supported;
  $('#record-state').textContent = supported ? 'READY' : 'UNAVAILABLE';
  $('#record-start').addEventListener('click', async () => {
    if (media) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const type = types.find(value => MediaRecorder.isTypeSupported(value));
      media = type ? new MediaRecorder(stream, {mimeType:type}) : new MediaRecorder(stream);
      chunks = [];
      began = Date.now();
      $('#record-timer').textContent = '00:00';
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => {
        const seconds = Math.round((Date.now() - began) / 1000);
        const blob = new Blob(chunks, {type:media.mimeType || 'audio/webm'});
        if (blob.size) setDraft(blob, seconds);
        $('#record-state').textContent = 'CLIP READY';
        stopTracks();
      };
      media.onerror = () => { $('#record-state').textContent = 'RECORDING ERROR'; stopTracks(); };
      media.start();
      $('#record-start').disabled = true;
      $('#record-stop').disabled = false;
      $('#record-state').textContent = 'RECORDING';
      tick = setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000);
        $('#record-timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      }, 300);
    } catch (error) {
      console.error(error);
      $('#record-state').textContent = 'MIC ACCESS DENIED';
      $('#message').textContent = 'Check microphone access and try again.';
    }
  });
  $('#record-stop').addEventListener('click', () => {
    if (media?.state === 'recording') media.stop();
  });
  $('#clear-audio').addEventListener('click', () => {
    setDraft(null);
    $('#record-state').textContent = 'READY';
    $('#record-timer').textContent = '00:00';
  });
}
