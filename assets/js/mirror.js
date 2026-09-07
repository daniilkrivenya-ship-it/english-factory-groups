(() => {
  const GOOGLE_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbzwe7m82M30meKpxDOOy7XsPfPnPpYPuzE91GJ63Obd70AwrzlcepzUlHhAkvb1-TeI/exec';

  const MIRROR_ENDPOINT =
    'https://englishfactory.ru/api/lead.php';

  const nativeFetch = window.fetch.bind(window);

  const getUrl = (input) => {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') {
      return input.url;
    }
    return '';
  };

  const getMethod = (input, init) => {
    if (init?.method) {
      return String(init.method).toUpperCase();
    }

    if (input?.method) {
      return String(input.method).toUpperCase();
    }

    return 'GET';
  };

  const toObject = (body) => {
    if (body instanceof URLSearchParams) {
      return Object.fromEntries(body.entries());
    }

    if (typeof body === 'string') {
      return Object.fromEntries(
        new URLSearchParams(body).entries()
      );
    }

    return {};
  };

  const inferContactDetails = (contactValue) => {
    const contact = String(contactValue || '').trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneDigits =
      contact.replace(/\D/g, '');

    return {
      phone:
        phoneDigits.length >= 7
          ? contact
          : '',

      email:
        emailPattern.test(contact)
          ? contact
          : ''
    };
  };

  const createRequestId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, (char) => {
        const random = Math.random() * 16 | 0;

        const value =
          char === 'x'
            ? random
            : (random & 0x3) | 0x8;

        return value.toString(16);
      });
  };

  const wait = (ms) =>
    new Promise(
      (resolve) => window.setTimeout(resolve, ms)
    );

  const saveLeadToMysql = async (payload) => {
    let lastError = null;

    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      const controller = new AbortController();

      const timeout = window.setTimeout(
        () => controller.abort(),
        8000
      );

      try {
        const response = await nativeFetch(
          MIRROR_ENDPOINT,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
            keepalive: true
          }
        );

        const result = await response
          .json()
          .catch(() => null);

        if (
          response.ok &&
          result?.ok === true
        ) {
          return result;
        }

        const error = new Error(
          result?.error ||
          `MySQL API returned HTTP ${response.status}`
        );

        if (
          response.status >= 400 &&
          response.status < 500
        ) {
          error.noRetry = true;
          throw error;
        }

        lastError = error;

      } catch (error) {
        lastError = error;

        if (error?.noRetry) {
          throw error;
        }

      } finally {
        window.clearTimeout(timeout);
      }

      if (attempt < 3) {
        await wait(
          attempt === 1
            ? 600
            : 1500
        );
      }
    }

    throw lastError ||
      new Error(
        'Не удалось сохранить заявку в CRM.'
      );
  };

  const buildMirrorPayload = (
    googlePayload
  ) => {
    const contact =
      googlePayload.contact || '';

    const details =
      inferContactDetails(contact);

    const params =
      new URLSearchParams(
        window.location.search
      );

    return {
      request_id: createRequestId(),

      source: 'group',
      form_name: 'application',

      name:
        googlePayload.name || '',

      contact,

      phone:
        googlePayload.phone ||
        details.phone,

      email:
        googlePayload.email ||
        details.email,

      goal:
        googlePayload.direction ||
        'Группы английского языка',

      landing_url:
        window.location.href,

      referrer:
        document.referrer || '',

      utm_source:
        params.get('utm_source') || '',

      utm_medium:
        params.get('utm_medium') || '',

      utm_campaign:
        params.get('utm_campaign') || '',

      utm_content:
        params.get('utm_content') || '',

      utm_term:
        params.get('utm_term') || '',

      consent_given:
        document
          .getElementById(
            'privacyConsent'
          )
          ?.checked === true,

      consent_version:
        '2026-09-04',

      website: '',

      original_payload:
        googlePayload
    };
  };

  window.fetch = function (
    input,
    init
  ) {
    const url =
      getUrl(input);

    const method =
      getMethod(input, init);

    /*
     * Все запросы, кроме отправки формы,
     * оставляем без изменений.
     */
    if (
      url !== GOOGLE_ENDPOINT ||
      method !== 'POST'
    ) {
      return nativeFetch(
        input,
        init
      );
    }

    /*
     * Для формы групп:
     *
     * 1. сохраняем заявку в MySQL;
     * 2. при ошибке делаем retry;
     * 3. только после подтверждения
     *    запускаем существующий Google POST.
     */
    return (async () => {
      const googlePayload =
        toObject(init?.body);

      const mirrorPayload =
        buildMirrorPayload(
          googlePayload
        );

      await saveLeadToMysql(
        mirrorPayload
      );

      return nativeFetch(
        input,
        init
      );
    })();
  };
})();
