(() => {
  const GOOGLE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzwe7m82M30meKpxDOOy7XsPfPnPpYPuzE91GJ63Obd70AwrzlcepzUlHhAkvb1-TeI/exec';
  const MIRROR_ENDPOINT = 'https://englishfactory.ru/api/lead.php';
  const nativeFetch = window.fetch.bind(window);

  const getUrl = (input) => {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  };

  const getMethod = (input, init) => {
    if (init && init.method) return String(init.method).toUpperCase();
    if (input && typeof input.method === 'string') return input.method.toUpperCase();
    return 'GET';
  };

  const toObject = (body) => {
    if (body instanceof URLSearchParams) {
      return Object.fromEntries(body.entries());
    }
    if (typeof body === 'string') {
      return Object.fromEntries(new URLSearchParams(body).entries());
    }
    return {};
  };

  const inferContactDetails = (contactValue) => {
    const contact = String(contactValue || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = contact.replace(/\D/g, '');

    return {
      phone: phoneDigits.length >= 7 ? contact : '',
      email: emailPattern.test(contact) ? contact : ''
    };
  };

  const mirrorLead = (googlePayload) => {
    try {
      const contact = googlePayload.contact || '';
      const details = inferContactDetails(contact);
      const params = new URLSearchParams(window.location.search);

      const mirrorPayload = {
        source: 'group',
        form_name: 'application',
        name: googlePayload.name || '',
        contact,
        phone: googlePayload.phone || details.phone,
        email: googlePayload.email || details.email,
        goal: googlePayload.direction || 'Группы английского языка',
        landing_url: window.location.href,
        referrer: document.referrer || '',
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        utm_term: params.get('utm_term') || '',
        consent_given: document.getElementById('privacyConsent')?.checked === true,
        consent_version: '2026-09-04',
        website: '',
        original_payload: googlePayload
      };

      nativeFetch(MIRROR_ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(mirrorPayload),
        keepalive: true
      }).catch((error) => {
        console.warn('Не удалось сохранить копию заявки в резервную БД:', error);
      });
    } catch (error) {
      console.warn('Не удалось подготовить копию заявки для резервной БД:', error);
    }
  };

  window.fetch = function(input, init) {
    const url = getUrl(input);
    const method = getMethod(input, init);

    // Сначала запускаем существующий запрос без каких-либо изменений.
    const originalRequest = nativeFetch(input, init);

    // Зеркалируем только рабочий POST формы групп в Google Apps Script.
    if (url === GOOGLE_ENDPOINT && method === 'POST') {
      try {
        mirrorLead(toObject(init?.body));
      } catch (error) {
        console.warn('Не удалось запустить зеркалирование заявки:', error);
      }
    }

    return originalRequest;
  };
})();
