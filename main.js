/* ====================================================================
   BlackBox — main.js  (v5: configuratore prezzi in Pacchetti, niente più pop-up quiz)
   ==================================================================== */
(function () {
  'use strict';
  const html = document.documentElement;
  const body = document.body;
  if (location.search.indexOf('flat') !== -1) html.classList.add('flat');

  /* year */
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* language */
  const langToggle = document.getElementById('langToggle');
  function applyLang(lang) {
    body.setAttribute('data-lang', lang);
    html.lang = lang;
    document.querySelectorAll('[data-it][data-en]').forEach(el => {
      const t = el.getAttribute('data-' + lang);
      if (t !== null) el.textContent = t;
    });
    try { localStorage.setItem('bb-lang', lang); } catch (e) {}
    /* 2026-08-29: qui si rimisurava la pastiglia delle schede quando il
       testo cambiava lingua. Le schede non ci sono piu'. */
  }
  let lang = 'it';
  try { lang = localStorage.getItem('bb-lang') || 'it'; } catch (e) {}
  applyLang(lang);
  if (langToggle) langToggle.addEventListener('click', () => applyLang(body.getAttribute('data-lang') === 'it' ? 'en' : 'it'));

  /* hero video: avvio da JS - nessun attributo autoplay (vedi embed A).
     Se il browser rifiuta play() (iOS in risparmio energetico) o se sono attive le
     animazioni ridotte, il <video> viene tolto di mezzo e resta il fotogramma poster:
     senza elemento video Safari non ha nulla su cui disegnare i suoi comandi nativi.
     Al primo gesto dell'utente il video torna e riprova a partire. */
  const video = document.querySelector('.w-background-video video') || document.getElementById('heroVideo');
  if (video) {
    video.muted = true; video.playsInline = true;
    video.removeAttribute('autoplay');
    video.controls = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const contenitore = video.closest('.w-background-video') || video.parentElement;
    /* il poster Webflow lo tiene come background-image sul <video> stesso */
    const poster = video.style.backgroundImage;
    let wanted = !reduced;
    let nascosto = video.style.display === 'none';   /* lo script inline della testata puo' averlo gia' nascosto */

    function mostraPoster() {
      if (nascosto || !poster || !contenitore) return;   /* senza poster meglio il video fermo che il vuoto */
      nascosto = true;
      contenitore.style.backgroundImage = poster;
      contenitore.style.backgroundSize = 'cover';
      contenitore.style.backgroundPosition = 'center';
      video.style.display = 'none';
    }

    function togliPoster() {
      if (!nascosto) return;
      nascosto = false;
      video.style.display = '';
      contenitore.style.backgroundImage = '';
    }

    const tryPlay = () => {
      if (!wanted) return;
      togliPoster();
      const p = video.play();
      if (p && p.catch) p.catch(mostraPoster);
    };

    if (reduced) mostraPoster(); else tryPlay();

    ['touchstart', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, tryPlay, { once: true, passive: true }));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) tryPlay(); else if (!video.paused) video.pause();
      })).observe(video);
    }
  }

  /* ---------- hero: profondità reattiva al mouse (overlay/grana/bagliore molto leggeri) ---------- */
  const heroEl = document.getElementById('hero');
  if (heroEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let hx = 50, hy = 40, tx = 50, ty = 40;
    window.addEventListener('pointermove', (e) => {
      const r = heroEl.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    }, { passive: true });
    (function tickHero() {
      hx += (tx - hx) * 0.05;
      hy += (ty - hy) * 0.05;
      heroEl.style.setProperty('--hx', hx.toFixed(2) + '%');
      heroEl.style.setProperty('--hy', hy.toFixed(2) + '%');
      requestAnimationFrame(tickHero);
    })();
  }

  /* ---------- marquee "Lavoriamo con": scorrimento automatico + trascinabile (mouse e touch) ---------- */
  (function () {
    const wrap = document.querySelector('.marquee');
    const track = document.querySelector('.marquee__track');
    if (!wrap || !track) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DURATION_MS = 52000; /* stesso ritmo di prima per un giro completo */

    let setWidth = 0;
    function measure() { setWidth = track.scrollWidth / 2; }
    measure();
    window.addEventListener('resize', measure);

    let offset = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let lastTime = null;

    function wrapOffset() {
      if (setWidth <= 0) return;
      offset = ((offset % setWidth) + setWidth) % setWidth;
    }
    function apply() {
      track.style.transform = 'translateX(' + (-offset) + 'px)';
    }
    function frame(t) {
      if (!dragging && !reduceMotion && setWidth > 0) {
        if (lastTime !== null) offset += (setWidth / DURATION_MS) * (t - lastTime);
        wrapOffset();
        apply();
      }
      lastTime = t;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    wrap.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartOffset = offset;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      offset = dragStartOffset - (e.clientX - dragStartX);
      wrapOffset();
      apply();
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { wrap.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);
    wrap.addEventListener('pointerleave', (e) => { if (dragging) endDrag(e); });
  })();

  /* ---------- intro (Netflix-style reveal) ---------- */
  const intro = document.getElementById('intro');
  function introDone() { body.classList.add('intro-done'); }
  if (html.classList.contains('no-intro') || !intro || location.search.indexOf('noanim') !== -1) {
    if (intro) intro.style.display = 'none';
    introDone();
  } else {
    const startIntro = () => {
      intro.classList.add('fonts-ready');
      requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('play')));
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startIntro).catch(startIntro);
      setTimeout(startIntro, 1200);
    } else {
      startIntro();
    }
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      intro.style.display = 'none';
      introDone();
      try { sessionStorage.setItem('bb-intro', '1'); } catch (e) {}
    };
    intro.addEventListener('animationend', (e) => { if (e.animationName === 'introReveal') finish(); });
    /* 2026-08-29: la sequenza "Convergenza" chiude a 4,1s (zoom originale da
       2,1s con ritardo 2s), non piu' a 4,7s. La rete di sicurezza resta mezzo
       secondo oltre la fine vera: se la accorciamo troppo taglia l'intro a
       chi ha il font lento, se resta a 5200 lascia lo schermo nero fermo
       piu' di un secondo quando l'animationend non arriva. */
    setTimeout(finish, 4600);
  }
  /* La via di fuga inline dell'embed A legge questa bandiera. Sta QUI e non in cima:
     in cima proverebbe solo che lo script e' partito, non che l'intro sa piu' chiudersi.
     Se main.js esplode prima di questo punto, la bandiera non c'e' e il nero se ne va lo stesso. */
  window.__bbMainAttivo = 1;

  /* nav scroll state + progress */
  const navWrap = document.getElementById('nav');
  const navInner = document.querySelector('.nav');
  const progress = document.querySelector('.scroll-progress');
  let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  function updateMaxScroll() { maxScroll = document.documentElement.scrollHeight - window.innerHeight; }
  window.addEventListener('resize', updateMaxScroll, { passive: true });
  window.addEventListener('load', updateMaxScroll);
  function onScroll() {
    const sc = window.scrollY;
    if (navWrap) navWrap.classList.toggle('scrolled', sc > 30);
    if (progress) progress.style.width = (maxScroll > 0 ? (sc / maxScroll) * 100 : 0) + '%';
    scrollTicking = false;
  }
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(onScroll);
      scrollTicking = true;
    }
  }, { passive: true });
  onScroll();

  /* mobile menu */
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navInner && navInner.classList.toggle('open');
    });
  }

  /* ---------- strati di sotto: la parallasse ----------
     Le fasce divisorie stanno sotto il piano del sito e il loro contenuto
     scorre piu' lento della pagina. E' il segnale di profondita' che
     l'occhio legge per primo, e non chiede prospettiva ne' trasformazioni
     3d: solo uno spostamento verticale proporzionale a quanto la fascia
     e' lontana dal centro dello schermo.
     Con "riduci animazioni" non parte: la' la profondita' la fanno gia'
     il colore piu' chiaro della fascia e le ombre sui bordi. */
  (function () {
    const strati = Array.prototype.slice.call(document.querySelectorAll('[data-parallasse]'));
    if (!strati.length) return;
    /* La preferenza si ascolta, non si legge una volta sola: chi la accende a
       pagina aperta si aspetta che il movimento smetta subito, non al prossimo
       caricamento. E riaccendendola le fasce vanno rimesse dritte, altrimenti
       restano ferme nell'ultima posizione storta. */
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inCoda = false;
    function posa() {
      inCoda = false;
      if (mq.matches) return;
      const h = window.innerHeight;
      strati.forEach(function (s) {
        const r = s.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > h + 200) return;
        const centro = r.top + r.height / 2 - h / 2;
        s.style.transform = 'translate3d(0,' + (-centro * parseFloat(s.dataset.parallasse)).toFixed(1) + 'px,0)';
      });
    }
    function suScroll() { if (!inCoda) { inCoda = true; requestAnimationFrame(posa); } }
    window.addEventListener('scroll', suScroll, { passive: true });
    window.addEventListener('resize', suScroll, { passive: true });

    function cambio() {
      if (mq.matches) strati.forEach(function (s) { s.style.transform = ''; });
      else posa();
    }
    /* addEventListener sui MediaQueryList e' recente: addListener e' il
       ripiego per i browser che non ce l'hanno ancora. */
    if (mq.addEventListener) mq.addEventListener('change', cambio);
    else if (mq.addListener) mq.addListener(cambio);

    cambio();
  })();

  /* ---------- i tre mestieri: la scheda si apre sulle altre due ----------
     Il pannello con l'elenco intero e' gia' in pagina: sta nella stessa riga
     di griglia delle tre schede ed e' largo quanto tutte e tre. Aprirlo vuol
     dire scoprirlo con un clip-path che parte dalla colonna su cui si e'
     cliccato — la prima cresce verso destra, la seconda dalle due parti, la
     terza risale verso sinistra. Il verso lo decide il CSS con --da: qui si
     decide soltanto il quando.
     Le schede non spariscono subito. Restano sotto al pannello per tutta
     l'apertura, cosi' si vede che vengono coperte, e solo a fine corsa passano
     a visibility:hidden — che le toglie anche dal giro dei Tab e dalle voci
     lette a voce alta, cosa che display:none non avrebbe fatto senza far
     saltare l'altezza della riga. */
  (function () {
    const griglia = document.querySelector('.servizi');
    if (!griglia) return;
    const schede = Array.prototype.slice.call(griglia.querySelectorAll('.scheda'));
    const pannelli = Array.prototype.slice.call(griglia.querySelectorAll('.dettaglio'));
    if (!schede.length || !pannelli.length) return;

    const mqRidotto = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqLargo = window.matchMedia('(min-width: 901px)');
    let apertoOra = null;   /* il pannello visibile in questo momento */
    let tornaA = null;      /* il bottone a cui ridare il fuoco chiudendo */
    let annullaAttesa = null;

    /* Il pannello resta alto quanto erano le schede: aprendo e chiudendo la
       pagina non cresce e non si accorcia, e l'unica cosa che si muove e' il
       ritaglio che scorre di lato. L'altezza la sanno solo le schede, e il CSS
       non puo' leggerla: si misura qui.
       Le schede restano misurabili anche a pannello aperto perche' sono
       nascoste con visibility, non con display. A una colonna sola invece
       spariscono davvero e il tetto non ha senso: li' il pannello prende il
       loro posto e si allunga quanto gli serve. */
    function fissaAltezza(pannello) {
      if (!mqLargo.matches) { pannello.style.height = ''; return; }
      let h = 0;
      schede.forEach(function (s) { h = Math.max(h, s.getBoundingClientRect().height); });
      pannello.style.height = h > 0 ? Math.round(h) + 'px' : '';
    }

    function pannelloDi(n) {
      for (let i = 0; i < pannelli.length; i++) {
        if (pannelli[i].dataset.dettaglio === n) return pannelli[i];
      }
      return null;
    }

    /* Con "riduci animazioni" il CSS mette animation:none e animationend non
       arriva mai: il seguito va chiamato lo stesso, o il pannello resterebbe
       aperto per sempre. La rete di sicurezza copre anche il caso in cui
       l'evento si perda perche' nel frattempo e' partita un'altra animazione
       sullo stesso elemento.
       1200ms e non 700: l'animazione dura 480ms e quello che segue nasconde
       le schede sotto al pannello. Con la rete troppo vicina, su una macchina
       occupata basta un ritardo di due decimi perche' scatti prima della fine
       e le schede spariscano mentre il pannello non le copre ancora. */
    function alFine(el, poi) {
      if (annullaAttesa) { annullaAttesa(); annullaAttesa = null; }
      if (mqRidotto.matches) { poi(); return; }
      let fatto = false;
      let rete = 0;
      function una() {
        if (fatto) return;
        fatto = true;
        el.removeEventListener('animationend', una);
        clearTimeout(rete);
        annullaAttesa = null;
        poi();
      }
      annullaAttesa = function () {
        fatto = true;
        el.removeEventListener('animationend', una);
        clearTimeout(rete);
      };
      rete = setTimeout(una, 1200);
      el.addEventListener('animationend', una);
    }

    /* La sezione si allunga di parecchio: se il suo bordo di sopra e' finito
       sotto la barra, chi ha aperto si ritrova in mezzo a un testo che prima
       non c'era. Lo si riporta appena sotto la barra, e solo in quel caso. */
    function rimettiInVista() {
      const r = griglia.getBoundingClientRect();
      if (r.top >= 90) return;
      window.scrollTo({
        top: window.scrollY + r.top - 90,
        behavior: mqRidotto.matches ? 'auto' : 'smooth'
      });
    }

    function spegni(pannello) {
      pannello.classList.remove('si-apre', 'si-chiude');
      pannello.hidden = true;
      pannello.style.height = '';
      if (!griglia.querySelector('.dettaglio:not([hidden])')) griglia.classList.remove('is-aperta');
    }

    /* Cambiando larghezza le schede cambiano altezza, e il tetto del pannello
       aperto va rimisurato: le schede sono ancora li' sotto, invisibili ma
       larghe e alte quanto sarebbero. Anche passando sotto i 901px, dove il
       tetto va tolto del tutto. */
    let inCodaMisura = false;
    window.addEventListener('resize', function () {
      if (!apertoOra || inCodaMisura) return;
      inCodaMisura = true;
      requestAnimationFrame(function () {
        inCodaMisura = false;
        if (apertoOra) fissaAltezza(apertoOra);
      });
    }, { passive: true });

    function segnaBottoni(n) {
      schede.forEach(function (s) {
        const b = s.querySelector('.scheda__apri');
        if (b) b.setAttribute('aria-expanded', s.dataset.scheda === n ? 'true' : 'false');
      });
    }

    function apri(n) {
      const pannello = pannelloDi(n);
      if (!pannello || apertoOra === pannello) return;
      if (apertoOra) spegni(apertoOra);
      const scheda = griglia.querySelector('.scheda[data-scheda="' + n + '"]');
      tornaA = scheda ? scheda.querySelector('.scheda__apri') : null;

      /* la misura si prende col pannello ancora nascosto: li' l'altezza della
         riga la fanno solo le schede, che e' esattamente quella da tenere */
      fissaAltezza(pannello);
      griglia.classList.add('is-aperta');
      pannello.hidden = false;
      pannello.classList.remove('si-chiude');
      /* togliere e rimettere la classe nello stesso fotogramma non fa
         ripartire l'animazione: questa lettura forza il ricalcolo */
      void pannello.offsetWidth;
      pannello.classList.add('si-apre');
      apertoOra = pannello;
      segnaBottoni(n);
      alFine(pannello, function () {
        schede.forEach(function (s) { s.classList.add('e-coperta'); });
      });
      pannello.focus({ preventScroll: true });
      rimettiInVista();
    }

    function chiudi() {
      const pannello = apertoOra;
      if (!pannello) return;
      apertoOra = null;
      schede.forEach(function (s) { s.classList.remove('e-coperta'); });
      pannello.classList.remove('si-apre');
      void pannello.offsetWidth;
      pannello.classList.add('si-chiude');
      alFine(pannello, function () { spegni(pannello); });
      segnaBottoni(null);
      const b = tornaA;
      tornaA = null;
      if (b) b.focus({ preventScroll: true });
      rimettiInVista();
    }

    griglia.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      if (e.target.closest('.indietro')) { chiudi(); return; }
      const scheda = e.target.closest('.scheda');
      if (!scheda || !scheda.dataset.scheda) return;
      /* chi stava selezionando del testo non voleva aprire niente */
      const sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length > 0 && !e.target.closest('.scheda__apri')) return;
      apri(scheda.dataset.scheda);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && apertoOra) chiudi();
    });
  })();

  /* ---------- globo 3D "Dove operiamo" (rotazione automatica + trascinabile) ---------- */
  (function () {
    const canvas = document.getElementById('globeCanvas');
    if (!canvas || !canvas.getContext) return;
    const gctx = canvas.getContext('2d');
    const gdpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const comoLabel = document.getElementById('globeLabelComo');

    let dragging = false;
    let dragStartX = 0, dragStartAngle = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartAngle = angle;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      angle = dragStartAngle + (e.clientX - dragStartX) * 0.008;
    });
    function endGlobeDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    canvas.addEventListener('pointerup', endGlobeDrag);
    canvas.addEventListener('pointercancel', endGlobeDrag);
    canvas.addEventListener('pointerleave', (e) => { if (dragging) endGlobeDrag(e); });

    function latLonToXYZ(lat, lon) {
      const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
      return { x: Math.cos(la) * Math.sin(lo), y: -Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
    }
    function rotY(p, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
    }
    /* inclinazione fissa della visuale: porta il 42° parallelo Nord (zona Como) al centro
       della fascia visibile, invece dell'equatore */
    const CAMERA_TILT = -42 * Math.PI / 180;
    function rotX(p, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
    }
    function view(p, a) {
      return rotX(rotY(p, a), CAMERA_TILT);
    }

    function fibonacciSphere(n) {
      const pts = [];
      const gAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = gAngle * i;
        pts.push({ x: Math.cos(theta) * r, y: y, z: Math.sin(theta) * r });
      }
      return pts;
    }
    const surfacePts = fibonacciSphere(90); /* texture leggerissima della sfera, sotto i contorni */

    /* contorni reali dei continenti, caricati al volo (bassa risoluzione, non appesantisce il codice incollato) */
    let continentRings = [];
    function processRing(ring) {
      if (ring.length < 20) return null;
      /* esclude l'Antartide: irrilevante qui e la sua sagoma vicino al polo genera scarabocchi */
      let latSum = 0;
      for (let i = 0; i < ring.length; i++) latSum += ring[i][1];
      if (latSum / ring.length < -60) return null;
      const step = ring.length > 150 ? 4 : ring.length > 60 ? 2 : 1;
      const raw = [];
      for (let i = 0; i < ring.length; i += step) raw.push(latLonToXYZ(ring[i][1], ring[i][0]));
      raw.push(raw[0]);
      /* spezza il percorso dove il salto tra due punti è troppo ampio, invece di tracciare
         una corda dritta attraverso il globo (evita l'effetto "scarabocchio") */
      const paths = [];
      let current = [raw[0]];
      for (let i = 1; i < raw.length; i++) {
        const dot = raw[i - 1].x * raw[i].x + raw[i - 1].y * raw[i].y + raw[i - 1].z * raw[i].z;
        if (dot < 0.94) {
          if (current.length > 1) paths.push(current);
          current = [raw[i]];
        } else {
          current.push(raw[i]);
        }
      }
      if (current.length > 1) paths.push(current);
      return paths.length ? paths : null;
    }
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson')
      .then(function (r) { return r.json(); })
      .then(function (geo) {
        const rings = [];
        function addPaths(paths) { if (paths) paths.forEach(function (p) { rings.push(p); }); }
        geo.features.forEach(function (f) {
          const g = f.geometry;
          if (!g) return;
          if (g.type === 'Polygon') {
            addPaths(processRing(g.coordinates[0]));
          } else if (g.type === 'MultiPolygon') {
            g.coordinates.forEach(function (poly) { addPaths(processRing(poly[0])); });
          }
        });
        continentRings = rings;
      })
      .catch(function () {}); /* se il caricamento fallisce il globo resta comunque funzionante */

    const hubXYZ = latLonToXYZ(45.85, 9.0);
    const markers = [
      Object.assign(latLonToXYZ(45.81, 9.08), { local: true }),
      Object.assign(latLonToXYZ(45.46, 9.19), { local: true }),
      Object.assign(latLonToXYZ(46.19, 8.79), { local: true }),
      Object.assign(latLonToXYZ(40.71, -74.0), { local: false }),
      Object.assign(latLonToXYZ(35.68, 139.69), { local: false }),
      Object.assign(latLonToXYZ(-33.87, 151.21), { local: false }),
      Object.assign(latLonToXYZ(25.2, 55.27), { local: false })
    ];

    /* etichetta olografica: ciclo tra alcune località, non solo Como */
    const labelCycle = [
      { i: 0, it: 'Sede — Como', en: 'HQ — Como' },
      { i: 1, it: 'Produzione — Milano', en: 'Production — Milan' },
      { i: 6, it: 'Nuovo progetto — Dubai', en: 'New project — Dubai' },
      { i: 4, it: 'Meeting online — Tokyo', en: 'Online meeting — Tokyo' }
    ];
    let labelIdx = 0;
    function setLabelText() {
      if (!comoLabel) return;
      const cur = labelCycle[labelIdx];
      const l = document.body.getAttribute('data-lang') || 'it';
      comoLabel.textContent = l === 'en' ? cur.en : cur.it;
    }
    setLabelText();
    setInterval(() => { labelIdx = (labelIdx + 1) % labelCycle.length; setLabelText(); }, 5500);

    let angle = 0;
    let gw = 0, gh = 0;
    function resizeGlobe() {
      const rect = canvas.getBoundingClientRect();
      gw = canvas.width = Math.round(rect.width * gdpr);
      gh = canvas.height = Math.round(rect.height * gdpr);
    }
    resizeGlobe();
    window.addEventListener('resize', resizeGlobe);

    function project(p, cx, cy, R, persp) {
      const f = persp / (persp - p.z);
      return { sx: cx + p.x * R * f, sy: cy + p.y * R * f, z: p.z };
    }

    function drawGlobe() {
      if (!gw || !gh) { resizeGlobe(); requestAnimationFrame(drawGlobe); return; }
      const cx = gw / 2, cy = gh / 2;
      const R = Math.min(gw, gh) / 2 * 0.82;
      const persp = 2.6;
      gctx.clearRect(0, 0, gw, gh);

      gctx.beginPath();
      gctx.arc(cx, cy, R, 0, Math.PI * 2);
      gctx.strokeStyle = 'rgba(255,255,255,.06)';
      gctx.lineWidth = gdpr;
      gctx.stroke();

      /* texture leggerissima della sfera (sotto i contorni) */
      const rotatedSurface = surfacePts.map(p => project(view(p, angle), cx, cy, R, persp));
      rotatedSurface.forEach(p => {
        const depthT = (p.z + 1) / 2;
        if (depthT < 0.08) return;
        gctx.beginPath();
        gctx.arc(p.sx, p.sy, (0.4 + depthT * 0.5) * gdpr, 0, Math.PI * 2);
        gctx.fillStyle = 'rgba(200,200,210,' + (0.03 + depthT * 0.09) + ')';
        gctx.fill();
      });

      /* contorni dei continenti, a linea (percorsi aperti, nessuna chiusura forzata) */
      continentRings.forEach(path => {
        const proj = path.map(p => project(view(p, angle), cx, cy, R, persp));
        for (let i = 0; i < proj.length - 1; i++) {
          const a = proj[i], b = proj[i + 1];
          const avgZ = (a.z + b.z) / 2;
          if (avgZ < -0.05) continue;
          const depthT = (avgZ + 1) / 2;
          gctx.beginPath();
          gctx.moveTo(a.sx, a.sy);
          gctx.lineTo(b.sx, b.sy);
          gctx.strokeStyle = 'rgba(228,228,234,' + (0.14 + depthT * 0.56) + ')';
          gctx.lineWidth = (0.7 + depthT * 0.7) * gdpr;
          gctx.stroke();
        }
      });

      const hubP = project(view(hubXYZ, angle), cx, cy, R, persp);
      const projMarkers = markers.map(m => ({ local: m.local, p: project(view(m, angle), cx, cy, R, persp) }));

      projMarkers.filter(m => !m.local).forEach(m => {
        const depth = ((hubP.z + 1) / 2 + (m.p.z + 1) / 2) / 2;
        if (depth < 0.28) return;
        gctx.beginPath();
        gctx.moveTo(hubP.sx, hubP.sy);
        gctx.lineTo(m.p.sx, m.p.sy);
        gctx.strokeStyle = 'rgba(255,42,42,' + (depth * 0.35) + ')';
        gctx.lineWidth = gdpr;
        gctx.stroke();
      });

      const t = performance.now() / 1000;
      projMarkers.forEach((m, i) => {
        const depthT = (m.p.z + 1) / 2;
        if (depthT < 0.12) return;
        const pulse = 0.6 + Math.sin(t * 1.6 + i) * 0.4;
        const baseR = (m.local ? 2.4 : 1.7) * gdpr;
        const glowR = baseR * (2.4 + pulse * 1.2);
        const grad = gctx.createRadialGradient(m.p.sx, m.p.sy, 0, m.p.sx, m.p.sy, glowR);
        grad.addColorStop(0, 'rgba(255,42,42,' + (0.5 * depthT) + ')');
        grad.addColorStop(1, 'rgba(255,42,42,0)');
        gctx.beginPath();
        gctx.arc(m.p.sx, m.p.sy, glowR, 0, Math.PI * 2);
        gctx.fillStyle = grad;
        gctx.fill();
        gctx.beginPath();
        gctx.arc(m.p.sx, m.p.sy, baseR, 0, Math.PI * 2);
        gctx.fillStyle = 'rgba(255,80,80,' + (0.6 + depthT * 0.4) + ')';
        gctx.fill();
        if (i === labelCycle[labelIdx].i && comoLabel) {
          /* etichetta olografica che segue il marker attivo sulla superficie del globo */
          comoLabel.style.left = (m.p.sx / gdpr) + 'px';
          comoLabel.style.top = (m.p.sy / gdpr) + 'px';
          comoLabel.style.opacity = depthT < 0.35 ? '0' : String(Math.min(1, (depthT - 0.35) * 2.2));
        }
      });

      if (!reduceMotion && !dragging) angle += 0.0016;
      requestAnimationFrame(drawGlobe);
    }
    requestAnimationFrame(drawGlobe);
  })();

  /* anchor links → scroll animato (ease-out: parte subito, rallenta in fondo) */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  let scrollAnimId = null;
  function cancelScrollAnim() {
    if (scrollAnimId !== null) { cancelAnimationFrame(scrollAnimId); scrollAnimId = null; }
  }
  /* qualsiasi input umano (rotella, touch, click, tastiera) interrompe subito l'animazione */
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, cancelScrollAnim, { passive: true, capture: true }));
  function smoothScrollTo(target, duration) {
    cancelScrollAnim();
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const startY = window.scrollY;
    const targetY = startY + target.getBoundingClientRect().top - offset;
    /* rivela subito (senza animazione) tutto ciò che l'animazione sta per attraversare,
       cosi non parte un fade-in "in blocco" quando si arriva */
    const lo = Math.min(startY, targetY) - innerHeight;
    const hi = Math.max(startY, targetY) + innerHeight;
    document.querySelectorAll('.reveal:not(.in)').forEach(el => {
      const elY = el.getBoundingClientRect().top + startY;
      if (elY >= lo && elY <= hi) el.classList.add('in');
    });
    const diff = targetY - startY;
    const startTime = performance.now();
    let lastSet = startY;
    function step(now) {
      /* rete di sicurezza: se la posizione reale non coincide più con quella impostata
         all'ultimo fotogramma (per qualunque causa, anche non intercettata sopra),
         vuol dire che l'utente ha ripreso il controllo: molliamo subito */
      if (Math.abs(window.scrollY - lastSet) > 2) { scrollAnimId = null; return; }
      const progress = Math.min((now - startTime) / duration, 1);
      lastSet = startY + diff * easeOutCubic(progress);
      window.scrollTo({ top: lastSet, left: 0, behavior: 'instant' });
      scrollAnimId = progress < 1 ? requestAnimationFrame(step) : null;
    }
    scrollAnimId = requestAnimationFrame(step);
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      navLinks && navLinks.classList.remove('open');
      navInner && navInner.classList.remove('open');
      smoothScrollTo(t, 550);
    });
  });

  /* reveal on scroll (gentle fade-ins) */
  const revealEls = document.querySelectorAll('.reveal');
  if (location.search.indexOf('noanim') !== -1) {
    revealEls.forEach(el => el.classList.add('in'));
    introDone();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
    window.addEventListener('load', () => setTimeout(() => {
      revealEls.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); });
    }, 300));
    setTimeout(() => revealEls.forEach(el => el.classList.add('in')), 4500);
  }

  /* ---------- cookie banner ---------- */
  const cookie = document.getElementById('cookie');
  const cookieOk = document.getElementById('cookieOk');
  let consent = null;
  try { consent = localStorage.getItem('bb-cookie'); } catch (e) {}
  if (cookie && !consent) { cookie.hidden = false; body.classList.add('cookie-open'); }
  if (cookieOk) cookieOk.addEventListener('click', () => {
    try { localStorage.setItem('bb-cookie', '1'); } catch (e) {}
    if (cookie) cookie.hidden = true;
    body.classList.remove('cookie-open');
  });

  const form = document.getElementById('contactForm');

  /* ---------- cinematic dust (subtle, scroll-parallax) ---------- */
  const dust = document.getElementById('dust');
  if (dust && dust.getContext && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = dust.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mobile = window.matchMedia('(max-width:720px)').matches;
    let w, h, P = [], sy = 0, t = 0;
    function build() {
      w = dust.width = innerWidth * dpr;
      h = dust.height = innerHeight * dpr;
      dust.style.width = innerWidth + 'px';
      dust.style.height = innerHeight + 'px';
      const n = mobile ? 26 : 62;
      P = [];
      for (let i = 0; i < n; i++) P.push({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 1.3 + 0.3) * dpr,
        a: Math.random() * 0.3 + 0.05,
        depth: Math.random() * 0.4 + 0.1,
        ph: Math.random() * 6.28, sp: Math.random() * 0.4 + 0.2
      });
    }
    build();
    window.addEventListener('resize', build);
    window.addEventListener('scroll', () => { sy = window.scrollY; }, { passive: true });
    (function draw() {
      t += 0.005;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (const p of P) {
        let yy = p.y - sy * dpr * p.depth * 0.25 + Math.sin(t * p.sp + p.ph) * 8 * dpr;
        yy = ((yy % h) + h) % h;
        const xx = p.x + Math.cos(t * p.sp * 0.7 + p.ph) * 6 * dpr;
        ctx.beginPath();
        ctx.arc(xx, yy, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,' + (p.a * 0.75) + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }

  /* ---------- avviso "animazioni ridotte", appoggiato sopra .cfg-fab ---------- */
  (function () {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { if (sessionStorage.getItem('bb-rm-avviso') === '1') return; } catch (e) {}

    const box = document.createElement('div');
    box.className = 'bb-rm';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<span class="bb-rm__t">' +
        '<b data-it="Animazioni ridotte" data-en="Reduced motion">Animazioni ridotte</b>' +
        '<span data-it="Il tuo dispositivo le sta limitando: il sito è mostrato statico." ' +
              'data-en="Your device is limiting them: the site is shown static.">' +
          'Il tuo dispositivo le sta limitando: il sito è mostrato statico.' +
        '</span>' +
      '</span>' +
      '<button type="button" class="bb-rm__x" aria-label="Chiudi">×</button>';
    document.body.appendChild(box);

    /* La posizione si misurava sulla scorciatoia fissa .cfg-fab, tolta il
       2026-08-29. La ricerca resta apposta: se un giorno tornasse un elemento
       ancorato in basso a destra, basta dargli quella classe e l'avviso gli si
       appoggia sopra da solo. Senza, si posa a 20px dal fondo. */
    const fab = document.querySelector('.cfg-fab');
    function posa() {
      if (!fab) { box.style.setProperty('--bb-rm-bottom', '20px'); return; }
      const r = fab.getBoundingClientRect();
      box.style.setProperty('--bb-rm-bottom', Math.max(0, window.innerHeight - r.top) + 12 + 'px');
    }
    posa();
    window.addEventListener('resize', posa, { passive: true });
    if ('ResizeObserver' in window && fab) new ResizeObserver(posa).observe(fab);
    if ('MutationObserver' in window) {
      new MutationObserver(posa).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    box.querySelector('.bb-rm__x').addEventListener('click', () => {
      box.hidden = true;
      try { sessionStorage.setItem('bb-rm-avviso', '1'); } catch (e) {}
    });

    /* applyLang ha gia' girato prima che questo elemento esistesse: la lingua gliela diamo adesso */
    const cur = body.getAttribute('data-lang') || 'it';
    box.querySelectorAll('[data-it][data-en]').forEach(el => {
      const t = el.getAttribute('data-' + cur);
      if (t !== null) el.textContent = t;
    });
  })();
})();