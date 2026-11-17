(() => {
  const key = 'ef_hygge_theme';
  const root = document.documentElement;
  let saved = 'day';
  try { saved = localStorage.getItem(key) === 'evening' ? 'evening' : 'day'; } catch (_) {}
  root.dataset.cozyTheme = saved;
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('cozyThemeToggle');
    if (!button) return;
    const update = (theme) => {
      root.dataset.cozyTheme = theme;
      const evening = theme === 'evening';
      button.setAttribute('aria-pressed', String(evening));
      button.title = evening ? 'Вернуть дневной свет' : 'Включить уютный вечер';

    };
    update(saved);
    button.addEventListener('click', () => {
      const next = root.dataset.cozyTheme === 'evening' ? 'day' : 'evening';
      update(next);
      try { localStorage.setItem(key, next); } catch (_) {}
    });
  });
})();
