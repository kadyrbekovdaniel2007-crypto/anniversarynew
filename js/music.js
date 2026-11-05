/* =========================================================
   Музыка
   ---------------------------------------------------------
   По умолчанию играет авторская мелодия, которая создаётся прямо
   в браузере (мягкое фортепиано + струнный фон) — без авторских прав.

   Чтобы использовать свой трек:
   1) положите файл в assets/music/romantic.mp3
   2) поставьте USE_FILE = true
   ========================================================= */
(function () {
  const USE_FILE = true;
  const FILE_SRC = 'assets/music/romantic.mp3';
  const VOLUME = 0.55;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BARS = [ // C — Am — F — G
    { arp: [60, 64, 67, 72, 76, 72, 67, 64], bass: 36, pad: [55, 60, 64] },
    { arp: [57, 60, 64, 69, 72, 69, 64, 60], bass: 33, pad: [52, 57, 60] },
    { arp: [53, 57, 60, 65, 69, 65, 60, 57], bass: 41, pad: [53, 57, 60] },
    { arp: [55, 59, 62, 67, 71, 67, 62, 59], bass: 43, pad: [55, 59, 62] }
  ];
  const STEP = 0.4; // длительность восьмой, сек

  let ctx, master, verb, timer, nextTime = 0, bar = 0, audio = null;
  const state = { playing: false, mode: null };
  const listeners = [];
  const emit = () => listeners.forEach((f) => f(state.playing));

  function impulse(c, seconds = 3.2) {
    const len = c.sampleRate * seconds, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  function setupCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    const dry = ctx.createGain(); dry.gain.value = 0.8;
    lp.connect(dry); lp.connect(verb); verb.connect(wet);
    dry.connect(master); wet.connect(master); master.connect(ctx.destination);
    master.input = lp;
  }

  function piano(m, t, vel = 0.16, dur = 2.6) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master.input);
    [['triangle', 1, 1], ['sine', 2, 0.3], ['sine', 3, 0.1]].forEach(([type, mul, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = mtof(m) * mul; og.gain.value = a;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.1);
    });
  }

  function pad(notes, t, dur) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    f.connect(g); g.connect(master.input);
    notes.forEach((m) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 1);
    }));
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 1.4) {
      const b = BARS[bar % BARS.length];
      b.arp.forEach((n, i) => piano(n, nextTime + i * STEP, i % 4 === 0 ? 0.2 : 0.13));
      piano(b.bass, nextTime, 0.22, 3.4);
      pad(b.pad, nextTime, STEP * 8);
      nextTime += STEP * 8; bar++;
    }
  }

  function fade(to, secs = 3) {
    if (state.mode === 'file' && audio) {
      const from = audio.volume, t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / (secs * 1000));
        audio.volume = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(tick); else if (to === 0) audio.pause();
      };
      requestAnimationFrame(tick);
    } else if (master) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(to, t + secs);
    }
  }

  function startSynth() {
    state.mode = 'synth';
    setupCtx();
    const go = () => {
      nextTime = ctx.currentTime + 0.2; bar = 0;
      clearInterval(timer); timer = setInterval(schedule, 300); schedule();
      fade(VOLUME * 0.9, 4);
    };
    ctx.state === 'suspended' ? ctx.resume().then(go) : go();
  }

  function startFile() {
    audio = audio || Object.assign(new Audio(FILE_SRC), { loop: true, volume: 0 });
    state.mode = 'file';
    return audio.play().then(() => fade(VOLUME, 3)).catch(() => startSynth());
  }

  const Music = {
    get playing() { return state.playing; },
    onChange(fn) { listeners.push(fn); },
    play() {
      if (state.playing) return;
      state.playing = true; emit();
      USE_FILE ? startFile() : startSynth();
    },
    pause() {
      if (!state.playing) return;
      state.playing = false; emit();
      fade(0, 1.2);
      setTimeout(() => {
        if (state.playing) return;
        if (state.mode === 'synth') { clearInterval(timer); ctx && ctx.suspend(); }
      }, 1400);
    },
    toggle() { state.playing ? Music.pause() : Music.play(); }
  };
  window.Music = Music;
})();
