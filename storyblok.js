/* ══════════════════════════════════════════════════════
   STORYBLOK CMS INTEGRATION
   Space ID : 292769113353624
   ══════════════════════════════════════════════════════

   TOKEN SETUP:
   The token below is your PREVIEW token for reading content.
   Find it in Storyblok → Settings → API Keys → "Preview" token.
   ══════════════════════════════════════════════════════ */

const STORYBLOK_TOKEN   = 'r5mbUXG61jsaDv5EYqqhoQtt-180706083340793-uZPboaKmhckNqWaZsYWr';
const STORYBLOK_VERSION = 'published'; // change to 'draft' to preview unpublished changes

/* ── Fetch a single story by slug ── */
async function fetchStory(slug) {
  const url = `https://api.storyblok.com/v2/cdn/stories/${slug}?token=${STORYBLOK_TOKEN}&version=${STORYBLOK_VERSION}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.story?.content || null;
  } catch (err) {
    console.warn('[Storyblok] fetch failed, using static fallback.', err.message);
    return null;
  }
}

/* ── Render richtext field → plain HTML ── */
function renderRichtext(doc) {
  if (!doc?.content) return '';
  return doc.content.map(node => {
    if (node.type === 'paragraph') {
      const text = (node.content || []).map(n => {
        let t = esc(n.text || '');
        if (n.marks) n.marks.forEach(m => {
          if (m.type === 'bold')   t = `<strong>${t}</strong>`;
          if (m.type === 'italic') t = `<em>${t}</em>`;
          if (m.type === 'link')   t = `<a href="${esc(m.attrs?.href || '#')}">${t}</a>`;
        });
        return t;
      }).join('');
      return `<p>${text}</p>`;
    }
    if (node.type === 'bullet_list') {
      const items = (node.content || []).map(li => {
        const text = li.content?.[0]?.content?.map(n => esc(n.text || '')).join('') || '';
        return `<li>${text}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    }
    return '';
  }).join('');
}

/* ══════════════════════════════════════════════════════
   HOMEPAGE — apply Storyblok content to the page
   ══════════════════════════════════════════════════════
   In Storyblok create a Story with slug "home" and these
   block fields (see README comments below):

   hero[]        → headline (text), subtext (text), cta_label (text)
   about[]       → heading (text), body (richtext)
   services[]    → title (text), description (textarea), features (list), link (text)
   testimonials[] → quote (textarea), name (text), role (text)
   ══════════════════════════════════════════════════════ */
async function loadHomepage() {
  const content = await fetchStory('home');
  if (!content) return; // silently fall back to static HTML

  /* Hero */
  if (content.hero?.[0]) {
    const h = content.hero[0];
    setText('[data-sb="hero-title"]',    h.headline);
    setText('[data-sb="hero-subtitle"]', h.subtext);
    setText('[data-sb="hero-cta"]',      h.cta_label);
  }

  /* About */
  if (content.about?.[0]) {
    const a = content.about[0];
    setText('[data-sb="about-heading"]', a.heading);
    if (a.body) setHTML('[data-sb="about-text"]', renderRichtext(a.body));
  }

  /* Services grid */
  if (content.services?.length) {
    const grid = document.querySelector('[data-sb="services-grid"]');
    if (grid) {
      grid.innerHTML = content.services.map(s => `
        <div class="svc glass reveal">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
          ${s.features?.length ? `<ul class="svc-list">${s.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>` : ''}
          <a href="${esc(s.link||'#kontakt')}" class="svc-link">Mehr erfahren →</a>
        </div>`).join('');
      observeNewCards(grid);
    }
  }

  /* Testimonials grid */
  if (content.testimonials?.length) {
    const grid = document.querySelector('[data-sb="testi-grid"]');
    if (grid) {
      grid.innerHTML = content.testimonials.map(t => `
        <div class="testi glass reveal">
          <div class="stars">★★★★★</div>
          <p class="quote">${esc(t.quote)}</p>
          <div class="author">
            <div class="avatar">${initials(t.name)}</div>
            <div><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></div>
          </div>
        </div>`).join('');
      observeNewCards(grid);
    }
  }
}

/* ══════════════════════════════════════════════════════
   STORYBLOK VISUAL EDITOR BRIDGE
   Enables live click-to-edit inside the Storyblok editor
   ══════════════════════════════════════════════════════ */
function initBridge() {
  if (!window.location.search.includes('_storyblok')) return;
  const script = document.createElement('script');
  script.src = '//app.storyblok.com/f/storyblok-v2-latest.js';
  script.onload = () => {
    const bridge = new window.StoryblokBridge();
    bridge.on(['input','published','change'], () => loadHomepage());
  };
  document.head.appendChild(script);
}

/* ── Small helpers ── */
function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el && val != null) el.textContent = val;
}
function setHTML(sel, html) {
  const el = document.querySelector(sel);
  if (el && html) el.innerHTML = html;
}
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function initials(name) {
  return String(name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function observeNewCards(parent) {
  if (typeof revealObserver !== 'undefined') {
    parent.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hero')) {  // only run on homepage
    loadHomepage();
    initBridge();
  }
});
