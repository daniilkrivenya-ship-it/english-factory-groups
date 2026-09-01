
(() => {
  const docs = Array.from(document.querySelectorAll('.doc'));
  const lightbox = document.getElementById('docLightbox');
  if (!docs.length || !lightbox) return;

  const image = lightbox.querySelector('.lightbox-img');
  const count = lightbox.querySelector('.lightbox-count');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  const sources = docs.map((doc) => doc.getAttribute('href') || doc.querySelector('img')?.getAttribute('src') || '');
  let current = 0;

  const show = (index) => {
    current = (index + sources.length) % sources.length;
    image.src = sources[current];
    if (count) count.textContent = `${current + 1} / ${sources.length}`;
  };
  const open = (index) => {
    show(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    image.removeAttribute('src');
  };

  docs.forEach((doc, index) => doc.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    open(index);
  }));
  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => show(current - 1));
  nextBtn?.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
})();

(() => {
  const gears = Array.from(document.querySelectorAll('.side-gear'));
  if (!gears.length) return;
  let lastY = window.scrollY || 0;
  let rotation = lastY;
  let ticking = false;
  const render = () => {
    gears.forEach((gear) => {
      const direction = Number(gear.dataset.dir || 1);
      const speed = Number(gear.dataset.speed || 0.12);
      gear.style.setProperty('--gear-angle', `${rotation * speed * direction}deg`);
    });
    ticking = false;
  };
  const onScroll = () => {
    const currentY = window.scrollY || 0;
    rotation += currentY - lastY;
    lastY = currentY;
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  };
  render();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

(() => {
  const header = document.querySelector('.topbar');
  const courseCards = Array.from(document.querySelectorAll('details.course-card'));
  const teamCards = Array.from(document.querySelectorAll('details.team-card'));

  const scrollCardIntoComfortableView = (card) => {
    window.setTimeout(() => {
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const rect = card.getBoundingClientRect();
      const availableHeight = window.innerHeight - headerHeight - 24;
      const extraSpace = rect.height <= availableHeight ? Math.max(12, (availableHeight - rect.height) / 2) : 12;
      window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - headerHeight - extraSpace), behavior: 'smooth' });
    }, 70);
  };

  const directionsSection = document.getElementById('directions');
  const scrollBackToDirections = () => {
    window.setTimeout(() => {
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const top = directionsSection ? window.scrollY + directionsSection.getBoundingClientRect().top - headerHeight - 12 : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 70);
  };

  courseCards.forEach((card) => card.addEventListener('toggle', () => {
    if (card.open) {
      courseCards.forEach((other) => {
        if (other !== card && other.open) {
          other.dataset.autoClosing = 'true';
          other.open = false;
        }
      });
      scrollCardIntoComfortableView(card);
      return;
    }

    if (card.dataset.autoClosing === 'true') {
      delete card.dataset.autoClosing;
      return;
    }
    scrollBackToDirections();
  }));

  // Team cards are intentionally independent: several can stay open at once.
  teamCards.forEach((card) => card.addEventListener('toggle', () => {
    if (card.open) scrollCardIntoComfortableView(card);
  }));

  const direction = document.getElementById('direction');
  document.querySelectorAll('.course-cta[data-direction]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (direction) direction.value = link.dataset.direction || '';
      if (link.closest('summary')) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.setTimeout(() => updateFormState(), 0);
    });
  });

  const form = document.getElementById('applicationForm');
  const submit = document.getElementById('submitApplication');
  const contactMethod = document.getElementById('contact-method');
  const comment = document.getElementById('comment');
  const commentHint = document.getElementById('commentHint');
  const status = document.getElementById('formStatus');
  const applicationEndpoint = 'https://script.google.com/macros/s/AKfycbzwe7m82M30meKpxDOOy7XsPfPnPpYPuzE91GJ63Obd70AwrzlcepzUlHhAkvb1-TeI/exec';

  window.updateFormState = () => {
    if (!form || !submit) return;
    const other = contactMethod?.value === 'other';
    if (comment) comment.required = other;
    if (commentHint) commentHint.textContent = other ? 'Укажите другой способ связи' : 'Поле необязательно';
    submit.disabled = !form.checkValidity();
  };

  if (form && submit) {
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      ['input','change','blur'].forEach((eventName) => field.addEventListener(eventName, () => {
        field.setAttribute('aria-invalid', String(!field.checkValidity()));
        updateFormState();
      }));
    });
    updateFormState();
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      updateFormState();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const originalLabel = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Отправляем…';
      form.setAttribute('aria-busy', 'true');

      if (status) {
        status.textContent = 'Отправляем заявку…';
        status.classList.remove('is-success', 'is-error');
        status.classList.add('is-visible', 'is-pending');
      }

      try {
        const payload = new URLSearchParams();
        new FormData(form).forEach((value, key) => payload.append(key, String(value)));

        // Apps Script отвечает с другого домена, поэтому используем no-cors.
        // Форма уже проверена в браузере, а сервер дополнительно валидирует данные.
        await fetch(applicationEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          body: payload,
          keepalive: true
        });

        form.reset();
        form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));

        if (status) {
          status.textContent = 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
          status.classList.remove('is-pending', 'is-error');
          status.classList.add('is-visible', 'is-success');
        }
      } catch (error) {
        console.error('Не удалось отправить заявку:', error);
        if (status) {
          status.textContent = 'Не удалось отправить заявку. Проверьте подключение к интернету и попробуйте ещё раз.';
          status.classList.remove('is-pending', 'is-success');
          status.classList.add('is-visible', 'is-error');
        }
      } finally {
        form.removeAttribute('aria-busy');
        submit.textContent = originalLabel;
        updateFormState();
      }
    });
  }
})();

(() => {
  const button = document.getElementById('trustDocsToggle');
  const panel = document.getElementById('trustDocsPanel');
  const close = panel?.querySelector('.trust-docs-close');
  if (!button || !panel) return;
  const layout = button.closest('.trust-layout');
  const card = button.closest('.trust-main-card');
  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    layout?.classList.toggle('is-docs-open', open);
    if (open) {
      window.setTimeout(() => card?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  close?.addEventListener('click', () => setOpen(false));
})();

(() => {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    document.body.classList.toggle('mobile-menu-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1160) setOpen(false); });
})();

(() => {
  const banner = document.getElementById('cookieBanner');
  const accept = document.getElementById('acceptCookies');
  if (!banner || !accept) return;
  const key = 'ef_cookie_consent_v1';
  try {
    if (localStorage.getItem(key) !== 'accepted') banner.classList.add('is-visible');
  } catch (_) {
    banner.classList.add('is-visible');
  }
  accept.addEventListener('click', () => {
    try { localStorage.setItem(key, 'accepted'); } catch (_) {}
    banner.classList.remove('is-visible');
  });
})();

// Top.Mail.Ru / VK counter
var _tmr = window._tmr || (window._tmr = []);
_tmr.push({id: "3789701", type: "pageView", ecommerce: "sign_up_page", start: (new Date()).getTime()});
(function (d, w, id) {
  if (d.getElementById(id)) return;
  var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id;
  ts.src = "https://top-fwz1.mail.ru/js/code.js";
  var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);};
  if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); }
})(document, window, "tmr-code");
