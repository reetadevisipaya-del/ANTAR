(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];

  const nav = $('.site-nav');
  const progress = $('.scroll-progress i');

  const updateChrome = () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 18);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.width = `${Math.min(100, (y / max) * 100)}%`;
  };
  updateChrome();
  window.addEventListener('scroll', updateChrome, {passive:true});

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, {threshold:.1, rootMargin:'0px 0px -5% 0px'});
    $$('.reveal').forEach(el => observer.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = $(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'});
    });
  });

  const roleTabs = $$('[data-role-tab]');
  const rolePanels = $$('[data-role-panel]');
  const roleUis = $$('[data-role-ui]');
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const role = tab.dataset.roleTab;
      roleTabs.forEach(x => x.classList.toggle('active', x === tab));
      rolePanels.forEach(x => x.classList.toggle('active', x.dataset.rolePanel === role));
      roleUis.forEach(x => x.classList.toggle('active', x.dataset.roleUi === role));
    });
  });

  const certModal = $('[data-certificate-modal]');
  const openCert = () => {
    if (!certModal) return;
    certModal.classList.add('open');
    certModal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    $('[data-certificate-close]', certModal)?.focus();
  };
  const closeCert = () => {
    if (!certModal) return;
    certModal.classList.remove('open');
    certModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  };
  $$('[data-certificate-open]').forEach(btn => btn.addEventListener('click', openCert));
  $$('[data-certificate-close]').forEach(btn => btn.addEventListener('click', closeCert));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && certModal?.classList.contains('open')) closeCert();
  });

  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    const sculpture = $('.research-sculpture');
    const hero = $('.hero');

    hero?.addEventListener('pointermove', event => {
      if (!sculpture) return;
      const r = hero.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5;
      const y = (event.clientY - r.top) / r.height - .5;
      sculpture.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
    });
    hero?.addEventListener('pointerleave', () => {
      if (sculpture) sculpture.style.transform = '';
    });

    $$('.research-card, .method-card, .protocol-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - .5;
        const y = (event.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(900px) rotateX(${-y * 1.8}deg) rotateY(${x * 1.8}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform = '');
    });
  }

  const iframeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target;
      if (!entry.isIntersecting || iframe.dataset.activated) return;
      iframe.dataset.activated = 'true';
    });
  }, {rootMargin:'200px'});
  $$('iframe').forEach(frame => iframeObserver.observe(frame));
})();