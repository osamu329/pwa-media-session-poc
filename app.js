(function () {
  'use strict';

  const BUILD_TIME = '2026-07-06T02:30+09:00';

  document.getElementById('build-info').textContent = 'Build: ' + BUILD_TIME;

  const audio = document.getElementById('audio');
  const logContainer = document.getElementById('log-container');
  const logCountBadge = document.getElementById('log-count');
  const playerStatus = document.getElementById('player-status');
  const handlerListEl = document.getElementById('handler-list');

  let logEntries = [];

  // Generate a simple sine wave audio as a data URI (1 min, 440Hz)
  function generateToneDataURI() {
    const sampleRate = 44100;
    const duration = 60;
    const frequency = 440;
    const numSamples = sampleRate * duration;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  // Logging
  function addLog(action, detail) {
    const now = new Date();
    const time = now.toLocaleTimeString('ja-JP', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const entry = { time, action, detail: detail || '' };
    logEntries.push(entry);
    logCountBadge.textContent = logEntries.length;

    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="time">${entry.time}</span> <span class="action">[${entry.action}]</span> <span class="detail">${entry.detail}</span>`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Copy log
  document.getElementById('btn-copy').addEventListener('click', function () {
    const text = logEntries.map(e => `${e.time} [${e.action}] ${e.detail}`).join('\n');
    navigator.clipboard.writeText(text).then(function () {
      addLog('SYSTEM', 'Log copied to clipboard');
    }).catch(function () {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      addLog('SYSTEM', 'Log copied (fallback)');
    });
  });

  // Clear log
  document.getElementById('btn-clear').addEventListener('click', function () {
    logEntries = [];
    logContainer.innerHTML = '';
    logCountBadge.textContent = '0';
  });

  // Player controls
  function updateStatus(status) {
    playerStatus.textContent = 'Status: ' + status;
  }

  function play() {
    audio.play().then(function () {
      updateStatus('playing');
      addLog('PLAY', 'Audio started');
      updateMediaSessionState('playing');
    }).catch(function (e) {
      addLog('ERROR', 'Play failed: ' + e.message);
    });
  }

  function pause() {
    audio.pause();
    updateStatus('paused');
    addLog('PAUSE', 'Audio paused');
    updateMediaSessionState('paused');
  }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    updateStatus('stopped');
    addLog('STOP', 'Audio stopped');
    updateMediaSessionState('none');
  }

  document.getElementById('btn-play').addEventListener('click', play);
  document.getElementById('btn-pause').addEventListener('click', pause);
  document.getElementById('btn-stop').addEventListener('click', stop);

  // Media Session metadata
  function updateMetadata() {
    if (!('mediaSession' in navigator)) return;

    const title = document.getElementById('meta-title').value;
    const artist = document.getElementById('meta-artist').value;
    const album = document.getElementById('meta-album').value;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: album,
      artwork: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });
    addLog('METADATA', `Updated: "${title}" - ${artist} (${album})`);
  }

  document.getElementById('btn-update-meta').addEventListener('click', updateMetadata);

  function updateMediaSessionState(state) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
      addLog('PLAYBACK_STATE', state);
    }
  }

  // Media Session action handlers
  const allActions = [
    'play',
    'pause',
    'stop',
    'seekbackward',
    'seekforward',
    'seekto',
    'previoustrack',
    'nexttrack',
    'skipad',
    'togglemicrophone',
    'togglecamera',
    'hangup',
    'previousslide',
    'nextslide',
    'enterpictureinpicture'
  ];

  const registeredHandlers = [];

  function registerHandlers() {
    if (!('mediaSession' in navigator)) {
      addLog('ERROR', 'Media Session API not supported');
      return;
    }

    allActions.forEach(function (action) {
      try {
        navigator.mediaSession.setActionHandler(action, function (details) {
          let detailStr = JSON.stringify(details, null, 0);
          addLog('ACTION:' + action, detailStr);

          // Handle play/pause from external controls
          if (action === 'play') {
            audio.play().then(function () {
              updateStatus('playing');
              updateMediaSessionState('playing');
            });
          } else if (action === 'pause') {
            audio.pause();
            updateStatus('paused');
            updateMediaSessionState('paused');
          } else if (action === 'stop') {
            audio.pause();
            audio.currentTime = 0;
            updateStatus('stopped');
            updateMediaSessionState('none');
          } else if (action === 'seekbackward') {
            audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
          } else if (action === 'seekforward') {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + (details.seekOffset || 10));
          } else if (action === 'seekto') {
            if (details.seekTime != null) {
              audio.currentTime = details.seekTime;
            }
          } else if (action === 'previoustrack') {
            audio.currentTime = 0;
          } else if (action === 'nexttrack') {
            audio.currentTime = 0;
          }
        });
        registeredHandlers.push(action);
      } catch (e) {
        addLog('HANDLER_ERROR', `${action}: ${e.message}`);
      }
    });

    renderHandlerList();
    addLog('SYSTEM', `Registered ${registeredHandlers.length}/${allActions.length} handlers`);
  }

  function renderHandlerList() {
    handlerListEl.innerHTML = '';
    allActions.forEach(function (action) {
      const tag = document.createElement('span');
      tag.className = 'handler-tag' + (registeredHandlers.includes(action) ? ' active' : '');
      tag.textContent = action;
      handlerListEl.appendChild(tag);
    });
  }

  // Position state updates
  function updatePositionState() {
    if (!('mediaSession' in navigator)) return;
    if (audio.paused || !isFinite(audio.duration)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime
      });
    } catch (e) {
      // ignore
    }
  }

  audio.addEventListener('timeupdate', updatePositionState);

  // Additional event listeners for debugging
  audio.addEventListener('play', function () { addLog('AUDIO_EVENT', 'play'); });
  audio.addEventListener('pause', function () { addLog('AUDIO_EVENT', 'pause'); });
  audio.addEventListener('ended', function () { addLog('AUDIO_EVENT', 'ended'); });
  audio.addEventListener('error', function (e) { addLog('AUDIO_EVENT', 'error: ' + (e.message || audio.error?.message || 'unknown')); });

  // Init
  function init() {
    addLog('SYSTEM', 'App initialized');
    addLog('SYSTEM', 'Media Session API: ' + ('mediaSession' in navigator ? 'supported' : 'NOT supported'));
    addLog('SYSTEM', 'User Agent: ' + navigator.userAgent);

    // Generate tone audio
    audio.src = generateToneDataURI();
    addLog('SYSTEM', 'Tone audio generated (440Hz, 60s)');

    registerHandlers();
    updateMetadata();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function () {
        addLog('SYSTEM', 'Service Worker registered');
      }).catch(function (e) {
        addLog('ERROR', 'SW registration failed: ' + e.message);
      });
    }
  }

  init();
})();
