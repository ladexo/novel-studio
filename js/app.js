/* ============================================
   NOVEL STUDIO — Core Application Logic
   ============================================ */

// ── Data Store Keys ──
const KEYS = {
  chapters: 'ns_chapters',
  characters: 'ns_characters',
  world: 'ns_world',
  notes: 'ns_notes',
  gallery: 'ns_gallery',
  project: 'ns_project',
};

// ── Utility ──
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function getData(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  updateStorageIndicator();
}
function getObj(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch { return {}; }
}
function setObj(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function wordCount(html) {
  const txt = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  if (!txt) return 0;
  return txt.split(/\s+/).filter(Boolean).length;
}
function charCount(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').length;
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Toast Notifications ──
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || '✓'}</span> ${escapeHtml(msg)}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Storage Indicator ──
function updateStorageIndicator() {
  let total = 0;
  for (let k in localStorage) {
    if (localStorage.hasOwnProperty(k)) total += localStorage[k].length * 2;
  }
  const kb = Math.round(total / 1024);
  const el = document.getElementById('storageUsed');
  if (el) el.textContent = kb.toLocaleString();
  const bar = document.getElementById('storageBar');
  if (bar) bar.style.width = Math.min((kb / 5120) * 100, 100) + '%';
}

// ── Navigation ──
let currentPage = 'dashboard';

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pv = document.getElementById('page-' + page);
  if (pv) pv.classList.add('active');
  const ni = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (ni) ni.classList.add('active');
  const mt = document.getElementById('mobilePageTitle');
  if (mt) mt.textContent = ni ? ni.textContent.trim().split('\n')[0].trim() : page;
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  // Refresh page content
  if (page === 'dashboard') refreshDashboard();
  if (page === 'editor') refreshChapterList();
  if (page === 'characters') refreshCharacterGrid();
  if (page === 'worldbuilding') refreshWorldEntries();
  if (page === 'notes') refreshNotes();
  if (page === 'gallery') refreshGallery();
  if (page === 'settings') loadProjectInfo();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ── Modal Control ──
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Lightbox ──
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════
function refreshDashboard() {
  const chapters = getData(KEYS.chapters);
  const characters = getData(KEYS.characters);
  const notes = getData(KEYS.notes);
  let totalWords = 0;
  chapters.forEach(ch => totalWords += wordCount(ch.content || ''));

  document.getElementById('statChapters').textContent = chapters.length;
  document.getElementById('statWords').textContent = totalWords.toLocaleString();
  document.getElementById('statChars').textContent = characters.length;
  document.getElementById('statNotes').textContent = notes.length;

  // Sidebar badges
  document.getElementById('chapterCount').textContent = chapters.length;
  document.getElementById('charCount').textContent = characters.length;
  document.getElementById('noteCount').textContent = notes.length;

  // Recent chapters
  const rc = document.getElementById('recentChapters');
  if (chapters.length === 0) {
    rc.innerHTML = `<div class="empty-state"><div class="empty-icon">✍️</div><h3>No chapters yet</h3><p>Start your first chapter to see it here.</p><button class="btn btn-primary" onclick="navigateTo('editor')">Create First Chapter</button></div>`;
    return;
  }
  const sorted = [...chapters].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 5);
  rc.innerHTML = sorted.map((ch, i) => {
    const wc = wordCount(ch.content || '');
    const statusClass = ch.status === 'complete' ? 'status-complete' : ch.status === 'progress' ? 'status-progress' : 'status-draft';
    const statusLabel = ch.status === 'complete' ? 'Complete' : ch.status === 'progress' ? 'In Progress' : 'Draft';
    return `<div class="chapter-list-item" onclick="navigateTo('editor');setTimeout(()=>selectChapter('${ch.id}'),100)">
      <div class="chapter-number">${ch.order || i + 1}</div>
      <div class="chapter-info"><h4>${escapeHtml(ch.title || 'Untitled')}</h4><div class="chapter-meta">${wc.toLocaleString()} words · ${timeAgo(ch.updated)}</div></div>
      <span class="chapter-status ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════
//  CHAPTER EDITOR
// ══════════════════════════════════════════
let activeChapterId = null;
let saveTimer = null;

function addNewChapter() {
  const chapters = getData(KEYS.chapters);
  const ch = {
    id: uid(),
    title: 'Chapter ' + (chapters.length + 1),
    content: '',
    status: 'draft',
    order: chapters.length + 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  chapters.push(ch);
  setData(KEYS.chapters, chapters);
  refreshChapterList();
  selectChapter(ch.id);
  toast('New chapter created');
}

function refreshChapterList() {
  const chapters = getData(KEYS.chapters);
  const list = document.getElementById('chapterList');
  if (chapters.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No chapters yet</div>';
    return;
  }
  list.innerHTML = chapters.sort((a, b) => a.order - b.order).map(ch => {
    const isActive = ch.id === activeChapterId;
    return `<div class="ch-item ${isActive ? 'active' : ''}" onclick="selectChapter('${ch.id}')">
      <span class="ch-num">${ch.order}</span>
      <span class="ch-title">${escapeHtml(ch.title || 'Untitled')}</span>
    </div>`;
  }).join('');
  document.getElementById('chapterCount').textContent = chapters.length;
}

function selectChapter(id) {
  activeChapterId = id;
  const chapters = getData(KEYS.chapters);
  const ch = chapters.find(c => c.id === id);
  if (!ch) return;
  document.getElementById('editorEmptyState').style.display = 'none';
  const ea = document.getElementById('editorActive');
  ea.style.display = 'flex';
  document.getElementById('editorTitle').value = ch.title || '';
  document.getElementById('editorContent').innerHTML = ch.content || '';
  updateEditorCounts();
  refreshChapterList();
  markSaved();
}

function onEditorChange() {
  markUnsaved();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 1500);
  updateEditorCounts();
}

function autoSave() {
  if (!activeChapterId) return;
  const chapters = getData(KEYS.chapters);
  const ch = chapters.find(c => c.id === activeChapterId);
  if (!ch) return;
  ch.title = document.getElementById('editorTitle').value;
  ch.content = document.getElementById('editorContent').innerHTML;
  ch.updated = new Date().toISOString();
  setData(KEYS.chapters, chapters);
  markSaved();
  refreshChapterList();
}

function markSaved() {
  document.getElementById('saveDot').classList.remove('unsaved');
  document.getElementById('saveStatus').textContent = 'Saved';
}
function markUnsaved() {
  document.getElementById('saveDot').classList.add('unsaved');
  document.getElementById('saveStatus').textContent = 'Unsaved...';
}

function updateEditorCounts() {
  const html = document.getElementById('editorContent').innerHTML;
  document.getElementById('edWordCount').textContent = wordCount(html).toLocaleString();
  document.getElementById('edCharCount').textContent = charCount(html).toLocaleString();
}

function execCmd(cmd, val = null) {
  document.execCommand(cmd, false, val);
  document.getElementById('editorContent').focus();
  onEditorChange();
}

function insertDivider() {
  document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid var(--border);margin:2em 0;">');
  onEditorChange();
}

function insertEditorImage() {
  const url = prompt('Enter image URL:');
  if (url) {
    document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%;border-radius:8px;margin:1em 0;">`);
    onEditorChange();
  }
}

// Chapter context menu / reorder / delete via right-click or long press
// We'll add a simple status toggle + delete
document.addEventListener('contextmenu', function(e) {
  const chItem = e.target.closest('.ch-item');
  if (chItem) {
    e.preventDefault();
    const id = activeChapterId;
    if (!id) return;
    const action = prompt('Type "delete" to delete this chapter, or "draft"/"progress"/"complete" to change status:');
    if (!action) return;
    const chapters = getData(KEYS.chapters);
    if (action.toLowerCase() === 'delete') {
      const idx = chapters.findIndex(c => c.id === id);
      if (idx > -1) {
        chapters.splice(idx, 1);
        // Re-order
        chapters.forEach((c, i) => c.order = i + 1);
        setData(KEYS.chapters, chapters);
        activeChapterId = null;
        document.getElementById('editorActive').style.display = 'none';
        document.getElementById('editorEmptyState').style.display = 'flex';
        refreshChapterList();
        toast('Chapter deleted');
      }
    } else if (['draft', 'progress', 'complete'].includes(action.toLowerCase())) {
      const ch = chapters.find(c => c.id === id);
      if (ch) { ch.status = action.toLowerCase(); setData(KEYS.chapters, chapters); toast('Status updated'); }
    }
  }
});

// ══════════════════════════════════════════
//  CHARACTER DATABASE
// ══════════════════════════════════════════
let editingCharId = null;
let viewingCharId = null;

function openCharModal(editId = null) {
  editingCharId = editId;
  document.getElementById('charModalTitle').textContent = editId ? 'Edit Character' : 'New Character';
  if (editId) {
    const chars = getData(KEYS.characters);
    const ch = chars.find(c => c.id === editId);
    if (ch) {
      document.getElementById('charName').value = ch.name || '';
      document.getElementById('charTitle').value = ch.title || '';
      document.getElementById('charRole').value = ch.role || 'supporting';
      document.getElementById('charAge').value = ch.age || '';
      document.getElementById('charGender').value = ch.gender || '';
      document.getElementById('charSpecies').value = ch.species || '';
      document.getElementById('charTraits').value = (ch.traits || []).join(', ');
      document.getElementById('charAbilities').value = (ch.abilities || []).join(', ');
      document.getElementById('charAppearance').value = ch.appearance || '';
      document.getElementById('charBackstory').value = ch.backstory || '';
      document.getElementById('charNotes').value = ch.notes || '';
    }
  } else {
    ['charName','charTitle','charAge','charGender','charSpecies','charTraits','charAbilities','charAppearance','charBackstory','charNotes'].forEach(id => {
      const el = document.getElementById(id);
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.getElementById('charRole').value = 'supporting';
    document.getElementById('charImage').value = '';
  }
  openModal('charModal');
}

function saveCharacter() {
  const name = document.getElementById('charName').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  const chars = getData(KEYS.characters);
  const data = {
    name,
    title: document.getElementById('charTitle').value.trim(),
    role: document.getElementById('charRole').value,
    age: document.getElementById('charAge').value.trim(),
    gender: document.getElementById('charGender').value.trim(),
    species: document.getElementById('charSpecies').value.trim(),
    traits: document.getElementById('charTraits').value.split(',').map(t => t.trim()).filter(Boolean),
    abilities: document.getElementById('charAbilities').value.split(',').map(t => t.trim()).filter(Boolean),
    appearance: document.getElementById('charAppearance').value.trim(),
    backstory: document.getElementById('charBackstory').value.trim(),
    notes: document.getElementById('charNotes').value.trim(),
    updated: new Date().toISOString(),
  };

  const fileInput = document.getElementById('charImage');
  const processImage = (imgData) => {
    if (imgData) data.image = imgData;
    if (editingCharId) {
      const idx = chars.findIndex(c => c.id === editingCharId);
      if (idx > -1) {
        if (!imgData && chars[idx].image) data.image = chars[idx].image;
        chars[idx] = { ...chars[idx], ...data };
      }
    } else {
      data.id = uid();
      data.created = new Date().toISOString();
      if (!imgData) data.image = null;
      chars.push(data);
    }
    setData(KEYS.characters, chars);
    closeModal('charModal');
    refreshCharacterGrid();
    if (viewingCharId === editingCharId && editingCharId) showCharDetail(editingCharId);
    toast(editingCharId ? 'Character updated' : 'Character created');
    editingCharId = null;
  };

  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    processImage(null);
  }
}

function refreshCharacterGrid() {
  const chars = getData(KEYS.characters);
  const grid = document.getElementById('characterGrid');
  document.getElementById('charCount').textContent = chars.length;
  if (chars.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">👤</div><h3>No characters yet</h3><p>Build your cast of characters to bring your story to life.</p><button class="btn btn-primary" onclick="openCharModal()">Create First Character</button></div>`;
    return;
  }
  grid.innerHTML = chars.map(ch => {
    const roleClass = 'role-' + (ch.role || 'minor');
    const roleLabel = (ch.role || 'minor').charAt(0).toUpperCase() + (ch.role || 'minor').slice(1);
    const avatarContent = ch.image
      ? `<img src="${ch.image}" alt="${escapeHtml(ch.name)}">`
      : getInitialEmoji(ch.name);
    return `<div class="character-card" onclick="showCharDetail('${ch.id}')">
      <div class="character-avatar">${avatarContent}<span class="character-role-badge ${roleClass}">${roleLabel}</span></div>
      <div class="character-card-body">
        <h4>${escapeHtml(ch.name)}</h4>
        ${ch.title ? `<div class="char-title">${escapeHtml(ch.title)}</div>` : ''}
        <p>${escapeHtml(ch.backstory || ch.appearance || 'No description yet.')}</p>
        <div class="character-tags">
          ${(ch.traits || []).slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

function getInitialEmoji(name) {
  const emojis = ['🗡️','🛡️','🔥','⚡','🌙','💎','🦊','🐺','🌸','👑','✨','🎭'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return emojis[Math.abs(hash) % emojis.length];
}

function showCharDetail(id) {
  viewingCharId = id;
  const chars = getData(KEYS.characters);
  const ch = chars.find(c => c.id === id);
  if (!ch) return;

  document.getElementById('charListView').style.display = 'none';
  const dv = document.getElementById('charDetailView');
  dv.classList.add('active');

  const avatarContent = ch.image
    ? `<img src="${ch.image}" alt="${escapeHtml(ch.name)}">`
    : `<span style="font-size:60px">${getInitialEmoji(ch.name)}</span>`;

  document.getElementById('charDetailContent').innerHTML = `
    <div class="char-detail-header">
      <div class="char-detail-avatar">${avatarContent}</div>
      <div class="char-detail-info">
        <h2>${escapeHtml(ch.name)}</h2>
        ${ch.title ? `<div class="char-subtitle">${escapeHtml(ch.title)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <span class="tag tag-primary">${(ch.role || 'minor').charAt(0).toUpperCase() + (ch.role || '').slice(1)}</span>
          ${ch.age ? `<span class="tag">Age: ${escapeHtml(ch.age)}</span>` : ''}
          ${ch.gender ? `<span class="tag">${escapeHtml(ch.gender)}</span>` : ''}
          ${ch.species ? `<span class="tag tag-gold">${escapeHtml(ch.species)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="char-attributes">
      ${ch.traits && ch.traits.length ? `<div class="char-attr"><div class="attr-label">Personality</div><div class="attr-value">${ch.traits.map(t=>escapeHtml(t)).join(', ')}</div></div>` : ''}
      ${ch.abilities && ch.abilities.length ? `<div class="char-attr"><div class="attr-label">Abilities</div><div class="attr-value">${ch.abilities.map(t=>escapeHtml(t)).join(', ')}</div></div>` : ''}
    </div>
    ${ch.appearance ? `<div class="char-section"><h3>👁️ Appearance</h3><p>${escapeHtml(ch.appearance)}</p></div>` : ''}
    ${ch.backstory ? `<div class="char-section"><h3>📜 Backstory</h3><p>${escapeHtml(ch.backstory)}</p></div>` : ''}
    ${ch.notes ? `<div class="char-section"><h3>📝 Notes</h3><p>${escapeHtml(ch.notes)}</p></div>` : ''}
    <div style="font-size:12px;color:var(--text-muted);margin-top:20px;">Created ${formatDate(ch.created)} · Updated ${formatDate(ch.updated)}</div>
  `;
}

function closeCharDetail() {
  viewingCharId = null;
  document.getElementById('charDetailView').classList.remove('active');
  document.getElementById('charListView').style.display = 'block';
  refreshCharacterGrid();
}

function editCurrentChar() {
  if (viewingCharId) openCharModal(viewingCharId);
}

function deleteCurrentChar() {
  if (!viewingCharId) return;
  if (!confirm('Delete this character permanently?')) return;
  let chars = getData(KEYS.characters);
  chars = chars.filter(c => c.id !== viewingCharId);
  setData(KEYS.characters, chars);
  closeCharDetail();
  toast('Character deleted');
}

function filterCharacters() {
  const q = document.getElementById('charSearch').value.toLowerCase();
  document.querySelectorAll('.character-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? '' : 'none';
  });
}

// ══════════════════════════════════════════
//  WORLDBUILDING
// ══════════════════════════════════════════
let editingWorldId = null;
let currentWorldTab = 'all';

const worldIcons = {
  location: '🗺️', magic: '✨', faction: '⚔️',
  lore: '📜', item: '🔮', creature: '🐉'
};
const worldColors = {
  location: 'var(--success)', magic: 'var(--primary)',
  faction: 'var(--danger)', lore: 'var(--accent)',
  item: 'var(--info)', creature: 'var(--success)'
};

function openWorldModal(editId = null) {
  editingWorldId = editId;
  document.getElementById('worldModalTitle').textContent = editId ? 'Edit Entry' : 'New World Entry';
  if (editId) {
    const entries = getData(KEYS.world);
    const e = entries.find(x => x.id === editId);
    if (e) {
      document.getElementById('worldName').value = e.name || '';
      document.getElementById('worldCategory').value = e.category || 'location';
      document.getElementById('worldShortDesc').value = e.shortDesc || '';
      document.getElementById('worldDesc').value = e.description || '';
      document.getElementById('worldDetail1Label').value = e.detail1Label || '';
      document.getElementById('worldDetail1Value').value = e.detail1Value || '';
      document.getElementById('worldDetail2Label').value = e.detail2Label || '';
      document.getElementById('worldDetail2Value').value = e.detail2Value || '';
      document.getElementById('worldTags').value = (e.tags || []).join(', ');
    }
  } else {
    ['worldName','worldShortDesc','worldDesc','worldDetail1Label','worldDetail1Value','worldDetail2Label','worldDetail2Value','worldTags'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('worldCategory').value = 'location';
  }
  openModal('worldModal');
}

function saveWorldEntry() {
  const name = document.getElementById('worldName').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  const entries = getData(KEYS.world);
  const data = {
    name,
    category: document.getElementById('worldCategory').value,
    shortDesc: document.getElementById('worldShortDesc').value.trim(),
    description: document.getElementById('worldDesc').value.trim(),
    detail1Label: document.getElementById('worldDetail1Label').value.trim(),
    detail1Value: document.getElementById('worldDetail1Value').value.trim(),
    detail2Label: document.getElementById('worldDetail2Label').value.trim(),
    detail2Value: document.getElementById('worldDetail2Value').value.trim(),
    tags: document.getElementById('worldTags').value.split(',').map(t => t.trim()).filter(Boolean),
    updated: new Date().toISOString(),
  };

  if (editingWorldId) {
    const idx = entries.findIndex(e => e.id === editingWorldId);
    if (idx > -1) entries[idx] = { ...entries[idx], ...data };
  } else {
    data.id = uid();
    data.created = new Date().toISOString();
    entries.push(data);
  }
  setData(KEYS.world, entries);
  closeModal('worldModal');
  refreshWorldEntries();
  toast(editingWorldId ? 'Entry updated' : 'Entry created');
  editingWorldId = null;
}

function refreshWorldEntries() {
  const entries = getData(KEYS.world);
  const container = document.getElementById('worldEntries');
  const filtered = currentWorldTab === 'all' ? entries : entries.filter(e => e.category === currentWorldTab);
  const q = (document.getElementById('worldSearch')?.value || '').toLowerCase();
  const shown = q ? filtered.filter(e => (e.name + e.description + e.shortDesc).toLowerCase().includes(q)) : filtered;

  if (shown.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🌍</div><h3>No entries found</h3><p>${currentWorldTab !== 'all' ? 'No entries in this category yet.' : 'Start building your world.'}</p><button class="btn btn-primary" onclick="openWorldModal()">Create Entry</button></div>`;
    return;
  }

  container.innerHTML = shown.map(e => {
    const icon = worldIcons[e.category] || '📄';
    const color = worldColors[e.category] || 'var(--text-muted)';
    const catLabel = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : '';
    return `<div class="world-entry" id="we-${e.id}">
      <div class="world-entry-header" onclick="toggleWorldEntry('${e.id}')">
        <div class="world-entry-icon" style="background:${color}20;color:${color}">${icon}</div>
        <div class="world-entry-title">
          <h4>${escapeHtml(e.name)}</h4>
          <span class="entry-type">${catLabel}${e.shortDesc ? ' · ' + escapeHtml(e.shortDesc) : ''}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-icon btn-sm" onclick="event.stopPropagation();openWorldModal('${e.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-sm" onclick="event.stopPropagation();deleteWorldEntry('${e.id}')" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="world-entry-body">
        <p>${escapeHtml(e.description || 'No description.')}</p>
        ${(e.detail1Label || e.detail2Label) ? `<div class="entry-details">
          ${e.detail1Label ? `<div class="char-attr"><div class="attr-label">${escapeHtml(e.detail1Label)}</div><div class="attr-value">${escapeHtml(e.detail1Value)}</div></div>` : ''}
          ${e.detail2Label ? `<div class="char-attr"><div class="attr-label">${escapeHtml(e.detail2Label)}</div><div class="attr-value">${escapeHtml(e.detail2Value)}</div></div>` : ''}
        </div>` : ''}
        ${e.tags && e.tags.length ? `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">${e.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function toggleWorldEntry(id) {
  document.getElementById('we-' + id)?.classList.toggle('expanded');
}

function deleteWorldEntry(id) {
  if (!confirm('Delete this world entry?')) return;
  let entries = getData(KEYS.world);
  entries = entries.filter(e => e.id !== id);
  setData(KEYS.world, entries);
  refreshWorldEntries();
  toast('Entry deleted');
}

function filterWorld(tab) {
  currentWorldTab = tab;
  document.querySelectorAll('.world-tab').forEach(t => t.classList.toggle('active', t.dataset.wtab === tab));
  refreshWorldEntries();
}

function filterWorldSearch() {
  refreshWorldEntries();
}

// ══════════════════════════════════════════
//  NOTES
// ══════════════════════════════════════════
let editingNoteId = null;
let currentNoteFilter = 'all';

const catColors = {
  plot: 'var(--primary)', character: 'var(--accent)',
  world: 'var(--success)', research: 'var(--info)',
  idea: 'var(--danger)', todo: '#c792ea'
};

function openNoteModal(editId = null) {
  editingNoteId = editId;
  document.getElementById('noteModalTitle').textContent = editId ? 'Edit Note' : 'New Note';
  if (editId) {
    const notes = getData(KEYS.notes);
    const n = notes.find(x => x.id === editId);
    if (n) {
      document.getElementById('noteTitle').value = n.title || '';
      document.getElementById('noteCategory').value = n.category || 'idea';
      document.getElementById('noteContent').value = n.content || '';
      document.getElementById('notePriority').value = n.priority || 'normal';
    }
  } else {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteCategory').value = 'idea';
    document.getElementById('noteContent').value = '';
    document.getElementById('notePriority').value = 'normal';
  }
  openModal('noteModal');
}

function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) { toast('Title and content are required', 'error'); return; }

  const notes = getData(KEYS.notes);
  const data = {
    title,
    category: document.getElementById('noteCategory').value,
    content,
    priority: document.getElementById('notePriority').value,
    updated: new Date().toISOString(),
  };

  if (editingNoteId) {
    const idx = notes.findIndex(n => n.id === editingNoteId);
    if (idx > -1) notes[idx] = { ...notes[idx], ...data };
  } else {
    data.id = uid();
    data.created = new Date().toISOString();
    notes.push(data);
  }
  setData(KEYS.notes, notes);
  closeModal('noteModal');
  refreshNotes();
  toast(editingNoteId ? 'Note updated' : 'Note created');
  editingNoteId = null;
}

function refreshNotes() {
  const notes = getData(KEYS.notes);
  const container = document.getElementById('notesList');
  document.getElementById('noteCount').textContent = notes.length;
  const filtered = currentNoteFilter === 'all' ? notes : notes.filter(n => n.category === currentNoteFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><h3>No notes${currentNoteFilter !== 'all' ? ' in this category' : ''}</h3><p>Create notes to keep track of ideas and details.</p><button class="btn btn-primary" onclick="openNoteModal()">Create Note</button></div>`;
    return;
  }

  container.innerHTML = filtered.sort((a, b) => new Date(b.updated) - new Date(a.updated)).map(n => {
    const catIcon = { plot: '📊', character: '👤', world: '🌍', research: '🔬', idea: '💡', todo: '✅' }[n.category] || '📝';
    const color = catColors[n.category] || 'var(--text-muted)';
    return `<div class="note-card" onclick="openNoteModal('${n.id}')">
      <h4>${catIcon} ${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.content)}</p>
      <div class="note-card-footer">
        <span style="color:${color}">${n.category ? n.category.charAt(0).toUpperCase() + n.category.slice(1) : ''}</span>
        <span>${timeAgo(n.updated)}${n.priority === 'high' ? ' · 🔴 High' : ''}</span>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();deleteNote('${n.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  let notes = getData(KEYS.notes);
  notes = notes.filter(n => n.id !== id);
  setData(KEYS.notes, notes);
  refreshNotes();
  toast('Note deleted');
}

function filterNotes(cat) {
  currentNoteFilter = cat;
  document.querySelectorAll('.category-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  refreshNotes();
}

// ══════════════════════════════════════════
//  IMAGE GALLERY
// ══════════════════════════════════════════
function handleGalleryUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  const gallery = getData(KEYS.gallery);

  let processed = 0;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      gallery.push({
        id: uid(),
        name: file.name,
        data: e.target.result,
        created: new Date().toISOString(),
        label: file.name.replace(/\.[^.]+$/, ''),
      });
      processed++;
      if (processed === files.length) {
        setData(KEYS.gallery, gallery);
        refreshGallery();
        toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
      }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function refreshGallery() {
  const gallery = getData(KEYS.gallery);
  const grid = document.getElementById('galleryGrid');
  if (gallery.length === 0) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = gallery.map(img => {
    return `<div class="gallery-item" onclick="openLightbox('${img.data.replace(/'/g, "\\'")}')">
      <img src="${img.data}" alt="${escapeHtml(img.label)}" loading="lazy">
      <div class="gallery-label">${escapeHtml(img.label)}</div>
      <button class="btn-icon btn-sm" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);" onclick="event.stopPropagation();deleteGalleryItem('${img.id}')">🗑️</button>
    </div>`;
  }).join('');
}

function deleteGalleryItem(id) {
  if (!confirm('Delete this image?')) return;
  let gallery = getData(KEYS.gallery);
  gallery = gallery.filter(g => g.id !== id);
  setData(KEYS.gallery, gallery);
  refreshGallery();
  toast('Image deleted');
}

// Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    ['dragover', 'dragenter'].forEach(evt => {
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.style.borderColor = ''; });
    });
    dropZone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (dt.files.length) {
        const input = document.getElementById('galleryUpload');
        input.files = dt.files;
        handleGalleryUpload({ target: input });
      }
    });
  }
});

// ══════════════════════════════════════════
//  SETTINGS & DATA MANAGEMENT
// ══════════════════════════════════════════
function saveProjectInfo() {
  setObj(KEYS.project, {
    title: document.getElementById('novelTitle').value,
    author: document.getElementById('authorName').value,
    synopsis: document.getElementById('novelSynopsis').value,
    genre: document.getElementById('novelGenre').value,
  });
}

function loadProjectInfo() {
  const p = getObj(KEYS.project);
  document.getElementById('novelTitle').value = p.title || '';
  document.getElementById('authorName').value = p.author || '';
  document.getElementById('novelSynopsis').value = p.synopsis || '';
  document.getElementById('novelGenre').value = p.genre || '';
}

function exportAllData() {
  const data = {
    _version: '1.0',
    _exported: new Date().toISOString(),
    project: getObj(KEYS.project),
    chapters: getData(KEYS.chapters),
    characters: getData(KEYS.characters),
    world: getData(KEYS.world),
    notes: getData(KEYS.notes),
    gallery: getData(KEYS.gallery),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novel-studio-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported successfully');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.chapters) setData(KEYS.chapters, data.chapters);
      if (data.characters) setData(KEYS.characters, data.characters);
      if (data.world) setData(KEYS.world, data.world);
      if (data.notes) setData(KEYS.notes, data.notes);
      if (data.gallery) setData(KEYS.gallery, data.gallery);
      if (data.project) setObj(KEYS.project, data.project);
      refreshDashboard();
      toast('Data imported successfully');
    } catch (err) {
      toast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function exportAsText() {
  const chapters = getData(KEYS.chapters).sort((a, b) => a.order - b.order);
  const project = getObj(KEYS.project);
  let text = '';
  if (project.title) text += project.title.toUpperCase() + '\n';
  if (project.author) text += 'by ' + project.author + '\n';
  text += '\n' + '═'.repeat(50) + '\n\n';

  chapters.forEach(ch => {
    text += `CHAPTER ${ch.order}: ${ch.title || 'Untitled'}\n`;
    text += '─'.repeat(40) + '\n\n';
    const content = ch.content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<hr[^>]*>/gi, '\n* * *\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    text += content + '\n\n\n';
  });

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || 'novel'}-manuscript.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Manuscript exported');
}

function clearAllData() {
  if (!confirm('⚠️ This will permanently delete ALL your data including chapters, characters, world entries, notes, and images. This cannot be undone.\n\nAre you sure?')) return;
  if (!confirm('Final confirmation: Delete everything?')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  refreshDashboard();
  toast('All data cleared', 'info');
}

// ══════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  // Ctrl+S — Force save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (activeChapterId) {
      autoSave();
      toast('Chapter saved');
    }
  }
  // Escape — Close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeLightbox();
  }
});

// ══════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  refreshDashboard();
  updateStorageIndicator();
});
