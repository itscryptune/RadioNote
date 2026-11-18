const $ = selector => document.querySelector(selector);
let recorder = null, stream = null, chunks = [], started = 0;
let timer = null, meter = null, context = null, phase = 'idle', voiceBusy = false;
let draft = {audio:null, duration:0}, draftURL = null, lastBusy = null;
 
export const getDraft = () => draft;
export const isRecording = () => phase !== 'idle';
 
export function setDraft(audio = null, duration = 0) {
  const player = $('#draft-audio');
  player.pause();
  player.removeAttribute('src');
  if (draftURL) URL.revokeObjectURL(draftURL);
  draft = {audio, duration};
  draftURL = audio instanceof Blob && audio.size ? URL.createObjectURL(audio) : null;
  if (draftURL) player.src = draftURL;
  player.hidden = !draftURL;
  $('#clear-audio').hidden = !draftURL;
  player.load();
}
 
function controls() {
  $('#record-start').disabled = phase !== 'idle' || voiceBusy;
  $('#record-stop').disabled = phase !== 'recording';
  $('#mic-device').disabled = phase !== 'idle';
  const busy = phase !== 'idle';
  if (busy !== lastBusy) {
    lastBusy = busy;
    document.dispatchEvent(new CustomEvent('rn:recording', {detail:{busy}}));
  }
}
 
function release() {
  clearInterval(timer);
  clearInterval(meter);
  timer = meter = null;
  if (context) context.close().catch(console.error);
  context = null;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  recorder = null;
  phase = 'idle';
  controls();
}
 
async function devices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const select = $('#mic-device'), previous = select.value;
  const inputs = (await navigator.mediaDevices.enumerateDevices()).filter(item => item.kind === 'audioinput');
  select.replaceChildren(new Option('Default microphone', ''));
  for (const input of inputs) select.add(new Option(input.label || `Microphone ${select.length}`, input.deviceId));
  if ([...select.options].some(option => option.value === previous)) select.value = previous;
}
 
function listenToLevel(sourceStream) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context = new Audio();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(sourceStream).connect(analyser);
  context.resume().catch(console.error);
  const samples = new Uint8Array(analyser.fftSize);
  meter = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    let total = 0;
    for (const value of samples) total += ((value - 128) / 128) ** 2;
    const level = Math.min(100, Math.round(Math.sqrt(total / samples.length) * 400));
    $('#mic-level').textContent = `INPUT LEVEL ${level}%${level < 2 ? ' / check mic if it stays here' : ''}`;
    document.querySelectorAll('#mic-visual span').forEach((bar, index) => {
      bar.style.height = `${Math.max(8, Math.min(90, 12 + level * (0.6 + index * 0.12)))}px`;
    });
  }, 150);
}
 
export function initRecorder() {
  const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.isSecureContext);
  $('#record-start').disabled = !supported;
  $('#record-state').textContent = supported ? 'READY' : 'UNAVAILABLE';
  if (!supported) {
    $('#mic-level').textContent = 'Use localhost or HTTPS in a browser that supports recording.';
    return;
  }
  devices().catch(console.error);
  $('#draft-audio').addEventListener('error', () => {
    $('#message').textContent = 'This audio format could not be played here. Try recording in Chrome or Edge.';
  });
  document.addEventListener('rn:voice', event => {
    voiceBusy = !!event.detail.busy;
    controls();
  });
  $('#record-start').addEventListener('click', async () => {
    if (phase !== 'idle' || voiceBusy) return;
    phase = 'starting';
    controls();
    $('#record-state').textContent = 'CONNECTING';
    try {
      const id = $('#mic-device').value;
      stream = await navigator.mediaDevices.getUserMedia({audio:id ? {deviceId:{exact:id}} : true});
      await devices().catch(console.warn);
      const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
      const type = types.find(value => MediaRecorder.isTypeSupported(value));
      const current = type ? new MediaRecorder(stream, {mimeType:type}) : new MediaRecorder(stream);
      recorder = current;
      chunks = [];
      started = Date.now();
      let failed = false;
      current.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      current.onerror = event => {
        failed = true;
        console.error('Recording error', event.error || event);
        $('#record-state').textContent = 'RECORDING ERROR';
      };
      current.onstop = () => {
        const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
        const blob = new Blob(chunks, {type:current.mimeType || chunks[0]?.type || 'audio/webm'});
        release();
        if (failed || !blob.size) {
          $('#record-state').textContent = 'NO AUDIO SAVED';
          $('#message').textContent = 'The microphone returned no usable clip. Check its permission and input device.';
          return;
        }
        setDraft(blob, seconds);
        $('#record-state').textContent = 'CLIP READY';
        $('#message').textContent = `Recorded ${seconds}s (${Math.round(blob.size / 1024)} KB). Play it before saving.`;
      };
      current.start();
      phase = 'recording';
      controls();
      $('#record-state').textContent = 'RECORDING';
      $('#record-timer').textContent = '00:00';
      timer = setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        $('#record-timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      }, 250);
      try { listenToLevel(stream); } catch (error) { console.warn('Mic meter unavailable', error); }
    } catch (error) {
      console.error('Could not start microphone', error);
      release();
      $('#record-state').textContent = 'MIC ERROR';
      $('#message').textContent = `${error.name || 'Microphone error'}: ${error.message || 'Check browser permissions and input device.'}`;
    }
  });
  $('#record-stop').addEventListener('click', () => {
    if (phase !== 'recording' || recorder?.state !== 'recording') return;
    phase = 'finishing';
    controls();
    $('#record-state').textContent = 'FINISHING';
    recorder.stop();
  });
  $('#clear-audio').addEventListener('click', () => {
    if (isRecording()) return;
    setDraft(null);
    $('#record-state').textContent = 'READY';
    $('#record-timer').textContent = '00:00';
    $('#mic-level').textContent = 'INPUT LEVEL —';
  });
}