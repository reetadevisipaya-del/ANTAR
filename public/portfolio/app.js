(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];

  const nav = $('.nav');
  const progress = $('.progress i');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onScroll = () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 18);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.width = `${Math.min(100, (y / max) * 100)}%`;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  if (!reduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, {threshold:.08, rootMargin:'0px 0px -4% 0px'});
    $$('.reveal').forEach(el => observer.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'});
    });
  });

  const tabs = $$('[data-system-tab]');
  const screens = $$('[data-system-screen]');
  const copies = $$('[data-system-copy]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.systemTab;
      tabs.forEach(x => x.classList.toggle('active', x === tab));
      screens.forEach(x => x.classList.toggle('active', x.dataset.systemScreen === key));
      copies.forEach(x => x.classList.toggle('active', x.dataset.systemCopy === key));
    });
  });

  const modal = $('[data-certificate-modal]');
  const openModal = () => {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    $('[data-certificate-close]', modal)?.focus();
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  };
  $$('[data-certificate-open]').forEach(btn => btn.addEventListener('click', openModal));
  $$('[data-certificate-close]').forEach(btn => btn.addEventListener('click', closeModal));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    const stack = $('.paper-stack');
    const hero = $('.hero');
    hero?.addEventListener('pointermove', e => {
      if (!stack) return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      stack.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 3}deg) translate3d(${x * 4}px,${y * 4}px,0)`;
    });
    hero?.addEventListener('pointerleave', () => {
      if (stack) stack.style.transform = '';
    });

    $$('.browser,.nova-frame,.evidence-doc,.certificate').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(1200px) rotateX(${-y * 1.15}deg) rotateY(${x * 1.15}deg) translateY(-1px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform = '');
    });
  }
})();