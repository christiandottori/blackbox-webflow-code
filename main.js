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
      pannello.style.height = '';
      if (!mqLargo.matches) return;
      let h = 0;
      schede.forEach(function (s) { h = Math.max(h, s.getBoundingClientRect().height); });
      if (h <= 0) return;
      pannello.style.height = Math.round(h) + 'px';
      /* La rete. Il tetto e' l'altezza delle schede, che dipende dal loro testo
         e cambia col sito: la stessa pagina misurava 513px in anteprima e 492
         dal vivo, e in quei ventun pixel ci stava una riga di elenco che
         spariva senza dire niente. Se il contenuto non ci sta, il tetto si
         toglie: un pannello piu' alto delle schede si vede e si sistema, una
         riga tagliata via no. */
      if (pannello.scrollHeight > pannello.clientHeight) pannello.style.height = '';
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

      /* is-aperta per prima: da li' le schede stanno ad align-self:start e
         tengono la loro altezza vera anche quando il pannello allarga la riga.
         Poi il pannello si mostra, e solo dopo si misura: da nascosto non ha
         layout e la rete dentro fissaAltezza non potrebbe accorgersi di
         niente. */
      griglia.classList.add('is-aperta');
      pannello.hidden = false;
      fissaAltezza(pannello);
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

  /* ---------- la tavola "Dove operiamo": un globo e la sua lente ----------
     Un canvas solo, due scale. Il globo dice dove arrivano le produzioni:
     rotte che partono da Como, si accendono e svaniscono, senza mai un punto
     d'arrivo con un nome sopra — perche' quei nomi non li sappiamo in anticipo.
     La lente in basso a sinistra dice dove stiamo davvero: Como, Milano,
     Lugano, il lago, il confine con la Svizzera, e attorno a Como la rete di
     professionisti del territorio.

     2026-08-30 — i contorni non si scaricano piu' da GitHub a ogni visita.
     Prima erano una fetch di ne_110m_land.geojson (~400 KB) che, se falliva,
     lasciava una sfera vuota. Adesso stanno qui dentro, gia' semplificati e
     compressi: 50m invece di 110m (piu' dettaglio), 17 KB invece di 400,
     zero richieste di rete. La codifica e' delta + zigzag varint in base64,
     percorsi separati da '|'; lo script che li ha estratti sta nel vault.

     Il globo NON gira a vuoto: oscilla attorno all'Europa. Chi lo trascina lo
     porta dove vuole, e dopo qualche secondo torna da solo a casa. Una sezione
     che parla di dove lavoriamo non puo' mostrare il Pacifico per meta' del
     tempo.

     Modi (attributo data-globo sul canvas):
       piastra — la tavola intera: rotte, marcatori, lente          (home, 02)
       sfondo  — solo la sfera, decorativa e leggera        (pagina /chi-siamo)
     Senza attributo vale "sfondo": il canvas della pagina chi-siamo non ne ha
     uno e deve continuare a funzionare com'era.
     ---------------------------------------------------------------------- */
  (function () {
    const tele = document.querySelectorAll('canvas.globe-canvas');
    if (!tele.length) return;

    const MONDO = 'ghHlURTQD5BB8Ba|gzF9OW/CcEiBbG5BSTUzC+CzBmB1CKDCQYHKrBoBZ0BpCBxBU5BZvDTnBtBtBrB5CJjCxCPjCfIPnBYEMfDQKHI1BjB1CS/BsBBkBfeOIrBHMYPiBPnBfDUOW0BFoBVpBfPTlBLCVOOAJajBgBBY7DqBxGfhCbdjBxEBvCrB1BC7BeAeOFOSA8BXuBJ4BhC2DaLPkBebfqCYmDGXmDqCcBwEsB2B8BDmBccYpBMYJcuBHNEKSHOYCHMUCFQSSOJCUUFOQWLebFXWYqBPIMRSwBuCKDSU4BBBSbS8DnBiBOHNQHSSQPTjBTBT/BuEvCKRyBJkB+BC6CUqBJQeiCexB|8+G1VOd1BAIWgBI|otGpZuDxCvCoBdqB|2/EiBmBcARRNaVnBEWvBdaJ4BYqBL1B|w2Cr9B2BDfJOJzBAIqBIR|mvC8kDhBE0CQiBJzCJ|uoCkkDlBO6CDzBJ|5f04CCJfHpCCSQ2CA|2nGxLqBXnBEBU|0yEyKsCyCOgBGf/CxC|k5EwOaBBJtBhBB4BYJ|+5EqLdeiBwBMHPlC|27EmOUFIjBJCCLb8BIH|y8E2PU7BbMdwBmBA|82E8QgBNJlBjBwBOE|+iGrIXAXyBwBxB|m/F9FZuB5BqB2C9BBZ|mtFpKjBFSiBaGKLRV|miFxDgBLKblBU1BDNMJNMa+BA|y+E7DQVVFZQCMeA|w5E3KlCNxBKgBSkCPYWDT|g2E1LgBdVFzBeqBG|6zErKcAIN9CNOagBPMGTSUF|qwElKKJVRbcoBA|ykEhCMfSDFTZKHYZGMUYD|ocopCcFlBJNJIILEEGFEeE|gboiDkEhBzCRNAKKlCDcS3BY2BE|2tCilDrBRlCGQMiDA|q7BilDyBH3EBmDK|8+BmlD4BJjEXlCIyEa|6+Bw2C1BRXMaS0BL|yrCu3CdJxBWYI4BT|q4Cs7CdASQ0BLnBD|8zD0jDhCMuDDrBH|4tEg9CXLzBKsCC|owFw8CjBIiBCCJ|6dusBMCBDKF4BACJUIFL1BBNIhBEBMIEED|od2wBeLGRMHJALQPCPOPCWE|irBwsBTLELNBbPVIFIAGYECIaBmBMDB|8XqoCLFELdTGIHGCMQMWA|2P4lCNNIFLDBPHBHSNALUaKGJCKOGQBBJ|qNwlCGLHJXEFIAGgBE|+D4xBMDPPbKgBQAF|z/Gw5C4BPjDHAWsBC|xpChgCqBPlCXcoB|ruBxjC0Bb3CekBB|l8Cl2BZEO6BaPPPONLP|rrCpgCqBAtBbVEcMNCOCLMKD|j9Ct9BDhBDYNRTCaqBOACP|ntCs9BxBE5BciCHqBX|rsCu5BOHSWSNfNfECSkBiBAdXL|p2GyvCuDNnBNhBSxBAOK|1vGwrCWTVFzBS0BI|rsG4kCQNnCDQOoBE|xgDiXqBVnBHtBYsBG|1yCiXWH/BJCUoBB|j/FooCcHdDKFxBXGKVDNSYMQNFWmBB|v+F+oCQD3BFoBK|9mFumC4BhBTBaJARjCqBSETCIQ|1mFonCQDBLNKGPPAPWaA|1oF2nCKtBdqBNJOWUH|roF2oCkBTTQQbVLR0BIH|1pF6oCgBJPJQJlBBZUgBM|1gFmiCFZBSRKGMUN|5lF2jCUHPLkBUNjBdCOCbaSG|1kFwiCELLAUHKV1BoBgBC|3vCi6BoCBfRHOVDhBUQOIX|z6CozBYC1CPoCUJF|89FrFUBLrBhCffBzBa8BGKUETcCeWBcMD|k/EvKrCjBlBhBhBDEa8BmB0CK|q1F/yByBNsCMG1BFKHLAjBbORffCGKbOLcMDdmBBeOF|24DslD0BPdDMLHBlEJ9COqCcgEC|i6DmkDOFNJmBM2BHJVZAkBN/CDzFauCYqDC|0gEijDTP4BM+BVxHV8C0B0BD|ivF6+CeHcU6EX1BTvBIGSZADLmBRpEAXL1CcyBeqCJ|4xFs8CuBNGL3EIkDS|w3Fm+CgFHlCPzDSMOOH|y4G1rBqBLQ/BiBNDcatBuBNeSWFZ9BfCJlB9B5BZMUwB3BgBiBUOoBNcOARGLSIDAOTOGRZgBKKNFXoBOAIT|s4GzzBiBQFNWGLNGPhC/BWPpBGGHlBNR/BjCfnDcqCqCsDyBwB0CcKJFQZ|w9E0LYxCPlBTmBLVKbLPDSLFhBUEoBVQJPfOZfMoBwBeQJBPqBkBaCBeWR|s3EoXuBFDfOVrBnCOtBSHSOSVIMUHJHYXDT5B2BAbfeRLbGMiBNKFRNQN4BYFKgDUE|6mFdaDE5BkBpBwDqCoI9CyBlBAXyCjBAPhBJiCzCYACReHFLoBJVPlDYjCuC9BWNHTMMTNJ3BAwBVdX7BGtBoBEMtBNGaNOSCXKKETuBpBelEuBJMGSjBpBHgBfUyBOUFIU/BFNclBGKWuBUqBP|k8EoBtBb9DKPLFfYfUASUqCCzCrBmBnBBbYfxBNAabYGePEPLIpDjBAC+BFWXEBccoCOCFeWqBODUUyDTuBiBHb|mmEvHoBLOTmCFQWkCVSb4BFIlB1BS1GYpDiBiBmByBD|04DyGqBBerB6BjBenBQJGMwChCTPgBMMHHjBkBRUpBHTeIabLrDrBMBP3DuDzB8CtBwBV8BjBUdyB1BqBNkByBL|gyEsISKSXHRUGBN0BNnBNMXpBJMRdDoBzBJJwBpBrBEPhBCnBZRFGRdKXXvBxBVNkBZHZUvBXFa5BBJkChBgBBuCWW+BZFGSwB8BQoB6B6BOBS4BgCAL|20Cq/C/HlBvDfCJtClB9CCVQgDeVGkBMbG8De6KuB4BLvBR|klC07CuBDpBZDX+CvB9ECLCeMdQ5BDTOuBUMONEgBGDMyCE|uyFgkCW5BDnB8BjEZYlBBV5BqB3BFLFUbGTfJWO+BNeOiDVqBGsBeEGSNQQE|4zFk3BkBFaQHbINUErCTbjB3BYhBJTIFJgBTrBNHuBYOBOmBAM0CMEqC3B|ywF2zBICWtCVpBTJCpBRhBMVTTTLKcJCFTRGPbFUTTtBAKGRABMJNMPtBfVUKYZGhDRFRxBGEQsCsB4DEmBoCSEPPONqBS8BkCGmCSYcNGMRCSE|+nF6qBQRVVVKhBdPcNDkBe4BG|+jFgqBWAFNSNZ7BZPEcHTRIQ6BLOETXFBUMHPQsBcSN|o3EocJZZuBCWkB4BWKONlB9C|0qEgZENlBvBVJfOBeYYiCE|gkDoMcRuBxCHhBlBRXGJcF2BQ4BODRM|+9BxPiB/DHLVSInBTpC1ChIzCdpBWfoDuBkDPkDUwBiCSKFEQSMGJKcGJSOAoBiBQAgBQOON|t2C5hCYBMPJFwBf0CZzBN3GSsBKUHVSMSGNJAQNwBDrBWeWpBGMKJIyBE|pmD+cyCJiHtDtELYWFKhBEZiB7DYJIKKjBCzBdhBDWIMY4CU|kaqkD4BHGOWCMAHJ0BGwDRhEb3EMTEuBGzCARIYElBE6BBFKWDAKuBJ|gV8jDqBDHPeIMNsDT5CNhDnCrDkB0DQvDFPMqEObEOG3BHAMbBBL7BFnCcqBAPOfFTY4DEID1BH4BHkBQ8BdTcQOWF|iMkzBGPFJDrBTEDLLAJKGaFCCQJOAKOBcQQN|8Lw1BCZNdPIEELKBQKKUECMGH|wT4vBTdIPHNXEJK/BWHIMQGFQGUHoCI|9hCu3CiBNpCNRGQGrBGYKVIUGgCN|/+Eq/BkCN4CpCjCKIUdJPSXAQKjCUBMSGjBEuBB|95C0YwCBINUBNFyBVNN9CCPXXYpCHVOIKqCDPUEQdK8BA|h+BJyBBRrBhCPF+BoBA|7DkpCDHfNBDIBLH0CEKJfjBbHQCKFbHRCeFSEmBTQhBuBXDDMPdEOAWNEHLJKDKGUAYHELFNNFBFRBGHTDoBDAFvBR/BGCDbBAFlBEPBLPTGjBNTA4BuBqBAcWhBNlBGGELETDJEBIoBOIKDOXDSOUGaBCIMFLIIaLARQWQvCHDKSUFOKEJECERJGMLHFXHBKSDAAKQcRHTGQGDCMOJGIGFEGKSAJGCIOAAMuCEBF|/I6kCqBGSPHFMAGFHCCLdJMpBPXGDZArBPNCAHjBHVAKITDUKdBSMREYCFGKGiBGrBFSKGMOEtBIAGQCHGMCLCCKJCCE8BABESMXCOIGKYEEFDFOQODJH|3gHm2CyFxBANUABdiBNMIfauDFyCjBjBRfIMLhCIWJPHSHhBHaPdF7CUZa7CCVWQOtBHDLSPZRI8E|tT6yCmBGTLaTiBDCRrBZ/EnBhDW9BDBKyBMXDSOhDI2CIXGaKpDEwBIVEQOoBLTMSCXEIE8BPJNURcMKWcNaScRFQeH0BWcJ|2G4iCFAQCJB|gVi2BPCUADB|usCmlDrBC8BCPD|8iCokDzBCiCANB|snCukDDLzBC4BK|0qC+jDfCoBAHB|/8CjiCyBR9BYMF|j3CzkCyBBFHWTtBUHLXMMK|mjC6PeDfJPKSE|uwGxSCLMIAZRIDeIH|1wCrkCeBlBDIG|j7C7iCcLZNEMRFZSmBC|34CxkCcJtBISC|n5CxjCQHvBIgBA|l8Cv3BJHKZNDTcYUKJ|quE7IrBC0BEHF|+oGrKYzBXaAa|kqG/MaPpBYQH|ojFnOaIMJXTVeIH|gsF1sBUD9BBqBG|m6E6LcoCBhBZlB|63FtCQDjBFUK|opFZoBRTDTW|wjFAWLrBEWI|uoFjHBXJBJaOKIJ|g6E1FAfVLIqBOC|w9EnCOAlBBYC|m8EjCOHlBCYG|w+ExJnBNIOgBA|85D6BSTFPbkBQA|goB45BGBZIUF|0cypCNFTKYGKDAF|qkB0iDaAnCBuBC|2oBkkDpBA2CErBD|ooC+lDeFrBJvCG+CK|skCslD4DLxEAaM|opCqlDOHlCG4BC|8oCkmDPA8BGrBF|iOoiDiBN9BacL|uiCi5CFLdQkBD|ihDs6CfAeOeFbH|sjD86ChBGUKOP|s4DqgDpBB0BGJD|ikDilDpBA6BEPD|u6F6/CdAoBGJF|wzGg3C3BKgCAHJ|ysGopCEQgBICLlBL|8iG8+BTJHIkBUHR|k7Fi5BJBsBYhBV|45F04BjCjBoBoBkBEHH|usF8kCKBTPRGOQOD|42F03BOBrBbee|8zDuOFMUkCNvC|viG4XLCFcIWqBffT|g4GoiCaFlBEMC|9xG2iCtBTgBaOF|nwGsjCOCTRpBHqBQLKSB|94GmhCWBnBASC|r6GihCXB0BObL|6iB+sBFIWMFPJD|giBqsBFGGIAN|whBovBKDRAIE|qgBguBDAMEHD|0gB4vBHCEEFIMABN|ghBmxBGNPCEGHDHEWG|6fgyBDHLCAGQA|ugBmyBLAKECD|vF4jCPFQOAH|nHumCTBGIFCIEOFBF|1H+lCCLHBAIHDOK|tH4lCDEMIHL|zB2rCKDJVAKNGMCHGKC|nF0iCGALFHKOD|5D6pCMDXCEGID|pI6tCAFHAEFPOUB|3H+oCNJEDZHKEHEAIMABEWICF|1H8nCAHUBNHBGbKQIIF|/IkoCEBDDLCME|gZurCKDTFBGME|2UsmCFAAKceVnB|8S4kCPEAGSDBF|kRgkCNFHECIIGML|2P2kCRBGGMD|mO0kCQDADbCAIMB|uNukCFEOMHP|6NynCHAMCDB|sKwkCEKAFKAND|gNy1BAFLEMC|sF6xBRIQACH|6B0wBJAGIKAFH|wSo4BNEEEKH|gWu1BGBPEKB|4ZgwBGNPGIKCB|kaovBEDHBHIMB|kZqxBRMMADDKH|+E2gCGDPCKC|xgDsgBAabOkBNHZ|5/C8fUNATASTQ|lhD8eLPPOMWQT|jiDuhBYBrBAUC|nsC2MjBDQIFSeGDb|5gC5BYkBBRVR|hyDCSfNJNGQMTWOC|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|9kD+hCzBMkBGQR|/7C40CtBI0BBFF|rhDqvCOHnBGaC|vmD2uCnBdjBKUS4BC|tjDguCMHPVXGKWSC|r3DohD+CF9DAgBG|v7DgkDFLvBM2BA|pwDygD1BMqBCMN|90D69CAPnBAxCQkCY2BX|npEqiDSL9EAsEM|9zEw+CpBAsCUhBT|zjEk7ChCY+CEbb|/8Du8C0DFVLQDvBRsCJJPIRjCAEPlBDtE4BUOmBPsBIPMcAhCMoBBTMoBI|jqDyxCQIiDfORHHiCHfN5CczCpBNY5BDmBWDQW0BWBOV|z+Cs1CYFDb7BHTKSeqBC|tjDi8C+CFsBXnEFzBYBM0BA|j6Dy/CGNNNWNVAKJND5CBJIOCXE+BOvEDqCIvBUOGuCVJIWC1BO4CIoBJ|phEkjDiBPkBIkCNoBdlBHrBQpEETIiCK5CO2CI|7yDulD6DnBuBIHJkBHLLiCAYLlDXRMHNKDdCBPxBQWRrCCtDeyDQ3EBZE2BO5BDjBUkDC1CEiBCXIIGwCF9BMKGwCGlBI8CH|71DkgDsBFNL6CKeHhBB0CFzCDkDd2DB4ESkDPGHjBHoBFlDR9BSBLjBD9EAFO1DHjBYIYjBU1CDhCUqBM+BF|n4DmiD0BFRFQFxCLZMcCrBILQ2CH|hqE0hDiBBxBHcDBJlCFvBIFKyDM|twE2gDfHWHRBMHzBPdEEQrBZXICNNFlBOxCB4EuBuEC|rnEi/C4BNIMgBAQLXXtDBxEZrCKmEYpDHFIQGVClCTpCMiDSvCB2CKhCCqCIpBGiBI8CLiCZuCBGIjBKQGhBM6BQQBGb|t0D28CwDLlCrBzCAaLXRpBCRiCkDS|55Di3C4Cf1BP1DYqBKBKUDJIIIaH|jvE46C6BQoCLZNIB8BOROaAyBRmBjBUKlByBmCCsBPoBvBDVoEjBINlDFORmBMOLrBP3CE9BWvDdtEHbcvDIba+GKzCQ5EBfM8DWpDDLCUIxBEgBUFMoCU+CKGPRL|11E08C6CG0CdtEfxBTPb5CPtBYpCMyCmCjBYgEImCR|1iDqmCJNAMfLWaDNMQMN|56Dq8CtBCmCGXH|pjDo3CVLfI2BE|/iDi2CWUQBlBR|1oDoyCUDvBQcL|5/Dg/CKBzBHKG1BIiCIUL|x+D4/CNA2BGnBF|/hE4/CmBFzBDJKYA|j/DkhDdG6BDbB|puEmhDvBIcGeJJD|jiE69CfEWMcJRF|plCugCXHKLnB5BYUcDZPkBDDPiBSkBJVTSFPJqBKfZINgBSLXOKGHPhBVBAUVJMWNQLRzBVoBgBxFADMoBWfCSCMUQDHQQEe8BgCW|4burCIBBFJGEC|qRq1CKAhBJYK|8Vg3CYHzBNcW|iYy3COB9BPwBS|2T21CgBG7CTsCqBPb|gTm2CANhBEiBK|x5C2gDhBCqBAHB|h4B0mDjDUiDDCP|/V6jD9BAkCIFH|vWo+CYN7BAkBO|tlBuoDmFL3HFBD2IGaJ2DL/BLvIJODwFCiBLgBCWMgCAIDAJNJ9BTBFqEiB4CJ2BQqCAwDLjCPzBDIFJD5CHgBDVH1DAbJEJcABPQF1CVIDfhBkBI2BHID3BASJoCDGDBJJFrCGrBHdEJDcFQLiCFDDSJEJFLlBEtBLXEWFcEIJJFIASOQAcRCHrCJfGIKJCCFPDGDFFIBoCFLPjCHjBGjBOVFfKcLxBLvBIcHnBDoEK0CTATJBAJlCQXWvCNqCIEPTDaAoDZVJADEFEIWCKlBjBDBQJPZAXIXW1BOvBEyBFIJpBLjCCQFFHjBHmDBtBNKBOI8BGmEJhBLfBEFVAAFjBHED3BRzETTCEFPB1BQGHFBIHlBNnBjBVLVHZIILdLFGDHPCbJJEcYhBEQFPNNEMLtCFWHZLhBAGHMCSPXLfEoBFCPTJNRdGUJJHpBBgBFFPILTFMAPlBNJhBEcHENHDZEMHJBTEIOPJfICGYMZHZGDIMQnBP1BBSKZABIREFIJEEEHIWIdDCKdIAKUOXJpBiBDO0BIJACErBHFESOWGOAOJDKPCRSKPTFCGDBZVNmBLI6BS5BNZGEQLC4CiBpCbVBBKKKoBKzBEHGEK0BOsCHVGIE3BC3BLYa+BFSOpBHvBEOMSEoBFSCOIRBGQgBAfCMSSGFGIEtCAlCOVMQE2BB0CNXICKTGeAvCIDE0BQhCDMIHARUGCLBUPVJCHdDjBIBGOQSKdFBEOCLEcEGMjBGOOfIKIPQnBAWCAKSE7CgBMGJI/FaxCHlCCSHHB5BGvBM4BKnCIIGjBHVK4DOmCDBEIEVIlDJvBKSGtBB9BQOMgBEqDKYImDEWMUWYEpDANIsDcgBCaFHIKE+BBOKDOeGuBAsDVpDa8FOkBHETUIEIFCEI0CP2BAtBOLImBA0GZICDKQKDEvBMoFAtGIsEMkCFmBK4CNIGfI2CIqIA|y/Gy4CFK0BSAVtBF|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';
    const LAGHI = '4wCk5DMPdpB9L3HPxDuB5F9B7ClLlGhFxENnDkCtEAvChBzB3EtCRrBcjCsFjFhBNnCgBvDsDjCoEoCuDemEfoC1FuDvDgFqBWkHrB8G8CoMuKC2B1B0DoB2D8CwC2HoEsGS|k0Dq1CyByBpB6EyCgE+J4D2BuGqDqD6B0H+H2E0CMoBzBb1BxF3BtBrBDtCpBjCevCvDjFuEjNqFrD0FxGU3CxBAPwChFoF5FgDzF8JlCC/CjC7GpC3B/BIpEhBxDlFhC3D7DhBOkCuDyFyD|2/Ck+CmC9DVblCiDpHpD9B4HmCkDDlGa1BgCAqD6EkB2E2DF+DyByMoCtB7B7IlBhE1BtExDX3C';
    const CONFINI = 'hxB65C+CPyBSYyCyCEMsCkD6CgLmCiD4DeuGeoBmFmBuFqD4CiELyE1D+ErDoC6BqCuC2BkI2ByCoBmG0F+EgCgCmCBoBpBgB4DwDsDqB+GgB0DN2B1BS5CLrHvC1JQhDsB/BiJtDwDxC+HhIuJrDmCD0D6B8C7B4HTmD7C7B9CxDhD7CtEiER6I9DkF9HIlC3B9E+EiB8H5BgEuDkDoEOkCtBiChFsB5D4EIekE0ClCsEQuBkH6CuB2CGuEqCsCiJqEqC+D6CmB0CmC6BwE2DqFY4C5BgGC0E7CwCgBiDkCgDuCyByICCxBkErCsBM8BuCgDmBoBrP4EpCwCxEoE3C8CXsOBqCU+B6BE8DqBiBgGxB+KyD8HQ2F7B2BnH4G3EqBjCC5CkEB6I+C0BsCzBoCjF0DzBuCW6CuE2DgB4CdsBtLqC9B4BmCyC/BkCUkG4E+DkCgFgN6CoDAgCjBN/DQpBmFnBuC5B';

    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const IDX = {};
    for (let i = 0; i < B64.length; i++) IDX[B64.charAt(i)] = i;

    /* stringa -> percorsi di [lon,lat] */
    function decodi(s, scala, ox, oy) {
      const fuori = [];
      if (!s) return fuori;
      const pezzi = s.split('|');
      for (let k = 0; k < pezzi.length; k++) {
        const p = pezzi[k], pts = [];
        let i = 0, x = 0, y = 0;
        while (i < p.length) {
          let v = 0, sh = 0, c;
          do { c = IDX[p.charAt(i++)]; v |= (c & 31) << sh; sh += 5; } while (c & 32);
          x += (v >>> 1) ^ -(v & 1);
          v = 0; sh = 0;
          do { c = IDX[p.charAt(i++)]; v |= (c & 31) << sh; sh += 5; } while (c & 32);
          y += (v >>> 1) ^ -(v & 1);
          pts.push([ox + x / scala, oy + y / scala]);
        }
        if (pts.length > 1) fuori.push(pts);
      }
      return fuori;
    }

    function xyz(lon, lat) {
      const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
      return { x: Math.cos(la) * Math.sin(lo), y: -Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
    }

    /* coste del mondo, preparate una volta sola per tutti i canvas.
       Il percorso si spezza dove due punti consecutivi sono lontanissimi:
       e' il salto dell'antimeridiano, e tirare la corda dritta disegnerebbe
       uno scarabocchio attraverso il globo. */
    let COSTE = null;
    function coste() {
      if (COSTE) return COSTE;
      COSTE = [];
      const grezzi = decodi(MONDO, 20, 0, 0);
      for (let k = 0; k < grezzi.length; k++) {
        let cur = [];
        for (let i = 0; i < grezzi[k].length; i++) {
          const p = xyz(grezzi[k][i][0], grezzi[k][i][1]);
          if (cur.length) {
            const q = cur[cur.length - 1];
            if (p.x * q.x + p.y * q.y + p.z * q.z < 0.94) {
              if (cur.length > 1) COSTE.push(cur);
              cur = [];
            }
          }
          cur.push(p);
        }
        if (cur.length > 1) COSTE.push(cur);
      }
      return COSTE;
    }

    /* reticolo: meridiani e paralleli ogni 20 gradi, calcolati una volta */
    let RETICOLO = null;
    function reticolo() {
      if (RETICOLO) return RETICOLO;
      RETICOLO = [];
      for (let lon = -180; lon < 180; lon += 20) {
        const l = [];
        for (let lat = -80; lat <= 80; lat += 5) l.push(xyz(lon, lat));
        RETICOLO.push(l);
      }
      for (let lat = -60; lat <= 60; lat += 20) {
        const l = [];
        for (let lon = -180; lon <= 180; lon += 5) l.push(xyz(lon, lat));
        RETICOLO.push(l);
      }
      return RETICOLO;
    }

    const CITTA = {
      como:   { lon: 9.08, lat: 45.81, nome: 'COMO' },
      milano: { lon: 9.19, lat: 45.46, nome: 'MILANO' },
      lugano: { lon: 8.95, lat: 46.00, nome: 'LUGANO' }
    };
    const HUB = xyz(CITTA.como.lon, CITTA.como.lat);
    /* l'angolo che porta Como davanti all'osservatore, e l'inclinazione che
       alza il 42esimo parallelo al centro: l'Europa resta in alto, e sotto
       avanza il posto per la lente */
    const CASA = -CITTA.como.lon * Math.PI / 180;
    const INCLINA = -42 * Math.PI / 180;

    /* la rete di talenti: punti attorno a Como, sempre gli stessi a ogni
       visita (numeri pseudocasuali con seme fisso, non Math.random) */
    const RETE = [];
    (function () {
      let s = 20260830;
      function r() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
      for (let i = 0; i < 15; i++) {
        const a = r() * Math.PI * 2, d = 0.10 + r() * 0.26;
        RETE.push({ lon: CITTA.como.lon + Math.cos(a) * d / 0.7, lat: CITTA.como.lat + Math.sin(a) * d, f: r() });
      }
    })();

    const LAGHI_PT = decodi(LAGHI, 2000, 8.20, 45.20);
    const CONFINI_PT = decodi(CONFINI, 2000, 8.20, 45.20);

    function rotY(p, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
    }
    function rotX(p, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
    }
    function vista(p, a) { return rotX(rotY(p, a), INCLINA); }

    function slerp(a, b, u) {
      let d = a.x * b.x + a.y * b.y + a.z * b.z;
      d = d > 1 ? 1 : (d < -1 ? -1 : d);
      const w = Math.acos(d), sw = Math.sin(w);
      if (sw < 1e-6) return { x: a.x, y: a.y, z: a.z };
      const k1 = Math.sin((1 - u) * w) / sw, k2 = Math.sin(u * w) / sw;
      return { x: a.x * k1 + b.x * k2, y: a.y * k1 + b.y * k2, z: a.z * k1 + b.z * k2, w: w };
    }

    function avvia(tela, modo) {
      const ctx = tela.getContext('2d');
      if (!ctx) return;
      const piastra = modo === 'piastra';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let W = 0, H = 0;

      function misura() {
        const r = tela.getBoundingClientRect();
        W = tela.width = Math.max(1, Math.round(r.width * dpr));
        H = tela.height = Math.max(1, Math.round(r.height * dpr));
      }
      misura();
      window.addEventListener('resize', misura);

      /* --- trascinamento, e il ritorno a casa --- */
      let angolo = CASA, mano = false, manoX = 0, manoA = 0, lasciato = 0;
      if (piastra) {
        tela.addEventListener('pointerdown', function (e) {
          mano = true; manoX = e.clientX; manoA = angolo;
          try { tela.setPointerCapture(e.pointerId); } catch (err) {}
        });
        tela.addEventListener('pointermove', function (e) {
          if (mano) angolo = manoA + (e.clientX - manoX) * 0.008;
        });
        const su = function (e) {
          if (!mano) return;
          mano = false; lasciato = performance.now();
          try { tela.releasePointerCapture(e.pointerId); } catch (err) {}
        };
        tela.addEventListener('pointerup', su);
        tela.addEventListener('pointercancel', su);
        tela.addEventListener('pointerleave', su);
      }

      /* --- le rotte: partono da Como, non arrivano da nessuna parte --- */
      const rotte = [];
      let prossima = 0;
      function nuovaRotta(t) {
        let b;
        if (Math.random() < 0.58) {
          /* Europa: entro un raggio breve, la rotta che facciamo piu' spesso */
          const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 18;
          b = xyz(CITTA.como.lon + Math.cos(a) * d / 0.7, Math.max(-60, Math.min(70, CITTA.como.lat + Math.sin(a) * d)));
        } else {
          const lat = (Math.random() * 110 - 45);
          b = xyz(Math.random() * 360 - 180, lat);
        }
        rotte.push({ b: b, t0: t, dur: 1500 + Math.random() * 1400 });
      }

      function proietta(p, cx, cy, R) {
        const f = 2.6 / (2.6 - p.z);
        return { x: cx + p.x * R * f, y: cy + p.y * R * f, z: p.z };
      }

      /* --- la lente: la scala del territorio --- */
      const LAT0 = 45.95, LON0 = 9.10, COSL = Math.cos(LAT0 * Math.PI / 180);
      function disegnaLente(cx, cy, r, t) {
        /* quanti gradi di latitudine stanno nel raggio della lente: 0.66 tiene
           Milano abbastanza dentro perche' il suo nome non finisca tagliato
           dal bordo tondo quando la tavola si stringe */
        const K = r / 0.66;
        function pt(lon, lat) { return { x: cx + (lon - LON0) * COSL * K, y: cy - (lat - LAT0) * K }; }
        const linea = 1 * dpr;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#08080b';
        ctx.fill();
        ctx.clip();

        /* confine di Stato: tratteggio, come su una carta */
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = linea;
        CONFINI_PT.forEach(function (p) {
          ctx.beginPath();
          for (let i = 0; i < p.length; i++) {
            const q = pt(p[i][0], p[i][1]);
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          }
          ctx.stroke();
        });
        ctx.setLineDash([]);

        /* i laghi: sono la faccia del posto, Lario e Ceresio */
        LAGHI_PT.forEach(function (p) {
          ctx.beginPath();
          for (let i = 0; i < p.length; i++) {
            const q = pt(p[i][0], p[i][1]);
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(120,150,190,.14)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,180,215,.42)';
          ctx.lineWidth = linea;
          ctx.stroke();
        });

        /* la rete: fili corti dal centro, e un punto che respira */
        const c = pt(CITTA.como.lon, CITTA.como.lat);
        RETE.forEach(function (n) {
          const q = pt(n.lon, n.lat);
          const battito = fermo ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 1000 * 1.1 + n.f * 6.3));
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(255,42,42,' + (0.10 + battito * 0.16) + ')';
          ctx.lineWidth = linea * 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(q.x, q.y, (1.5 + battito * 0.9) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,150,150,' + (0.35 + battito * 0.45) + ')';
          ctx.fill();
        });

        /* le tre citta' */
        /* I nomi seguono la lente, ma non scendono sotto i 9px: sotto quella
           misura una carta non e' piu' una carta, e' una macchia.
           La misura si prende dal raggio in pixel di CSS, non da quelli del
           dispositivo: se no su un telefono a tre punti per pixel i nomi
           verrebbero tre volte piu' grandi che su un monitor normale. */
        const cor = Math.max(9, Math.min(13, r / dpr * 0.09));
        ctx.font = '500 ' + (cor * dpr) + 'px "Saira Condensed","Arial Narrow",sans-serif';
        ctx.textBaseline = 'middle';
        [['lugano', 'destra', -1], ['milano', 'sinistra', 1], ['como', 'sinistra', 1]].forEach(function (voce) {
          const citta = CITTA[voce[0]], q = pt(citta.lon, citta.lat), casa = voce[0] === 'como';
          ctx.beginPath();
          ctx.arc(q.x, q.y, (casa ? 3.4 : 2.6) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = casa ? '#ff2a2a' : 'rgba(255,80,80,.9)';
          ctx.fill();
          if (casa) {
            ctx.beginPath();
            ctx.arc(q.x, q.y, 7 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,42,42,.5)';
            ctx.lineWidth = linea;
            ctx.stroke();
          }
          ctx.textAlign = voce[1] === 'destra' ? 'right' : 'left';
          ctx.fillStyle = casa ? '#ffffff' : 'rgba(230,230,236,.72)';
          ctx.fillText(citta.nome, q.x + voce[2] * 9 * dpr, q.y + (casa ? 0 : 0));
        });

        /* le due sponde del confine, dette per nome */
        ctx.font = '500 ' + (cor * 0.8 * dpr) + 'px "Space Mono",monospace';
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.textAlign = 'left';
        let e = pt(8.74, 46.28); ctx.fillText('CH', e.x, e.y);
        e = pt(8.74, 45.70); ctx.fillText('IT', e.x, e.y);

        /* La scala: senza, una lente non dice quanto e' grande il posto.
           Sta in basso a sinistra, con la misura sopra il segmento e non di
           fianco: di fianco andava a sbattere contro Milano appena la tavola
           si stringeva. */
        const km20 = 0.1796 * K;                       /* 20 km di latitudine */
        const sx = cx - r * 0.45, sy = cy + r * 0.72;
        ctx.strokeStyle = 'rgba(255,255,255,.38)';
        ctx.lineWidth = linea;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3 * dpr); ctx.lineTo(sx, sy + 3 * dpr);
        ctx.moveTo(sx, sy); ctx.lineTo(sx + km20, sy);
        ctx.moveTo(sx + km20, sy - 3 * dpr); ctx.lineTo(sx + km20, sy + 3 * dpr);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.42)';
        ctx.textAlign = 'center';
        ctx.fillText('20 km', sx + km20 / 2, sy - 8 * dpr);

        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.20)';
        ctx.lineWidth = linea;
        ctx.stroke();
      }

      /* le due rette tangenti fra il cerchietto sul globo e la lente:
         e' il gesto con cui un atlante dice "questo pezzo, ingrandito" */
      function tangenti(ax, ay, ra, bx, by, rb, alfa) {
        const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
        if (d <= Math.abs(rb - ra) + 1) return;
        const base = Math.atan2(dy, dx), apri = Math.acos((rb - ra) / d);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 * alfa) + ')';
        ctx.lineWidth = 1 * dpr;
        [1, -1].forEach(function (s) {
          const a = base + s * apri;
          ctx.beginPath();
          ctx.moveTo(ax + ra * Math.cos(a), ay + ra * Math.sin(a));
          ctx.lineTo(bx + rb * Math.cos(a), by + rb * Math.sin(a));
          ctx.stroke();
        });
      }

      function disegna() {
        if (!W || !H) { misura(); return; }
        const t = performance.now();
        /* La lente si piazza per prima, in basso a sinistra: e' lei a dire
           quanto il globo puo' venire avanti. Su una tavola stretta pesa di
           piu' del globo — i nomi delle citta' hanno una misura sotto la quale
           non si leggono, e li' il dettaglio conta piu' del pianeta. */
        const largo = W / dpr >= 520;
        const lr = largo ? Math.min(W * 0.20, H * 0.17) : Math.min(W * 0.20, H * 0.21),
              lx = lr + W * 0.03, ly = H - lr - H * 0.03;

        /* Il globo esce dal bordo destro dello schermo. Il tratto visibile va
           da (cx - R) al bordo del canvas: col centro a R * 0.35 dal bordo se
           ne vede poco piu' di due terzi, il resto e' fuori.
           Il raggio lo decide l'altezza: 0.52H, cioe' un filo piu' del pieno,
           cosi' la sfera esce anche sopra e sotto ed e' chiaro che e' un
           ritaglio e non una palla appoggiata li'.
           Poi c'e' la rete: se venendo avanti il globo arriva addosso alla
           lente, torna indietro quanto basta per lasciarle il suo spazio. Su
           un telefono succede sempre, e senza questo conto la lente finirebbe
           dentro il pianeta. */
        const R = piastra ? Math.min(H * 0.52, W * 0.72) : Math.min(W, H) / 2 * 0.86;
        let gcx = piastra ? W - R * 0.35 : W * 0.5;
        const gcy = piastra ? H * 0.50 : H * 0.5;
        if (piastra) {
          const dy = gcy - ly, minimo = R + lr + 14 * dpr;
          const q = minimo * minimo - dy * dy;
          if (q > 0) gcx = Math.max(gcx, lx + Math.sqrt(q));
        }
        const linea = 1 * dpr;

        /* l'angolo: oscilla attorno a casa, e ci torna dopo un trascinamento */
        if (!mano) {
          if (modo === 'sfondo') {
            if (!fermo) angolo += 0.0014;
          } else {
            const casa = CASA + (fermo ? 0 : Math.sin(t / 1000 * 0.16) * 0.34);
            if (lasciato) {
              /* due secondi di rispetto per la mano, poi rientra da solo:
                 avvicinamento esponenziale, nessuna frenata brusca */
              if (t - lasciato > 2000) {
                let d = casa - angolo;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;
                if (Math.abs(d) < 0.005) { angolo = casa; lasciato = 0; }
                else angolo += d * 0.035;
              }
            } else angolo = casa;
          }
        }

        ctx.clearRect(0, 0, W, H);

        /* la sfera */
        const grad = ctx.createRadialGradient(gcx - R * 0.3, gcy - R * 0.35, R * 0.1, gcx, gcy, R);
        grad.addColorStop(0, 'rgba(28,30,38,.55)');
        grad.addColorStop(1, 'rgba(6,6,8,.75)');
        ctx.beginPath();
        ctx.arc(gcx, gcy, R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        /* reticolo */
        reticolo().forEach(function (l) {
          ctx.beginPath();
          let giu = true;
          for (let i = 0; i < l.length; i++) {
            const p = proietta(vista(l[i], angolo), gcx, gcy, R);
            if (p.z < 0.02) { giu = true; continue; }
            if (giu) { ctx.moveTo(p.x, p.y); giu = false; } else ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = 'rgba(255,255,255,.045)';
          ctx.lineWidth = linea * 0.8;
          ctx.stroke();
        });

        /* Coste. Un tratto per segmento sarebbero quattromila stroke() a
           fotogramma: i segmenti si raccolgono in sei fasce di profondita' e
           se ne disegna una per fascia. Stesso risultato a occhio, sei tratti
           invece di quattromila. */
        const FASCE = 6, bande = [];
        for (let f = 0; f < FASCE; f++) bande.push(new Path2D());
        coste().forEach(function (l) {
          let prec = null;
          for (let i = 0; i < l.length; i++) {
            const p = proietta(vista(l[i], angolo), gcx, gcy, R);
            if (prec) {
              const z = (prec.z + p.z) / 2;
              if (z >= -0.02) {
                let f = Math.floor(((z + 1) / 2 - 0.49) / 0.51 * FASCE);
                f = f < 0 ? 0 : (f >= FASCE ? FASCE - 1 : f);
                bande[f].moveTo(prec.x, prec.y);
                bande[f].lineTo(p.x, p.y);
              }
            }
            prec = p;
          }
        });
        for (let f = 0; f < FASCE; f++) {
          const q = (f + 0.5) / FASCE;
          ctx.strokeStyle = 'rgba(226,228,236,' + (0.10 + q * 0.55) + ')';
          ctx.lineWidth = (0.6 + q * 0.6) * dpr;
          ctx.stroke(bande[f]);
        }

        /* orlo */
        ctx.beginPath();
        ctx.arc(gcx, gcy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        ctx.lineWidth = linea;
        ctx.stroke();

        if (!piastra) return;

        /* le rotte */
        if (!fermo && t > prossima) { nuovaRotta(t); prossima = t + 620 + Math.random() * 520; }
        if (fermo && !rotte.length) { for (let i = 0; i < 3; i++) nuovaRotta(t - 900 - i * 200); }
        for (let i = rotte.length - 1; i >= 0; i--) {
          const r = rotte[i];
          let u = (t - r.t0) / r.dur;
          if (fermo) u = 0.72;
          if (u > 1.5) { rotte.splice(i, 1); continue; }
          const testa = Math.min(1, u), coda = Math.max(0, u - 0.42);
          const spegne = u > 1 ? Math.max(0, 1 - (u - 1) * 2) : Math.min(1, u * 5);
          const passi = 30;
          let prec = null;
          for (let k = 0; k <= passi; k++) {
            const f = k / passi;
            const s = slerp(HUB, r.b, f);
            /* la rotta si alza poco sopra la superficie: alzandola di piu' la
               prospettiva la fa uscire dal disco del globo, e quello che si
               vede non e' piu' una rotta ma una riga rossa per aria */
            const alto = 1 + (0.02 + 0.06 * (s.w || 0) / Math.PI) * Math.sin(Math.PI * f);
            const p = proietta(vista({ x: s.x * alto, y: s.y * alto, z: s.z * alto }, angolo), gcx, gcy, R);
            /* sull'orlo la rotta si spegne invece di essere tagliata di netto:
               un taglio secco si legge come un difetto, una dissolvenza come
               una cosa che se ne va oltre l'orizzonte */
            if (prec && p.z > 0.05 && prec.z > 0.05 && f <= testa) {
              const prof = Math.min(1, (p.z - 0.05) * 2.6);
              const viva = f >= coda;
              ctx.beginPath();
              ctx.moveTo(prec.x, prec.y);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = viva
                ? 'rgba(255,90,90,' + (0.75 * prof * spegne) + ')'
                : 'rgba(255,42,42,' + (0.16 * prof * spegne) + ')';
              ctx.lineWidth = (viva ? 1.5 : 0.9) * dpr;
              ctx.stroke();
            }
            prec = p;
          }
        }

        /* Como sul globo: un punto e il cerchietto che la lente ingrandisce */
        const h = proietta(vista(HUB, angolo), gcx, gcy, R);
        const visto = Math.max(0, Math.min(1, (h.z - 0.05) * 3));
        if (visto > 0) {
          const battito = fermo ? 0.6 : 0.5 + 0.5 * Math.sin(t / 1000 * 1.7);
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, (7 + battito * 5) * dpr);
          g.addColorStop(0, 'rgba(255,42,42,' + (0.55 * visto) + ')');
          g.addColorStop(1, 'rgba(255,42,42,0)');
          ctx.beginPath();
          ctx.arc(h.x, h.y, (7 + battito * 5) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(h.x, h.y, 2.6 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,90,90,' + (0.55 + 0.45 * visto) + ')';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(h.x, h.y, 9 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.22 * visto) + ')';
          ctx.lineWidth = linea;
          ctx.stroke();
        }

        if (visto > 0) tangenti(h.x, h.y, 9 * dpr, lx, ly, lr, visto);
        disegnaLente(lx, ly, lr, t);
      }

      /* Si disegna solo quando si vede: fuori dallo schermo il ciclo si ferma.
         E con le animazioni ridotte non c'e' niente da animare — si disegna un
         fotogramma e si smette, finche' non arriva una mano o un ridimensionamento. */
      let id = null;
      function ciclo() {
        disegna();
        if (fermo && !mano && !lasciato) { id = null; return; }
        id = requestAnimationFrame(ciclo);
      }
      function accendi() { if (!id) { id = requestAnimationFrame(ciclo); } }
      function spegni() { if (id) { cancelAnimationFrame(id); id = null; } }
      if (fermo) {
        tela.addEventListener('pointerdown', accendi);
        window.addEventListener('resize', accendi);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(accendi);
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (voci) {
          voci.forEach(function (v) { v.isIntersecting ? accendi() : spegni(); });
        }, { rootMargin: '120px' }).observe(tela);
      } else accendi();
      accendi();
    }

    Array.prototype.forEach.call(tele, function (tela) {
      avvia(tela, tela.getAttribute('data-globo') || 'sfondo');
    });
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