(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const body = document.body;

  if (!hasGsap || reduce) document.documentElement.classList.add('no-gsap');
  const animate = hasGsap && !reduce;
  if (animate) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Золотые частицы ---------- */
  const canvas = $('#particles'), c = canvas.getContext('2d');
  let W, H, parts = [], intensity = 0.35, targetIntensity = 0.35, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
    const n = Math.round(Math.min(90, innerWidth / 14));
    parts = Array.from({ length: n }, () => spawn(true));
  }
  function spawn(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      r: (Math.random() * 1.6 + 0.4) * dpr, vy: (Math.random() * 0.25 + 0.08) * dpr,
      vx: (Math.random() - 0.5) * 0.15 * dpr, a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.02 + 0.005
    };
  }
  function draw() {
    c.clearRect(0, 0, W, H);
    intensity += (targetIntensity - intensity) * 0.02;
    for (const p of parts) {
      p.y -= p.vy; p.x += p.vx + Math.sin(p.tw) * 0.1; p.tw += p.ts;
      if (p.y < -10) Object.assign(p, spawn(false));
      const al = p.a * (0.5 + 0.5 * Math.sin(p.tw * 3)) * intensity;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(240,217,160,${al})`); g.addColorStop(1, 'rgba(217,180,106,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 4, 0, 6.283); c.fill();
    }
    requestAnimationFrame(draw);
  }
  resize(); addEventListener('resize', resize);
  if (!reduce) draw();

  /* ---------- Intro ---------- */
  const introEls = ['#introLine', '#introNames', '#introYears', '#introActions'];
  if (animate) {
    gsap.set(introEls, { opacity: 0, y: 18 });
    gsap.timeline({ delay: 0.8, defaults: { ease: 'power2.out' } })
      .to('#introLine', { opacity: 1, y: 0, duration: 2.2 })
      .to('#introNames', { opacity: 1, y: 0, duration: 2.4, onStart: () => { targetIntensity = 0.9; } }, '+=0.6')
      .to('#introYears', { opacity: 1, y: 0, duration: 2, letterSpacing: '.55em' }, '-=1')
      .to('#introActions', { opacity: 1, y: 0, duration: 1.6 }, '-=0.4');
  }

  const dots = $('#dots');
  $('#openBtn').addEventListener('click', () => {
    body.classList.remove('locked');
    dots.classList.add('show');
    targetIntensity = 0.55;
    $('#hero').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => { if (hasGsap) ScrollTrigger.refresh(); }, 900);
  });

  /* ---------- Музыка ---------- */
  const musicBtn = $('#musicBtn'), introMusic = $('#introMusic');
  function syncMusicUI(on) {
    [musicBtn, introMusic].forEach((b) => b.setAttribute('aria-pressed', String(on)));
    musicBtn.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
    introMusic.textContent = on ? '♪ Музыка включена' : '♪ Включить музыку';
  }
  if (window.Music) Music.onChange(syncMusicUI);
  [musicBtn, introMusic].forEach((b) => b.addEventListener('click', () => window.Music && Music.toggle()));

  /* ---------- Скролл-индикатор, наверх, навигация ---------- */
  const bar = $('#progressBar'), toTop = $('#toTop');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    toTop.classList.toggle('show', scrollY > innerHeight * 1.2);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  const dotLinks = $$('a', dots);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) dotLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { threshold: 0.5 });
  $$('main .scene').forEach((s) => io.observe(s));

  /* ---------- Анимации по скроллу ---------- */
  if (animate) {
    // Медленное приближение главного фото
    gsap.fromTo('#heroImg', { scale: 1 }, { scale: 1.14, duration: 22, ease: 'none', yoyo: true, repeat: -1 });

    // Появление элементов
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        opacity: 0, y: 36, duration: 1.4, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      });
    });

    // Параллакс
    $$('[data-parallax]').forEach((img) => {
      const host = img.closest('.shot, .son-bg') || img.parentElement;
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Первая сцена: мягкое растворение при уходе
    gsap.to('.intro-inner', {
      opacity: 0, y: -60, ease: 'none',
      scrollTrigger: { trigger: '#intro', start: 'top top', end: 'bottom 30%', scrub: true }
    });

    // Галерея: лёгкий сдвиг колонок
    $$('.gallery figure').forEach((f, i) => {
      gsap.to(f, {
        y: i % 2 ? -22 : 14, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });

    // Частицы усиливаются в финале
    ScrollTrigger.create({
      trigger: '#finale', start: 'top 60%', end: 'bottom bottom',
      onEnter: () => { targetIntensity = 1.3; }, onLeaveBack: () => { targetIntensity = 0.55; }
    });
  } else {
    targetIntensity = 0.8;
  }

  /* ---------- Просмотр фото ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg');
  function closeLb() { lb.hidden = true; }
  $$('.zoom').forEach((b) => b.addEventListener('click', () => {
    const im = $('img', b); lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; lb.hidden = false;
    $('#lbClose').focus();
  }));
  lb.addEventListener('click', (e) => { if (e.target !== lbImg) closeLb(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

  /* ---------- Курсор (только мышь) ---------- */
  if (matchMedia('(pointer:fine)').matches) {
    const cur = $('#cursor'); body.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function loop() {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      cur.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', (e) => cur.classList.toggle('hot', !!e.target.closest('button,a,.zoom')));
  }
})();
