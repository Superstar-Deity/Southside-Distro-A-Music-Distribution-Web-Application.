(() => {
  'use strict';

  // Southside Distro keeps the app's data in one small state object. Every
  // storage operation is guarded because browser storage can be disabled/full.
  const STORAGE_KEY = 'southside-distro.releases.v1';
  const DRAFT_KEY = 'southside-distro.draft.v1';
  const THEME_KEY = 'southside-distro.theme.v1';
  // Earlier demo builds reused the dashboard photo on every sample release.
  // Replace only that known demo image; keep all artwork chosen by the user.
  const LEGACY_SHARED_COVER_ID = 'photo-1767661667474-4f2a197c9a51';
  const PLATFORMS = ['Spotify', 'Apple Music', 'YouTube Music', 'Audiomack', 'Boomplay', 'Deezer', 'Tidal', 'Amazon Music'];
  const COVERS = [
    {
      id: 'ankara-print',
      name: 'Ankara print',
      url: 'https://images.unsplash.com/photo-1768212565424-efa3a3852b81?auto=format&fit=crop&w=1200&q=80',
      fallback: '#8b3e2f'
    },
    {
      id: 'woven-lines',
      name: 'Woven lines',
      url: 'https://images.unsplash.com/photo-1720982892132-63039ca02f36?auto=format&fit=crop&w=1200&q=80',
      fallback: '#6b5639'
    },
    {
      id: 'abuja-after-dark',
      name: 'Abuja after dark',
      url: 'https://images.unsplash.com/photo-1760911372107-389fbaae7a04?auto=format&fit=crop&w=1200&q=80',
      fallback: '#28232a'
    }
  ];
  const SEED_RELEASES = [
    {
      artistName: 'Nia Sol',
      email: 'nia@example.com',
      title: 'No Be Small',
      releaseType: 'Single',
      genre: 'Afrobeats',
      releaseDate: futureDate(24),
      audioUrl: 'https://example.com/private-listen',
      platforms: ['Spotify', 'Apple Music', 'Audiomack'],
      cover: 'https://images.unsplash.com/photo-1527735095040-147bffb4cede?auto=format&fit=crop&w=1200&q=80',
      coverFallback: '#3b2631',
      reference: 'SSD-2026-01482A',
      status: 'Pending',
      createdAt: Date.now() - 3600000,
      demo: true
    },
    {
      artistName: 'Kola Grey',
      email: 'kola@example.com',
      title: 'After the Rain',
      releaseType: 'EP',
      genre: 'Afro-fusion',
      releaseDate: futureDate(48),
      audioUrl: 'https://example.com/private-listen',
      platforms: ['YouTube Music', 'Boomplay'],
      cover: 'https://images.unsplash.com/photo-1757083592189-89be488a6b4d?auto=format&fit=crop&w=1200&q=80',
      coverFallback: '#25413e',
      reference: 'SSD-2026-03B71C',
      status: 'Pending',
      createdAt: Date.now() - 86400000,
      demo: true
    },
    {
      artistName: 'Mira J',
      email: 'mira@example.com',
      title: 'Soft Landing',
      releaseType: 'Album',
      genre: 'Afro-soul',
      releaseDate: futureDate(77),
      audioUrl: 'https://example.com/private-listen',
      platforms: ['Spotify', 'Deezer', 'Tidal'],
      cover: 'https://images.unsplash.com/photo-1761207054290-6d855fce88b3?auto=format&fit=crop&w=1200&q=80',
      coverFallback: '#332f3d',
      reference: 'SSD-2026-89AC02',
      status: 'Pending',
      createdAt: Date.now() - 172800000,
      demo: true
    }
  ];
  const state = {
    releases: [],
    draft: {},
    activeView: 'dashboard',
    editingReference: null,
    selectedCover: null,
    uploadedCover: null
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $('#release-form');

  function futureDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const storage = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        console.warn(`Could not read ${key} from local storage.`, error);
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`Could not save ${key} to local storage.`, error);
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`Could not remove ${key} from local storage.`, error);
        return false;
      }
    }
  };

  function init() {
    renderPlatforms();
    renderPresets();
    restoreData();
    restoreTheme();
    setDateMinimum();
    bindEvents();
    updateClock();
    window.setInterval(updateClock, 60000);
    renderAll();
    restoreDraft();
    updateProgress();
    updatePreview();
  }

  // First visit: create a small local catalogue so the dashboard is useful immediately.
  // Later visits: use the releases already saved by this browser.
  function restoreData() {
    const saved = storage.read(STORAGE_KEY, null);
    if (Array.isArray(saved)) {
      state.releases = saved;
      refreshLegacyDemoCovers();
    }
    else {
      state.releases = structuredClone(SEED_RELEASES);
      storage.write(STORAGE_KEY, state.releases);
    }
  }

  function refreshLegacyDemoCovers() {
    let replacementIndex = 0;
    let changed = false;

    state.releases.forEach(release => {
      // Uploaded images and artwork selected by users are never changed.
      if (!release.demo || !release.cover?.includes(LEGACY_SHARED_COVER_ID)) return;

      const replacement = SEED_RELEASES[replacementIndex % SEED_RELEASES.length];
      replacementIndex += 1;
      release.cover = replacement.cover;
      release.coverFallback = replacement.coverFallback;
      changed = true;
    });

    if (changed) storage.write(STORAGE_KEY, state.releases);
  }

  function restoreTheme() {
    const theme = storage.read(THEME_KEY, 'dark');
    if (theme === 'light') document.body.classList.add('light-theme');
    updateThemeButton();
  }

  function renderPlatforms() {
    const markup = PLATFORMS.map(name => `
      <label class="platform-choice">
        <input type="checkbox" name="platforms" value="${escapeHtml(name)}">
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    $('#platform-grid').innerHTML = markup;
  }

  function renderPresets() {
    const markup = COVERS.map(cover => `
      <button
        class="preset-button"
        type="button"
        data-cover-id="${cover.id}"
        aria-label="Choose ${escapeHtml(cover.name)} cover art"
        aria-pressed="false"
      >
        <img
          src="${cover.url}"
          alt=""
          style="background-color:${cover.fallback}"
          loading="lazy"
        >
        <span>${escapeHtml(cover.name)}</span>
      </button>
    `).join('');

    $('#preset-grid').innerHTML = markup;
    $$('#preset-grid img').forEach(image => {
      image.addEventListener('error', () => {
        image.hidden = true;
        image.parentElement.style.backgroundColor = image.style.backgroundColor;
      });
    });
  }

  function bindEvents() {
    $$('[data-view-link]').forEach(button => button.addEventListener('click', () => showView(button.dataset.viewLink)));
    $$('[data-go]').forEach(button => button.addEventListener('click', () => showView(button.dataset.go)));
    form.addEventListener('input', handleFormInput);
    form.addEventListener('change', handleFormInput);
    form.addEventListener('submit', handleSubmit);
    $('#coverUpload').addEventListener('change', handleCoverUpload);
    $('#preset-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-cover-id]');
      if (!button) return;
      const cover = COVERS.find(item => item.id === button.dataset.coverId);
      if (!cover) return;
      state.selectedCover = cover;
      state.uploadedCover = null;
      $('#coverUpload').value = '';
      $$('#preset-grid [data-cover-id]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      clearError('cover');
      saveDraft(); updateProgress(); updatePreview();
    });
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#reset-demo').addEventListener('click', resetDemo);
    $('#releases-list').addEventListener('click', handleReleaseAction);
    $('#release-search').addEventListener('input', renderReleases);
    $('#type-filter').addEventListener('change', renderReleases);
    $('#sort-order').addEventListener('change', renderReleases);
    $('#close-confirm');
    $('.close-confirm').addEventListener('click', closeConfirmation);
    $('#confirm-back').addEventListener('click', closeConfirmation);
    $('#confirm-done').addEventListener('click', () => { closeConfirmation(); showView('releases'); });
    document.addEventListener('keydown', handleShortcuts);
    window.addEventListener('beforeunload', saveDraft);
  }

  function setDateMinimum() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#releaseDate').min = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  }

  function handleFormInput(event) {
    const fieldName = event.target.name;
    if (fieldName && fieldName !== 'platforms') clearError(fieldName);
    if (fieldName === 'platforms') clearError('platforms');
    saveDraft(); updateProgress(); updatePreview();
  }

  // FormData handles ordinary controls; cover art and checkbox groups are added explicitly.
  function collectFormData() {
    const values = Object.fromEntries(new FormData(form).entries());
    values.platforms = $$('input[name="platforms"]:checked', form).map(input => input.value);
    const cover = state.uploadedCover || state.selectedCover;
    values.cover = cover?.dataUrl || cover?.url || '';
    values.coverFallback = cover?.fallback || '#35372b';
    return values;
  }

  // Save on every meaningful form change so a refresh does not discard in-progress work.
  function saveDraft() {
    if (!form) return;
    const draft = collectFormData();
    if (!Object.values(draft).some(value => Array.isArray(value) ? value.length : Boolean(value))) {
      storage.remove(DRAFT_KEY); return;
    }
    if (!storage.write(DRAFT_KEY, draft)) {
      toast('Draft could not be saved. Browser storage may be full.', true);
    }
  }

  function restoreDraft() {
    const draft = storage.read(DRAFT_KEY, null);
    if (!draft || typeof draft !== 'object') return;
    Object.entries(draft).forEach(([name, value]) => {
      if (name === 'platforms' || name === 'cover' || name === 'coverFallback') return;
      const input = form.elements.namedItem(name);
      if (input && typeof value === 'string') input.value = value;
    });
    (draft.platforms || []).forEach(name => {
      const checkbox = $$('input[name="platforms"]', form).find(input => input.value === name);
      if (checkbox) checkbox.checked = true;
    });
    if (draft.cover?.startsWith('data:image/')) state.uploadedCover = { dataUrl: draft.cover, fallback: draft.coverFallback || '#35372b' };
    else state.selectedCover = COVERS.find(cover => cover.url === draft.cover) || null;
    if (state.selectedCover) {
      const button = $(`[data-cover-id="${state.selectedCover.id}"]`);
      if (button) button.setAttribute('aria-pressed', 'true');
    }
  }

  // Each of the eight required inputs plus a platform choice counts as one progress step.
  function updateProgress() {
    const data = collectFormData();
    const checks = [
      data.artistName,
      data.email,
      data.title,
      data.releaseType,
      data.genre,
      data.releaseDate,
      data.audioUrl,
      data.cover,
      data.platforms.length
    ];
    const complete = checks.filter(Boolean).length;
    const percent = Math.round(complete / checks.length * 100);
    $('#progress-text').textContent = `${percent}% complete`;
    $('#progress-bar').style.width = `${percent}%`;
    $('.progress-track').setAttribute('aria-valuenow', String(percent));
  }

  function updatePreview() {
    const data = collectFormData();
    $('#preview-artist').textContent = data.artistName?.trim() || 'ARTIST NAME';
    $('#preview-title').textContent = data.title?.trim() || 'Your release title';
    $('#preview-format').textContent = (data.releaseType || 'Single').toUpperCase();
    $('#preview-genre').textContent = (data.genre || 'GENRE').toUpperCase();
    $('#preview-date').textContent = data.releaseDate
      ? formatDate(data.releaseDate, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).toUpperCase()
      : 'RELEASE DATE';
    const art = $('#preview-art');
    const cover = state.uploadedCover?.dataUrl || state.selectedCover?.url;
    art.style.backgroundImage = cover ? `url("${cover}")` : '';
    art.style.backgroundColor = state.uploadedCover?.fallback || state.selectedCover?.fallback || '#42342b';
    $('.art-placeholder', art).hidden = Boolean(cover);
  }

  function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('cover', 'Choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showError('cover', 'That image could not be read. Try another file.');
    reader.onload = () => {
      compressImage(reader.result)
        .then(dataUrl => {
          state.uploadedCover = { dataUrl, fallback: '#493b2c' };
          state.selectedCover = null;
          $$('#preset-grid [data-cover-id]').forEach(item => {
            item.setAttribute('aria-pressed', 'false');
          });
          clearError('cover');
          saveDraft();
          updateProgress();
          updatePreview();
          toast('Artwork added and compressed for this browser.');
        })
        .catch(() => {
          showError('cover', 'Could not process that image. Try a smaller or different file.');
        });
    };
    reader.readAsDataURL(file);
  }

  // Scale large artwork down before it enters localStorage, then encode it as a compact JPEG data URL.
  function compressImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = () => reject(new Error('Image decode failed'));
      image.src = source;
    });
  }

  // The form uses novalidate so these messages stay consistent and can focus the first invalid field.
  function validate(data) {
    const errors = {};
    const required = {
      artistName: 'Artist name is required.',
      email: 'Email address is required.',
      title: 'Release title is required.',
      releaseType: 'Choose a release type.',
      genre: 'Choose a genre.',
      releaseDate: 'Choose a release date.',
      audioUrl: 'Add a link to the audio file.',
      cover: 'Choose or upload cover artwork.'
    };
    Object.entries(required).forEach(([name, message]) => {
      if (!String(data[name] || '').trim()) {
        errors[name] = message;
      }
    });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) {
      errors.email = 'Enter an email address in the format name@example.com.';
    }
    if (data.audioUrl) {
      try {
        const url = new URL(data.audioUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Audio links must use HTTP or HTTPS.');
        }
      } catch {
        errors.audioUrl = 'Enter a valid link that starts with https:// or http://.';
      }
    }
    if (data.releaseDate) {
      const selected = new Date(`${data.releaseDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(selected.getTime()) || selected <= today) {
        errors.releaseDate = 'Choose a date in the future. Tomorrow or any later date is allowed.';
      }
    }
    if (!data.platforms.length) errors.platforms = 'Choose at least one intended platform.';
    return errors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const data = collectFormData();
    const errors = validate(data);
    clearErrors();
    Object.entries(errors).forEach(([name, message]) => showError(name, message));
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      (first === 'platforms' ? $('input[name="platforms"]') : first === 'cover' ? $('#coverUpload') : form.elements.namedItem(first))?.focus();
      toast('Check the highlighted fields and try again.', true);
      return;
    }
    const editing = Boolean(state.editingReference);
    const existing = editing ? state.releases.find(item => item.reference === state.editingReference) : null;
    const record = {
      ...data,
      reference: existing?.reference || makeReference(),
      status: existing?.status || 'Pending',
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: editing ? Date.now() : undefined,
      demo: true
    };
    const index = state.releases.findIndex(item => item.reference === record.reference);
    if (index >= 0) state.releases[index] = record;
    else state.releases.unshift(record);
    if (!storage.write(STORAGE_KEY, state.releases)) {
      if (index >= 0 && existing) state.releases[index] = existing;
      else state.releases = state.releases.filter(item => item.reference !== record.reference);
      toast('Could not save this release. Browser storage may be full; try a smaller artwork image.', true);
      return;
    }
    storage.remove(DRAFT_KEY);
    showConfirmation(record, editing);
    state.editingReference = null;
    renderAll();
  }

  // Keep generating until the new code is not already present in this local catalogue.
  function makeReference() {
    let reference;
    const seen = new Set(state.releases.map(item => item.reference));
    do {
      const digits = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
      reference = `SSD-${new Date().getFullYear()}-${digits}`;
    } while (seen.has(reference));
    return reference;
  }

  function showConfirmation(release, editing) {
    $('#confirm-reference').textContent = release.reference;
    $('#confirm-title').innerHTML = editing ? 'Release <em>updated.</em>' : 'That’s in the <em>books.</em>';
    const values = [
      ['Artist', release.artistName], ['Email', release.email], ['Release', release.title], ['Type', release.releaseType], ['Genre', release.genre], ['Cover artwork', release.cover?.startsWith('data:image/') ? 'Uploaded image' : (COVERS.find(cover => cover.url === release.cover)?.name || 'Selected cover artwork')],
      ['Release date', `${formatDate(release.releaseDate, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} · ${timezoneLabel()}`],
      ['Audio link', release.audioUrl], ['Platforms', release.platforms.join(', ')], ['Status', `${release.status} · demo status`]
    ];
    $('#confirmation-details').innerHTML = values.map(([label, value]) => `<div class="detail-item"><small>${escapeHtml(label.toUpperCase())}</small><b>${escapeHtml(value)}</b></div>`).join('');
    const dialog = $('#confirmation-overlay');
    dialog.hidden = false;
    $('.close-confirm', dialog).focus();
  }

  function closeConfirmation() { $('#confirmation-overlay').hidden = true; $('#title').focus(); }

  function renderAll() { renderDashboard(); renderReleases(); $('#nav-count').textContent = String(state.releases.length); }

  function renderDashboard() {
    const typeCount = type => state.releases.filter(release => release.releaseType === type).length;
    const upcoming = state.releases.filter(release => dateIsFuture(release.releaseDate)).length;
    const stats = [
      ['TOTAL RELEASES', state.releases.length, 'In your catalogue', '▤'],
      ['SINGLES', typeCount('Single'), 'Single releases', '♫'],
      ['EPS', typeCount('EP'), 'Extended plays', '▥'],
      ['ALBUMS', typeCount('Album'), 'Full-length releases', '▦'],
      ['UPCOMING', upcoming, 'Dates still ahead', '◷']
    ];
    $('#stats-grid').innerHTML = stats.map(([label, count, caption, icon]) => `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-symbol">${icon}</span></div><strong class="stat-number">${count}</strong><span class="stat-caption">${caption}</span></article>`).join('');
    const recent = [...state.releases].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    $('#recent-list').innerHTML = recent.length ? recent.map(release => `<div class="recent-row"><div class="mini-art" style="background-image:url('${safeCssUrl(release.cover)}');background-color:${safeColor(release.coverFallback)}"></div><div><b>${escapeHtml(release.title)}</b><small>${escapeHtml(release.artistName)} · ${escapeHtml(release.releaseType)}</small></div><span class="status-badge">PENDING</span></div>`).join('') : `<div class="empty-state"><p>Your first release is waiting to be added.</p><button class="button button-acid" data-go="submit">Start a release ↗</button></div>`;
    $$('#recent-list [data-go]').forEach(button => button.addEventListener('click', () => showView('submit')));
  }

  function renderReleases() {
    if (!$('#releases-list')) return;
    const term = $('#release-search').value.trim().toLowerCase();
    const type = $('#type-filter').value;
    const sort = $('#sort-order').value;
    const items = state.releases.filter(release => {
      const haystack = [release.title, release.artistName, release.genre, release.reference, ...release.platforms].join(' ').toLowerCase();
      return (!term || haystack.includes(term)) && (type === 'all' || release.releaseType === type);
    });
    items.sort((a, b) => sort === 'date-asc' ? a.releaseDate.localeCompare(b.releaseDate) : sort === 'date-desc' ? b.releaseDate.localeCompare(a.releaseDate) : sort === 'title' ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt);
    $('#releases-list').innerHTML = items.map((release, index) => releaseCard(release, index)).join('');
    $('#empty-state').hidden = state.releases.length !== 0;
    $('#empty-state').querySelector('h2').textContent = items.length ? 'Your next release starts here.' : state.releases.length ? 'No releases match that search.' : 'Your next release starts here.';
    $('#empty-state').querySelector('p').textContent = items.length || !state.releases.length ? 'Save the details and keep your catalogue together on this device.' : 'Try another search or type filter.';
    $('#empty-state').querySelector('button').hidden = Boolean(state.releases.length);
    if (items.length) $('#empty-state').hidden = true;
    $('#nav-count').textContent = String(state.releases.length);
    $$('#releases-list img').forEach(image => image.addEventListener('error', () => { image.hidden = true; image.parentElement.style.backgroundColor = image.style.backgroundColor || '#393a2c'; }));
  }

  function releaseCard(release, index) {
    const platformTags = release.platforms
      .map(name => `<span>${escapeHtml(name)}</span>`)
      .join('');
    const formattedDate = formatDate(release.releaseDate, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const reference = escapeHtml(release.reference);

    return `
      <article
        class="release-card"
        style="animation-delay:${Math.min(index * 45, 240)}ms"
      >
        <div
          class="release-cover"
          style="background-image:url('${safeCssUrl(release.cover)}');background-color:${safeColor(release.coverFallback)}"
        >
          <span class="status-badge">
            ${escapeHtml(release.status)} · DEMO STATUS
          </span>
          <span class="release-cover-type">
            ${escapeHtml(release.releaseType.toUpperCase())}
          </span>
        </div>
        <div class="release-content">
          <div class="release-ref">
            <span>${reference}</span>
            <span>LOCAL DEMO</span>
          </div>
          <div class="release-title">${escapeHtml(release.title)}</div>
          <div class="release-artist">
            ${escapeHtml(release.artistName)} · ${escapeHtml(release.genre)}
          </div>
          <div class="release-tags">${platformTags}</div>
          <div class="release-date">
            <span>RELEASE DATE</span>
            <b>${escapeHtml(formattedDate)}</b>
          </div>
          <div class="release-actions">
            <button class="small-action" data-action="edit" data-reference="${reference}">
              Edit
            </button>
            <button class="small-action" data-action="export" data-reference="${reference}">
              Export JSON
            </button>
            <button class="small-action" data-action="print" data-reference="${reference}">
              Print receipt
            </button>
            <button class="small-action remove" data-action="remove" data-reference="${reference}">
              Remove
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function handleReleaseAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const release = state.releases.find(item => item.reference === button.dataset.reference);
    if (!release) return;
    if (button.dataset.action === 'edit') editRelease(release);
    if (button.dataset.action === 'remove') removeRelease(release);
    if (button.dataset.action === 'export') exportRelease(release);
    if (button.dataset.action === 'print') printReceipt(release);
  }

  // Editing loads the saved values back into the same form and retains the release reference.
  function editRelease(release) {
    state.editingReference = release.reference;
    state.uploadedCover = release.cover?.startsWith('data:image/') ? { dataUrl: release.cover, fallback: release.coverFallback } : null;
    state.selectedCover = COVERS.find(cover => cover.url === release.cover) || null;
    form.reset();
    Object.entries(release).forEach(([name, value]) => {
      if (['platforms', 'cover', 'coverFallback', 'reference', 'status', 'createdAt', 'updatedAt', 'demo'].includes(name)) return;
      const input = form.elements.namedItem(name);
      if (input && typeof value === 'string') input.value = value;
    });
    release.platforms.forEach(name => { const item = $$('input[name="platforms"]', form).find(input => input.value === name); if (item) item.checked = true; });
    $$('#preset-grid [data-cover-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.coverId === state.selectedCover?.id)));
    clearErrors();
    storage.remove(DRAFT_KEY);
    showView('submit'); updateProgress(); updatePreview();
    toast('Editing this local demo release. Save to keep the same reference code.');
    $('#artistName').focus();
  }

  function removeRelease(release) {
    if (!window.confirm(`Remove “${release.title}” (${release.reference}) from this browser?`)) return;
    const prior = state.releases;
    state.releases = prior.filter(item => item.reference !== release.reference);
    if (!storage.write(STORAGE_KEY, state.releases)) { state.releases = prior; toast('Could not remove the release from browser storage.', true); return; }
    renderAll(); toast('Release removed from this browser.');
  }

  // Export is an explicit user action: create a JSON file from just the selected release.
  function exportRelease(release) {
    const blob = new Blob([JSON.stringify(release, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${release.reference.toLowerCase()}.json`; link.click(); URL.revokeObjectURL(url);
    toast('Release details exported as JSON.');
  }

  function printReceipt(release) {
    const popup = window.open('', '_blank', 'width=720,height=820');
    if (!popup) { toast('Allow pop-ups to print a receipt.', true); return; }
    const details = [['Reference', release.reference], ['Artist', release.artistName], ['Email', release.email], ['Release', release.title], ['Type', release.releaseType], ['Genre', release.genre], ['Date', formatDate(release.releaseDate, { dateStyle: 'full' })], ['Platforms', release.platforms.join(', ')], ['Status', `${release.status} · demo status`], ['Audio link', release.audioUrl]];
    popup.document.write(`<!doctype html><html><head><title>Southside Distro receipt</title><style>body{font:14px Arial,sans-serif;max-width:700px;margin:48px auto;color:#191a15}h1{font:700 32px Arial;text-transform:uppercase}small{color:#555}dl{display:grid;grid-template-columns:140px 1fr;gap:12px;border-top:1px solid #bbb;padding-top:18px}dt{font-size:11px;color:#666;text-transform:uppercase}dd{margin:0;overflow-wrap:anywhere}.notice{margin-top:25px;padding:12px;border-left:4px solid #d7ff3f;background:#f4f6e7}@media print{button{display:none}}</style></head><body><small>SOUTHSIDE DISTRO · FRONT-END DEMO</small><h1>Release receipt</h1><dl>${details.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl><p class="notice">Demo only. This release has not been delivered to any music platform.</p><button onclick="window.print()">Print receipt</button></body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  }

  function showView(name) {
    if (!['dashboard', 'submit', 'releases'].includes(name)) return;
    state.activeView = name;
    $$('.view').forEach(section => { const active = section.id === `view-${name}`; section.classList.toggle('is-visible', active); section.hidden = !active; });
    $$('[data-view-link]').forEach(button => button.classList.toggle('is-active', button.dataset.viewLink === name));
    $('#current-page').textContent = name === 'dashboard' ? 'DASHBOARD' : name === 'submit' ? 'NEW RELEASE' : 'MY RELEASES';
    if (name === 'releases') renderReleases();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Avoid hijacking normal typing: shortcuts run only when focus is outside editable controls.
  function handleShortcuts(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (event.key === '1') showView('dashboard');
    if (event.key === '2') showView('submit');
    if (event.key === '3') showView('releases');
    if (event.key.toLowerCase() === 'n') { showView('submit'); $('#artistName').focus(); }
    if (event.key === '/') { event.preventDefault(); showView('releases'); $('#release-search').focus(); }
    if (event.key === 'Escape' && !$('#confirmation-overlay').hidden) closeConfirmation();
  }

  function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    storage.write(THEME_KEY, theme); updateThemeButton();
  }

  function updateThemeButton() {
    const light = document.body.classList.contains('light-theme');
    $('#theme-toggle').textContent = light ? '☾' : '☼';
    $('#theme-toggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }

  function resetDemo() {
    if (!window.confirm('Reset Southside Distro demo data? This will restore the sample releases and clear your draft in this browser.')) return;
    state.releases = structuredClone(SEED_RELEASES);
    storage.write(STORAGE_KEY, state.releases); storage.remove(DRAFT_KEY);
    form.reset(); clearErrors(); state.editingReference = null; state.selectedCover = null; state.uploadedCover = null;
    $$('#preset-grid [data-cover-id]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    setDateMinimum(); renderAll(); updateProgress(); updatePreview(); showView('dashboard'); toast('Demo data reset.');
  }

  function showError(name, message) {
    const error = $(`#error-${name}`);
    if (error) error.textContent = message;
    const field = $(`[data-field="${name}"]`);
    if (field) field.classList.add('is-invalid');
  }
  function clearError(name) {
    const error = $(`#error-${name}`); if (error) error.textContent = '';
    const field = $(`[data-field="${name}"]`); if (field) field.classList.remove('is-invalid');
  }
  function clearErrors() { ['artistName', 'email', 'title', 'releaseType', 'genre', 'releaseDate', 'audioUrl', 'cover', 'platforms'].forEach(clearError); }

  function toast(message, isError = false) {
    const item = document.createElement('div'); item.className = `toast${isError ? ' error' : ''}`; item.textContent = message;
    $('#toast-region').append(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function formatDate(value, options = {}) {
    if (!value) return '—';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function timezoneLabel() {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
    return parts.find(part => part.type === 'timeZoneName')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  function updateClock() {
    const now = new Date();
    $('#local-time').textContent = `${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now)} · ${timezoneLabel()}`;
  }

  function dateIsFuture(value) {
    const date = new Date(`${value}T00:00:00`); const today = new Date(); today.setHours(0, 0, 0, 0); return date > today;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function safeCssUrl(value) { return String(value || '').replace(/["'()\\\s]/g, ''); }
  function safeColor(value) { return /^#[0-9a-f]{3,8}$/i.test(value || '') ? value : '#35372b'; }

  init();
})();





