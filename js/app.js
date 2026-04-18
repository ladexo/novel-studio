/* ============================================
   NOVEL STUDIO — Core Application Logic
   v2.0 — Multi-Project + Image Upload Fix
   ============================================ */

// ══════════════════════════════════════════
//  PROJECT MANAGEMENT SYSTEM
// ══════════════════════════════════════════
const PROJECTS_INDEX_KEY = 'ns_projects_index';
const ACTIVE_PROJECT_KEY = 'ns_active_project';

function getProjectsIndex() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_INDEX_KEY)) || []; }
  catch { return []; }
}
function saveProjectsIndex(list) {
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(list));
}
function getActiveProjectId() {
  let id = localStorage.getItem(ACTIVE_PROJECT_KEY);
  const projects = getProjectsIndex();
  if (!id || !projects.find(p => p.id === id)) {
    if (projects.length === 0) {
      // Migrate or create default project
      id = migrateOrCreateDefault();
    } else {
      id = projects[0].id;
    }
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }
  return id;
}
function setActiveProject(id) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

function migrateOrCreateDefault() {
  const oldChapters = safeGet('ns_chapters');
  const oldChars = safeGet('ns_characters');
  const oldWorld = safeGet('ns_world');
  const oldNotes = safeGet('ns_notes');
  const oldGallery = safeGet('ns_gallery');
  const oldProject = safeGetObj('ns_project');
  const hasOldData = oldChapters.length || oldChars.length || oldWorld.length || oldNotes.length || oldGallery.length;

  const id = uid();
  const name = (oldProject && oldProject.title) ? oldProject.title : 'My Novel';
  const projects = [{ id, name, created: new Date().toISOString() }];
  saveProjectsIndex(projects);
  setActiveProject(id);

  if (hasOldData) {
    localStorage.setItem('ns_' + id + '_chapters', JSON.stringify(oldChapters));
    localStorage.setItem('ns_' + id + '_characters', JSON.stringify(oldChars));
    localStorage.setItem('ns_' + id + '_world', JSON.stringify(oldWorld));
    localStorage.setItem('ns_' + id + '_notes', JSON.stringify(oldNotes));
    localStorage.setItem('ns_' + id + '_gallery', JSON.stringify(oldGallery));
    localStorage.setItem('ns_' + id + '_project', JSON.stringify(oldProject || {}));
    // Clean up old keys
    ['ns_chapters','ns_characters','ns_world','ns_notes','ns_gallery','ns_project'].forEach(k => localStorage.removeItem(k));
  }
  return id;
}

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function safeGetObj(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}

// ── Project-Scoped Data Keys ──
function KEYS() {
  const pid = getActiveProjectId();
  return {
    chapters: 'ns_' + pid + '_chapters',
    characters: 'ns_' + pid + '_characters',
    world: 'ns_' + pid + '_world',
    notes: 'ns_' + pid + '_notes',
    gallery: 'ns_' + pid + '_gallery',
    project: 'ns_' + pid + '_project',
  };
}

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
  t.className = 'toast toast-' + type;
  const icons = { success: '\u2713', error: '\u2717', info: '\u2139' };
  t.innerHTML = '<span>' + (icons[type] || '\u2713') + '</span> ' + escapeHtml(msg);
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

// ══════════════════════════════════════════
//  PROJECT SWITCHER UI
// ══════════════════════════════════════════
function renderProjectSwitcher() {
  const container = document.getElementById('projectSwitcher');
  const projects = getProjectsIndex();
  const activeId = getActiveProjectId();

  let html = '<select class="project-switcher-select" onchange="switchProject(this.value)">';
  projects.forEach(p => {
    html += '<option value="' + p.id + '"' + (p.id === activeId ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
  });
  html += '</select>';
  html += '<div class="project-switcher-actions">';
  html += '<button class="btn btn-secondary btn-sm" onclick="createNewProject()">+ New</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="renameCurrentProject()">Rename</button>';
  if (projects.length > 1) {
    html += '<button class="btn btn-danger btn-sm" onclick="deleteCurrentProject()">Delete</button>';
  }
  html += '</div>';
  container.innerHTML = html;
}

function switchProject(id) {
  // Save current editor state first
  if (activeChapterId) autoSave();
  activeChapterId = null;
  setActiveProject(id);
  renderProjectSwitcher();
  // Reset editor view
  document.getElementById('editorActive').style.display = 'none';
  document.getElementById('editorEmptyState').style.display = 'flex';
  // Refresh current page
  navigateTo(currentPage);
  const proj = getProjectsIndex().find(p => p.id === id);
  toast('Switched to: ' + (proj ? proj.name : 'Project'));
}

function createNewProject() {
  const name = prompt('Enter a name for your new novel project:');
  if (!name || !name.trim()) return;
  const projects = getProjectsIndex();
  const newProj = { id: uid(), name: name.trim(), created: new Date().toISOString() };
  projects.push(newProj);
  saveProjectsIndex(projects);
  switchProject(newProj.id);
  toast('Project "' + newProj.name + '" created!');
}

function renameCurrentProject() {
  const activeId = getActiveProjectId();
  const projects = getProjectsIndex();
  const proj = projects.find(p => p.id === activeId);
  if (!proj) return;
  const newName = prompt('Enter new project name:', proj.name);
  if (!newName || !newName.trim()) return;
  proj.name = newName.trim();
  saveProjectsIndex(projects);
  renderProjectSwitcher();
  toast('Project renamed to "' + proj.name + '"');
}

function deleteCurrentProject() {
  const activeId = getActiveProjectId();
  const projects = getProjectsIndex();
  if (projects.length <= 1) { toast('Cannot delete the only project', 'error'); return; }
  const proj = projects.find(p => p.id === activeId);
  if (!confirm('Delete project "' + (proj ? proj.name : '') + '" and ALL its data? This cannot be undone.')) return;
  if (!confirm('Final confirmation: Permanently delete this project?')) return;
  // Remove all data for this project
  const k = KEYS();
  Object.values(k).forEach(key => localStorage.removeItem(key));
  // Remove from index
  const updated = projects.filter(p => p.id !== activeId);
  saveProjectsIndex(updated);
  switchProject(updated[0].id);
  toast('Project deleted');
}

// ── Navigation ──
let currentPage = 'dashboard';

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pv = document.getElementById('page-' + page);
  if (pv) pv.classList.add('active');
  const ni = document.querySelector('.nav-item[data-page="' + page + '"]');
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
  const k = KEYS();
  const chapters = getData(k.chapters);
  const characters = getData(k.characters);
  const notes = getData(k.notes);
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
    rc.innerHTML = '<div class="empty-state"><div class="empty-icon">\u270D\uFE0F</div><h3>No chapters yet</h3><p>Start your first chapter to see it here.</p><button class="btn btn-primary" onclick="navigateTo(\'editor\')">Create First Chapter</button></div>';
    return;
  }
  const sorted = [...chapters].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 5);
  rc.innerHTML = sorted.map((ch, i) => {
    const wc = wordCount(ch.content || '');
    const statusClass = ch.status === 'complete' ? 'status-complete' : ch.status === 'progress' ? 'status-progress' : 'status-draft';
    const statusLabel = ch.status === 'complete' ? 'Complete' : ch.status === 'progress' ? 'In Progress' : 'Draft';
    return '<div class="chapter-list-item" onclick="navigateTo(\'editor\');setTimeout(()=>selectChapter(\'' + ch.id + '\'),100)">' +
      '<div class="chapter-number">' + (ch.order || i + 1) + '</div>' +
      '<div class="chapter-info"><h4>' + escapeHtml(ch.title || 'Untitled') + '</h4><div class="chapter-meta">' + wc.toLocaleString() + ' words \u00B7 ' + timeAgo(ch.updated) + '</div></div>' +
      '<span class="chapter-status ' + statusClass + '">' + statusLabel + '</span></div>';
  }).join('');
}

// ══════════════════════════════════════════
//  CHAPTER EDITOR
// ══════════════════════════════════════════
let activeChapterId = null;
let saveTimer = null;

function addNewChapter() {
  const k = KEYS();
  const chapters = getData(k.chapters);
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
  setData(k.chapters, chapters);
  refreshChapterList();
  selectChapter(ch.id);
  toast('New chapter created');
}

function refreshChapterList() {
  const k = KEYS();
  const chapters = getData(k.chapters);
  const list = document.getElementById('chapterList');
  if (chapters.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No chapters yet</div>';
    return;
  }
  list.innerHTML = chapters.sort((a, b) => a.order - b.order).map(ch => {
    const isActive = ch.id === activeChapterId;
    return '<div class="ch-item ' + (isActive ? 'active' : '') + '" onclick="selectChapter(\'' + ch.id + '\')">' +
      '<span class="ch-num">' + ch.order + '</span>' +
      '<span class="ch-title">' + escapeHtml(ch.title || 'Untitled') + '</span></div>';
  }).join('');
  document.getElementById('chapterCount').textContent = chapters.length;
}

function selectChapter(id) {
  activeChapterId = id;
  const k = KEYS();
  const chapters = getData(k.chapters);
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
  const k = KEYS();
  const chapters = getData(k.chapters);
  const ch = chapters.find(c => c.id === activeChapterId);
  if (!ch) return;
  ch.title = document.getElementById('editorTitle').value;
  ch.content = document.getElementById('editorContent').innerHTML;
  ch.updated = new Date().toISOString();
  setData(k.chapters, chapters);
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

function execCmd(cmd, val) {
  document.execCommand(cmd, false, val || null);
  document.getElementById('editorContent').focus();
  onEditorChange();
}

function insertDivider() {
  document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid var(--border);margin:2em 0;">');
  onEditorChange();
}

// ── FIXED: Image Upload (no more URL prompt) ──
function triggerEditorImageUpload() {
  document.getElementById('editorImageUpload').click();
}

function handleEditorImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('editorContent').focus();
    document.execCommand('insertHTML', false, '<img src="' + e.target.result + '" style="max-width:100%;border-radius:8px;margin:1em 0;">');
    onEditorChange();
    toast('Image inserted');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// Chapter context menu
document.addEventListener('contextmenu', function(e) {
  const chItem = e.target.closest('.ch-item');
  if (chItem) {
    e.preventDefault();
    const id = activeChapterId;
    if (!id) return;
    const action = prompt('Type "delete" to delete this chapter, or "draft"/"progress"/"complete" to change status:');
    if (!action) return;
    const k = KEYS();
    const chapters = getData(k.chapters);
    if (action.toLowerCase() === 'delete') {
      const idx = chapters.findIndex(c => c.id === id);
      if (idx > -1) {
        chapters.splice(idx, 1);
        chapters.forEach((c, i) => c.order = i + 1);
        setData(k.chapters, chapters);
        activeChapterId = null;
        document.getElementById('editorActive').style.display = 'none';
        document.getElementById('editorEmptyState').style.display = 'flex';
        refreshChapterList();
        toast('Chapter deleted');
      }
    } else if (['draft', 'progress', 'complete'].includes(action.toLowerCase())) {
      const ch = chapters.find(c => c.id === id);
      if (ch) { ch.status = action.toLowerCase(); setData(k.chapters, chapters); toast('Status updated'); }
    }
  }
});

// ══════════════════════════════════════════
//  CHARACTER DATABASE
// ══════════════════════════════════════════
let editingCharId = null;
let viewingCharId = null;

function openCharModal(editId) {
  editId = editId || null;
  editingCharId = editId;
  document.getElementById('charModalTitle').textContent = editId ? 'Edit Character' : 'New Character';
  if (editId) {
    const k = KEYS();
    const chars = getData(k.characters);
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

  const k = KEYS();
  const chars = getData(k.characters);
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
    setData(k.characters, chars);
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
  const k = KEYS();
  const chars = getData(k.characters);
  const grid = document.getElementById('characterGrid');
  document.getElementById('charCount').textContent = chars.length;
  if (chars.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">\uD83D\uDC64</div><h3>No characters yet</h3><p>Build your cast of characters to bring your story to life.</p><button class="btn btn-primary" onclick="openCharModal()">Create First Character</button></div>';
    return;
  }
  grid.innerHTML = chars.map(ch => {
    const roleClass = 'role-' + (ch.role || 'minor');
    const roleLabel = (ch.role || 'minor').charAt(0).toUpperCase() + (ch.role || 'minor').slice(1);
    const avatarContent = ch.image
      ? '<img src="' + ch.image + '" alt="' + escapeHtml(ch.name) + '">'
      : getInitialEmoji(ch.name);
    return '<div class="character-card" onclick="showCharDetail(\'' + ch.id + '\')">' +
      '<div class="character-avatar">' + avatarContent + '<span class="character-role-badge ' + roleClass + '">' + roleLabel + '</span></div>' +
      '<div class="character-card-body"><h4>' + escapeHtml(ch.name) + '</h4>' +
      (ch.title ? '<div class="char-title">' + escapeHtml(ch.title) + '</div>' : '') +
      '<p>' + escapeHtml(ch.backstory || ch.appearance || 'No description yet.') + '</p>' +
      '<div class="character-tags">' + (ch.traits || []).slice(0, 3).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>' +
      '</div></div>';
  }).join('');
}

function getInitialEmoji(name) {
  const emojis = ['\uD83D\uDDE1\uFE0F','\uD83D\uDEE1\uFE0F','\uD83D\uDD25','\u26A1','\uD83C\uDF19','\uD83D\uDC8E','\uD83E\uDD8A','\uD83D\uDC3A','\uD83C\uDF38','\uD83D\uDC51','\u2728','\uD83C\uDFAD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return emojis[Math.abs(hash) % emojis.length];
}

function showCharDetail(id) {
  viewingCharId = id;
  const k = KEYS();
  const chars = getData(k.characters);
  const ch = chars.find(c => c.id === id);
  if (!ch) return;

  document.getElementById('charListView').style.display = 'none';
  const dv = document.getElementById('charDetailView');
  dv.classList.add('active');

  const avatarContent = ch.image
    ? '<img src="' + ch.image + '" alt="' + escapeHtml(ch.name) + '">'
    : '<span style="font-size:60px">' + getInitialEmoji(ch.name) + '</span>';

  let detailHtml = '<div class="char-detail-header"><div class="char-detail-avatar">' + avatarContent + '</div>' +
    '<div class="char-detail-info"><h2>' + escapeHtml(ch.name) + '</h2>' +
    (ch.title ? '<div class="char-subtitle">' + escapeHtml(ch.title) + '</div>' : '') +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
    '<span class="tag tag-primary">' + ((ch.role || 'minor').charAt(0).toUpperCase() + (ch.role || '').slice(1)) + '</span>' +
    (ch.age ? '<span class="tag">Age: ' + escapeHtml(ch.age) + '</span>' : '') +
    (ch.gender ? '<span class="tag">' + escapeHtml(ch.gender) + '</span>' : '') +
    (ch.species ? '<span class="tag tag-gold">' + escapeHtml(ch.species) + '</span>' : '') +
    '</div></div></div>';

  detailHtml += '<div class="char-attributes">';
  if (ch.traits && ch.traits.length) detailHtml += '<div class="char-attr"><div class="attr-label">Personality</div><div class="attr-value">' + ch.traits.map(t => escapeHtml(t)).join(', ') + '</div></div>';
  if (ch.abilities && ch.abilities.length) detailHtml += '<div class="char-attr"><div class="attr-label">Abilities</div><div class="attr-value">' + ch.abilities.map(t => escapeHtml(t)).join(', ') + '</div></div>';
  detailHtml += '</div>';

  if (ch.appearance) detailHtml += '<div class="char-section"><h3>\uD83D\uDC41\uFE0F Appearance</h3><p>' + escapeHtml(ch.appearance) + '</p></div>';
  if (ch.backstory) detailHtml += '<div class="char-section"><h3>\uD83D\uDCDC Backstory</h3><p>' + escapeHtml(ch.backstory) + '</p></div>';
  if (ch.notes) detailHtml += '<div class="char-section"><h3>\uD83D\uDCDD Notes</h3><p>' + escapeHtml(ch.notes) + '</p></div>';
  detailHtml += '<div style="font-size:12px;color:var(--text-muted);margin-top:20px;">Created ' + formatDate(ch.created) + ' \u00B7 Updated ' + formatDate(ch.updated) + '</div>';

  document.getElementById('charDetailContent').innerHTML = detailHtml;
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
  const k = KEYS();
  let chars = getData(k.characters);
  chars = chars.filter(c => c.id !== viewingCharId);
  setData(k.characters, chars);
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

const worldIcons = { location: '\uD83D\uDDFA\uFE0F', magic: '\u2728', faction: '\u2694\uFE0F', lore: '\uD83D\uDCDC', item: '\uD83D\uDD2E', creature: '\uD83D\uDC09' };
const worldColors = { location: 'var(--success)', magic: 'var(--primary)', faction: 'var(--danger)', lore: 'var(--accent)', item: 'var(--info)', creature: 'var(--success)' };

function openWorldModal(editId) {
  editId = editId || null;
  editingWorldId = editId;
  document.getElementById('worldModalTitle').textContent = editId ? 'Edit Entry' : 'New World Entry';
  if (editId) {
    const k = KEYS();
    const entries = getData(k.world);
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
  const k = KEYS();
  const entries = getData(k.world);
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
  setData(k.world, entries);
  closeModal('worldModal');
  refreshWorldEntries();
  toast(editingWorldId ? 'Entry updated' : 'Entry created');
  editingWorldId = null;
}

function refreshWorldEntries() {
  const k = KEYS();
  const entries = getData(k.world);
  const container = document.getElementById('worldEntries');
  const filtered = currentWorldTab === 'all' ? entries : entries.filter(e => e.category === currentWorldTab);
  const q = (document.getElementById('worldSearch') ? document.getElementById('worldSearch').value : '').toLowerCase();
  const shown = q ? filtered.filter(e => (e.name + e.description + e.shortDesc).toLowerCase().includes(q)) : filtered;

  if (shown.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83C\uDF0D</div><h3>No entries found</h3><p>' + (currentWorldTab !== 'all' ? 'No entries in this category yet.' : 'Start building your world.') + '</p><button class="btn btn-primary" onclick="openWorldModal()">Create Entry</button></div>';
    return;
  }

  container.innerHTML = shown.map(e => {
    const icon = worldIcons[e.category] || '\uD83D\uDCC4';
    const color = worldColors[e.category] || 'var(--text-muted)';
    const catLabel = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : '';
    let html = '<div class="world-entry" id="we-' + e.id + '">' +
      '<div class="world-entry-header" onclick="toggleWorldEntry(\'' + e.id + '\')">' +
      '<div class="world-entry-icon" style="background:' + color + '20;color:' + color + '">' + icon + '</div>' +
      '<div class="world-entry-title"><h4>' + escapeHtml(e.name) + '</h4>' +
      '<span class="entry-type">' + catLabel + (e.shortDesc ? ' \u00B7 ' + escapeHtml(e.shortDesc) : '') + '</span></div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button class="btn-icon btn-sm" onclick="event.stopPropagation();openWorldModal(\'' + e.id + '\')" title="Edit">\u270F\uFE0F</button>' +
      '<button class="btn-icon btn-sm" onclick="event.stopPropagation();deleteWorldEntry(\'' + e.id + '\')" title="Delete">\uD83D\uDDD1\uFE0F</button>' +
      '</div></div>';
    html += '<div class="world-entry-body"><p>' + escapeHtml(e.description || 'No description.') + '</p>';
    if (e.detail1Label || e.detail2Label) {
      html += '<div class="entry-details">';
      if (e.detail1Label) html += '<div class="char-attr"><div class="attr-label">' + escapeHtml(e.detail1Label) + '</div><div class="attr-value">' + escapeHtml(e.detail1Value) + '</div></div>';
      if (e.detail2Label) html += '<div class="char-attr"><div class="attr-label">' + escapeHtml(e.detail2Label) + '</div><div class="attr-value">' + escapeHtml(e.detail2Value) + '</div></div>';
      html += '</div>';
    }
    if (e.tags && e.tags.length) html += '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">' + e.tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>';
    html += '</div></div>';
    return html;
  }).join('');
}

function toggleWorldEntry(id) {
  const el = document.getElementById('we-' + id);
  if (el) el.classList.toggle('expanded');
}

function deleteWorldEntry(id) {
  if (!confirm('Delete this world entry?')) return;
  const k = KEYS();
  let entries = getData(k.world);
  entries = entries.filter(e => e.id !== id);
  setData(k.world, entries);
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
const catColors = { plot: 'var(--primary)', character: 'var(--accent)', world: 'var(--success)', research: 'var(--info)', idea: 'var(--danger)', todo: '#c792ea' };

function openNoteModal(editId) {
  editId = editId || null;
  editingNoteId = editId;
  document.getElementById('noteModalTitle').textContent = editId ? 'Edit Note' : 'New Note';
  if (editId) {
    const k = KEYS();
    const notes = getData(k.notes);
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
  const k = KEYS();
  const notes = getData(k.notes);
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
  setData(k.notes, notes);
  closeModal('noteModal');
  refreshNotes();
  toast(editingNoteId ? 'Note updated' : 'Note created');
  editingNoteId = null;
}

function refreshNotes() {
  const k = KEYS();
  const notes = getData(k.notes);
  const container = document.getElementById('notesList');
  document.getElementById('noteCount').textContent = notes.length;
  const filtered = currentNoteFilter === 'all' ? notes : notes.filter(n => n.category === currentNoteFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCDD</div><h3>No notes' + (currentNoteFilter !== 'all' ? ' in this category' : '') + '</h3><p>Create notes to keep track of ideas and details.</p><button class="btn btn-primary" onclick="openNoteModal()">Create Note</button></div>';
    return;
  }

  container.innerHTML = filtered.sort((a, b) => new Date(b.updated) - new Date(a.updated)).map(n => {
    const catIcon = { plot: '\uD83D\uDCCA', character: '\uD83D\uDC64', world: '\uD83C\uDF0D', research: '\uD83D\uDD2C', idea: '\uD83D\uDCA1', todo: '\u2705' }[n.category] || '\uD83D\uDCDD';
    const color = catColors[n.category] || 'var(--text-muted)';
    return '<div class="note-card" onclick="openNoteModal(\'' + n.id + '\')">' +
      '<h4>' + catIcon + ' ' + escapeHtml(n.title) + '</h4>' +
      '<p>' + escapeHtml(n.content) + '</p>' +
      '<div class="note-card-footer"><span style="color:' + color + '">' + (n.category ? n.category.charAt(0).toUpperCase() + n.category.slice(1) : '') + '</span>' +
      '<span>' + timeAgo(n.updated) + (n.priority === 'high' ? ' \u00B7 \uD83D\uDD34 High' : '') + '</span>' +
      '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();deleteNote(\'' + n.id + '\')">\uD83D\uDDD1\uFE0F</button></div></div>';
  }).join('');
}

function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  const k = KEYS();
  let notes = getData(k.notes);
  notes = notes.filter(n => n.id !== id);
  setData(k.notes, notes);
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
  const k = KEYS();
  const gallery = getData(k.gallery);

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
        setData(k.gallery, gallery);
        refreshGallery();
        toast(files.length + ' image' + (files.length > 1 ? 's' : '') + ' uploaded');
      }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function refreshGallery() {
  const k = KEYS();
  const gallery = getData(k.gallery);
  const grid = document.getElementById('galleryGrid');
  if (gallery.length === 0) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = gallery.map(img => {
    return '<div class="gallery-item" onclick="openLightbox(\'' + img.data.replace(/'/g, "\\'") + '\')">' +
      '<img src="' + img.data + '" alt="' + escapeHtml(img.label) + '" loading="lazy">' +
      '<div class="gallery-label">' + escapeHtml(img.label) + '</div>' +
      '<button class="btn-icon btn-sm" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);" onclick="event.stopPropagation();deleteGalleryItem(\'' + img.id + '\')">\uD83D\uDDD1\uFE0F</button></div>';
  }).join('');
}

function deleteGalleryItem(id) {
  if (!confirm('Delete this image?')) return;
  const k = KEYS();
  let gallery = getData(k.gallery);
  gallery = gallery.filter(g => g.id !== id);
  setData(k.gallery, gallery);
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
  const k = KEYS();
  setObj(k.project, {
    title: document.getElementById('novelTitle').value,
    author: document.getElementById('authorName').value,
    synopsis: document.getElementById('novelSynopsis').value,
    genre: document.getElementById('novelGenre').value,
  });
}

function loadProjectInfo() {
  const k = KEYS();
  const p = getObj(k.project);
  document.getElementById('novelTitle').value = p.title || '';
  document.getElementById('authorName').value = p.author || '';
  document.getElementById('novelSynopsis').value = p.synopsis || '';
  document.getElementById('novelGenre').value = p.genre || '';
}

function exportAllData() {
  const k = KEYS();
  const data = {
    _version: '2.0',
    _exported: new Date().toISOString(),
    project: getObj(k.project),
    chapters: getData(k.chapters),
    characters: getData(k.characters),
    world: getData(k.world),
    notes: getData(k.notes),
    gallery: getData(k.gallery),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'novel-studio-backup-' + new Date().toISOString().slice(0,10) + '.json';
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
      const k = KEYS();
      if (data.chapters) setData(k.chapters, data.chapters);
      if (data.characters) setData(k.characters, data.characters);
      if (data.world) setData(k.world, data.world);
      if (data.notes) setData(k.notes, data.notes);
      if (data.gallery) setData(k.gallery, data.gallery);
      if (data.project) setObj(k.project, data.project);
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
  const k = KEYS();
  const chapters = getData(k.chapters).sort((a, b) => a.order - b.order);
  const project = getObj(k.project);
  let text = '';
  if (project.title) text += project.title.toUpperCase() + '\n';
  if (project.author) text += 'by ' + project.author + '\n';
  text += '\n' + '\u2550'.repeat(50) + '\n\n';

  chapters.forEach(ch => {
    text += 'CHAPTER ' + ch.order + ': ' + (ch.title || 'Untitled') + '\n';
    text += '\u2500'.repeat(40) + '\n\n';
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
  a.download = (project.title || 'novel') + '-manuscript.txt';
  a.click();
  URL.revokeObjectURL(url);
  toast('Manuscript exported');
}

function clearAllData() {
  if (!confirm('\u26A0\uFE0F This will permanently delete ALL data for the current project including chapters, characters, world entries, notes, and images. This cannot be undone.\n\nAre you sure?')) return;
  if (!confirm('Final confirmation: Delete everything in this project?')) return;
  const k = KEYS();
  Object.values(k).forEach(key => localStorage.removeItem(key));
  activeChapterId = null;
  document.getElementById('editorActive').style.display = 'none';
  document.getElementById('editorEmptyState').style.display = 'flex';
  refreshDashboard();
  toast('All project data cleared', 'info');
}

// ══════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (activeChapterId) {
      autoSave();
      toast('Chapter saved');
    }
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeLightbox();
  }
});

// ══════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  getActiveProjectId(); // Ensures migration/creation
  renderProjectSwitcher();
  refreshDashboard();
  updateStorageIndicator();
});
