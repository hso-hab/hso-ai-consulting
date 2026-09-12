(() => {
  if (!('IntersectionObserver' in window) || typeof Element.prototype.animate !== 'function') return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const active = new Set();
  const revealed = new WeakSet();
  const progress = document.createElement('div');
  progress.className = 'motion-progress';
  progress.setAttribute('aria-hidden', 'true');
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'motion-control';
  control.setAttribute('aria-label', 'アニメーション停止');
  document.body.append(progress, control);
  let manuallyPaused = false;
  try { manuallyPaused = sessionStorage.getItem('hso-rich-motion-paused') === 'true'; } catch {}
  let observer;
  let running = false;
  let frame = 0;
  let printing = false;
  const art = document.querySelector('.hero-art');
  const hero = document.querySelector('.hero');
  const targets = document.querySelectorAll([
    '.hero-copy > *', '.hero-art', '.page-intro > *', '.section-heading',
    '.challenge-list li', '.service-row', '.example-row', '.approach-grid article', '.steps li',
    '.company-graphic', '.service-detail-title', '.service-detail-content',
    '.reason > div', '.company-side', '.company-detail > .company-table',
    '.faq-list details', '.contact-band-inner > *'
  ].join(','));

  function play(target, keyframes, options) {
    if (!running || target.matches(':focus-within')) return;
    const animation = target.animate(keyframes, options);
    active.add(animation);
    const forget = () => active.delete(animation);
    animation.addEventListener('finish', forget, { once: true });
    animation.addEventListener('cancel', forget, { once: true });
  }

  function updateScroll() {
    frame = 0;
    const height = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${height > 0 ? Math.min(1, Math.max(0, scrollY / height)) : 0})`;
    if (art && hero) {
      const amount = Math.min(hero.offsetHeight, Math.max(0, scrollY)) * (innerWidth > 800 ? .07 : .025);
      art.style.translate = running ? `0 ${amount}px` : '';
    }
  }
  function queueScroll() {
    if (running && !frame) frame = requestAnimationFrame(updateScroll);
  }

  function configure() {
    running = !manuallyPaused && !preference.matches && !printing;
    observer?.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
    document.body.dataset.richMotion = running ? 'on' : 'off';
    control.textContent = preference.matches ? '端末設定により動きOFF' : running ? '動きを止める' : '動きを再開する';
    control.disabled = preference.matches;
    control.setAttribute('aria-label', preference.matches ? '端末設定によりアニメーション停止中' : 'アニメーション停止');
    control.setAttribute('aria-pressed', String(!running));
    progress.hidden = !running;
    document.querySelectorAll('.button').forEach(button => button.style.removeProperty('translate'));
    updateScroll();
    if (!running) return;
    observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || revealed.has(entry.target)) return;
        revealed.add(entry.target);
        observer.unobserve(entry.target);
        const target = entry.target;
        const isArt = target.classList.contains('hero-art') || target.classList.contains('company-graphic');
        const isHero = !!target.closest('.hero');
        play(target, isArt ? [
          { opacity: 0, transform: 'translateY(28px) scale(.86)', filter: 'blur(5px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
        ] : [
          { opacity: 0, transform: 'translateY(30px)', filter: 'blur(3px)' },
          { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
        ], {
          duration: isArt ? 1400 : isHero ? 1000 : 850,
          delay: Math.min(order++ * (isHero ? 110 : 85), 440),
          easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards'
        });
      });
    }, { threshold: 0, rootMargin: '0px 0px -28px 0px' });
    targets.forEach(target => { if (!revealed.has(target)) observer.observe(target); });
  }

  control.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    try { sessionStorage.setItem('hso-rich-motion-paused', String(manuallyPaused)); } catch {}
    configure();
  });
  preference.addEventListener('change', configure);
  document.addEventListener('focusin', event => {
    active.forEach(animation => {
      if (animation.effect?.target?.contains(event.target)) animation.cancel();
    });
  });
  document.querySelectorAll('.button').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (!running || !finePointer.matches || event.pointerType !== 'mouse') return;
      const box = button.getBoundingClientRect();
      const x = Math.max(-7, Math.min(7, (event.clientX - box.left - box.width / 2) * .065));
      const y = Math.max(-5, Math.min(5, (event.clientY - box.top - box.height / 2) * .12));
      button.style.translate = `${x}px ${y}px`;
    });
    button.addEventListener('pointerleave', () => button.style.removeProperty('translate'));
  });
  document.querySelectorAll('.faq-list details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) play(details.querySelector('.faq-answer'), [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 420, easing: 'ease-out' });
    });
  });
  document.addEventListener('visibilitychange', () => {
    document.getAnimations().forEach(animation => {
      if (document.hidden && animation.playState === 'running') {
        animation.pause(); animation.hsoVisibilityPaused = true;
      } else if (!document.hidden && animation.hsoVisibilityPaused && running) {
        animation.play(); animation.hsoVisibilityPaused = false;
      }
    });
  });
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll, { passive: true });
  addEventListener('beforeprint', () => { printing = true; configure(); });
  addEventListener('afterprint', () => { printing = false; configure(); });
  configure();
})();
