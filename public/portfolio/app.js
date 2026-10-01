(() => {
  const q = (s, c=document) => c.querySelector(s);
  const qa = (s, c=document) => [...c.querySelectorAll(s)];

  const loader = q('.loader');
  window.addEventListener('load', () => setTimeout(() => loader?.classList.add('hidden'), 450));

  const header = q('.site-header');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        reveal.unobserve(entry.target);
      }
    });
  }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
  qa('.reveal').forEach(el => reveal.observe(el));

  if (window.matchMedia('(pointer:fine)').matches) {
    const dot = q('.cursor-dot');
    const ring = q('.cursor-ring');
    let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (dot) dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    }, {passive:true});
    const loop = () => {
      rx += (mx-rx)*.14; ry += (my-ry)*.14;
      if (ring) ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    qa('a, button, [data-tilt]').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    qa('.magnetic').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width/2;
        const y = e.clientY - r.top - r.height/2;
        el.style.transform = `translate(${x*.12}px,${y*.12}px)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });

    qa('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX-r.left)/r.width - .5;
        const y = (e.clientY-r.top)/r.height - .5;
        card.style.transform = `perspective(1300px) rotateX(${-y*2.2}deg) rotateY(${x*2.2}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)';
        card.style.transform = '';
        setTimeout(() => card.style.transition = '', 520);
      });
    });
  }

  const hero = q('.hero-title-wrap');
  const orb1 = q('.orb-one');
  const orb2 = q('.orb-two');
  window.addEventListener('scroll', () => {
    const y = Math.min(window.scrollY, 900);
    if (hero) hero.style.transform = `translateY(${y*.035}px)`;
    if (orb1) orb1.style.transform = `translate3d(0,${y*.055}px,0)`;
    if (orb2) orb2.style.transform = `translate3d(0,${-y*.035}px,0)`;
  }, {passive:true});

  qa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id && id !== '#' ? q(id) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  const projectSections = qa('.project');
  const navLinks = qa('.desktop-nav a');
  const spy = new IntersectionObserver((entries) => {
    const visible = entries.find(e => e.isIntersecting);
    if (!visible) return;
    navLinks.forEach(a => a.removeAttribute('data-active'));
    const workLink = navLinks.find(a => a.getAttribute('href') === '#work');
    if (workLink) workLink.setAttribute('data-active','true');
  }, {threshold:.25});
  projectSections.forEach(s => spy.observe(s));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) loader?.classList.add('hidden');
})();