/* =============================================================================
   Interro — shared country picker controller (no framework, no build step)

   Mirrors the Embedded KYC UI's interaction exactly: a `.select-trigger` that
   opens a searchable, scrollable list scoped to the widget frame (not the page),
   filtered on both country name and ISO code, closing on select / Escape /
   scrim-click.

   Usage:
     document.getElementById('x').innerHTML =
       CountryPicker.trigger({ selected, placeholder: 'Select country' });

     CountryPicker.open({
       root:     modalRootEl,     // the in-frame .modalroot
       selected: state.country,   // currently chosen country object or null
       title:    'Select country',
       onSelect: (c) => { ... },
     });
   ========================================================================== */

'use strict';

window.CountryPicker = (function () {

  const SEARCH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/></svg>`;

  const chip = (code) => `<span class="ccode">${code}</span>`;

  /** The closed control. `id` lets a form wire its own click handler. */
  function trigger({ selected, placeholder = 'Select country', id = 'country-trigger', error = false }) {
    const inner = selected
      ? `${chip(selected.code)}<span>${selected.name}</span>`
      : `<span class="placeholder">${placeholder}</span>`;
    return `
      <button type="button" class="select-trigger ${error ? 'is-error' : ''}"
              id="${id}" aria-haspopup="listbox"
              aria-label="${placeholder}${selected ? `: ${selected.name}` : ''}">
        ${inner}
      </button>`;
  }

  /** The open sheet. Returns a `close()` so callers can dismiss it themselves. */
  function open({ root, selected = null, title = 'Select country', onSelect }) {
    let query = '';

    const paint = () => {
      const q = query.trim().toLowerCase();
      const list = window.COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      );

      root.querySelector('.sheet__list').innerHTML = list.length
        ? list.map((c) => `
            <button type="button" class="sheet__item ${selected && selected.code === c.code ? 'is-on' : ''}"
                    data-pick="${c.code}" role="option">
              ${chip(c.code)}<span>${c.name}</span>
            </button>`).join('')
        : `<p class="sheet__empty">No country matches “${escapeHtml(query)}”.</p>`;
    };

    root.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="sheet__panel">
          <div class="sheet__head">
            <h2>${title}</h2>
            <button type="button" class="sheet__close" aria-label="Close">✕</button>
          </div>
          <div class="sheet__search">
            ${SEARCH_ICON}
            <input type="text" placeholder="Search countries…" autocomplete="off"
                   aria-label="Search countries" />
          </div>
          <div class="sheet__list" role="listbox"></div>
        </div>
      </div>`;

    paint();

    const close = () => {
      root.innerHTML = '';
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    const input = root.querySelector('.sheet__search input');
    input.addEventListener('input', (e) => { query = e.target.value; paint(); });
    // Autofocus is right here: the list is 40 items long and typing is the
    // fastest path. Deferred a frame so the rise animation is not interrupted.
    requestAnimationFrame(() => input.focus());

    root.querySelector('.sheet__close').addEventListener('click', close);
    root.querySelector('.sheet').addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet')) close();
    });
    root.querySelector('.sheet__list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      const c = window.countryByCode(btn.dataset.pick);
      close();
      onSelect(c);
    });

    return close;
  }

  const escapeHtml = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return { trigger, open, chip };
})();
