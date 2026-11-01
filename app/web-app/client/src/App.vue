<script setup>
import { computed, onMounted, ref, watch } from 'vue';

defineProps({ mode: { type: String, required: true } });
defineEmits(['toggle-mode']);

const tableDefinitions = {
  users: {
    label: 'Users',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', type: 'password' }
    ]
  },
  applicationsettings: {
    label: 'Application settings',
    fields: [
      { name: 'settingName', label: 'Setting name', required: true },
      { name: 'settingValue', label: 'Setting value' }
    ]
  },
  locations: {
    label: 'Locations',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'description', label: 'Description', multiline: true },
      { name: 'parentLocation', label: 'Parent location', type: 'number', optionsSource: 'locations' }
    ]
  },
  characters: {
    label: 'Characters',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Type', options: ['Player Character', 'DM Character', 'NPC', 'Guild', 'Military', 'Business', 'Misc'] },
      { name: 'role', label: 'Role' },
      { name: 'location', label: 'Location', type: 'number', optionsSource: 'locations' },
      { name: 'affiliation', label: 'Affiliation', type: 'number', optionsSource: 'characters' }
    ]
  },
  characterdetails: {
    label: 'Character details',
    fields: [
      { name: 'characterId', label: 'Character ID', type: 'number' },
      { name: 'charisma', label: 'Charisma', type: 'number' },
      { name: 'intelligence', label: 'Intelligence', type: 'number' },
      { name: 'wisdom', label: 'Wisdom', type: 'number' },
      { name: 'dexterity', label: 'Dexterity', type: 'number' },
      { name: 'constitution', label: 'Constitution', type: 'number' },
      { name: 'strength', label: 'Strength', type: 'number' },
      { name: 'race', label: 'Race' },
      { name: 'characterClass', label: 'Class' },
      { name: 'level', label: 'Level', type: 'number' },
      { name: 'alignment', label: 'Alignment' }
    ]
  },
  reputation: {
    label: 'Reputation',
    fields: [
      { name: 'characterId', label: 'Character ID', type: 'number' },
      { name: 'targetId', label: 'Target ID', type: 'number' },
      { name: 'adjustment', label: 'Adjustment', type: 'number' },
      { name: 'note', label: 'Note', multiline: true }
    ]
  }
};

const defaultDatabaseTableName = 'locations';
const tableName = ref(defaultDatabaseTableName);
const records = ref([]);
const form = ref(emptyForm(tableDefinitions[defaultDatabaseTableName]));
const editingId = ref(null);
const showEditorForm = ref(false);
const characterFilter = ref('');
const characterDetailsForm = ref(emptyCharacterDetailsForm());
const characterDetailsRecordId = ref(null);
const loading = ref(false);
const message = ref(null);
const authLoading = ref(true);
const authenticated = ref(false);
const authUser = ref(null);
const loginForm = ref({ identifier: '', password: '' });
const loginError = ref(null);
const resetForm = ref({ currentPassword: '', password: '', confirmation: '' });
const resetError = ref(null);
const resetLoading = ref(false);
const appName = ref('WorldBuilder');
const basePath = ref('');
const page = ref(getPageForPath(window.location.pathname));
const menuOpen = ref(false);
const userMenuOpen = ref(false);
const returnPath = ref('/');
const adminUsers = ref([]);
const selectedAdminUserId = ref(null);
const selectedAdminUserForm = ref({ name: '', email: '', username: '', password: '', canWrite: false, isAdministrator: false, mustResetPassword: false });
const appNameForm = ref('');
const baseUrlForm = ref('/');
const baseUrlLocked = ref(false);
const baseUrlSource = ref('database');
const versions = ref({ appVersion: '', dbVersion: '' });
const newUser = ref({ name: '', email: '', username: '', password: '', canWrite: false, isAdministrator: false, mustResetPassword: true });
const relatedCharacters = ref([]);
const relatedLocations = ref([]);
const relatedReputation = ref([]);
const relatedCharacterDetails = ref([]);
const relatedCharacterNotes = ref([]);
const relatedLocationNotes = ref([]);
const optionCharacters = ref([]);
const optionLocations = ref([]);
const selectedCharacterId = ref(null);
const selectedLocationId = ref(null);
const characterNoteForm = ref({ note: '' });
const locationNoteForm = ref({ note: '' });
const reputationForm = ref({ targetId: '', adjustment: '', note: '' });
const definition = computed(() => tableDefinitions[tableName.value]);
const databaseTables = computed(() => Object.entries(tableDefinitions).filter(([name]) => !['users', 'applicationsettings'].includes(name)));
const databaseTableNames = computed(() => databaseTables.value.map(([name]) => name));
const viewNavigationTableNames = ['characters', 'locations'];
const editableTableNames = ['characters', 'locations'];
const editNavigationTableNames = ['characters', 'locations'];
const editTables = computed(() => databaseTables.value.filter(([name]) => editableTableNames.includes(name)));
const viewTables = computed(() => databaseTables.value.filter(([name]) => viewNavigationTableNames.includes(name)));
const editNavigationTables = computed(() => databaseTables.value.filter(([name]) => editNavigationTableNames.includes(name)));
const tableNavigationTables = computed(() => (isEditPage.value ? editNavigationTables.value : viewTables.value));
const canWrite = computed(() => Boolean(authUser.value?.canWrite));
const isAdminPage = computed(() => page.value === 'admin');
const isEditPage = computed(() => page.value === 'edit');
const canEditCurrentTable = computed(() => editableTableNames.includes(tableName.value));
const characterDetailFields = computed(() => tableDefinitions.characterdetails.fields.filter((field) => !['id', 'characterId'].includes(field.name)));
const showCharacterDetailsFields = computed(() => (
  page.value === 'edit'
  && tableName.value === 'characters'
  && supportsCharacterDetailsType(form.value.type)
));
const characterSelectItems = computed(() => records.value.map((character) => ({
  title: `${character.id}: ${formatValue(character.name) || '(unnamed)'}`,
  value: character.id
})));
const locationSelectItems = computed(() => records.value.map((location) => ({
  title: `${location.id}: ${formatValue(location.name) || '(unnamed)'}`,
  value: location.id
})));
const filteredRecords = computed(() => {
  if (!(isEditPage.value && tableName.value === 'characters')) {
    return records.value;
  }

  const query = characterFilter.value.trim().toLowerCase();
  if (!query) {
    return records.value;
  }

  return records.value.filter((record) => {
    const searchText = [
      record.id,
      record.name,
      record.type,
      record.role,
      record.location,
      record.affiliation
    ].map((value) => formatValue(value).toLowerCase()).join(' ');
    return searchText.includes(query);
  });
});
const selectedCharacter = computed(() => records.value.find((character) => Number(character.id) === Number(selectedCharacterId.value)) || null);
const selectedLocation = computed(() => records.value.find((location) => Number(location.id) === Number(selectedLocationId.value)) || null);
const selectedCharacterDetails = computed(() => {
  if (!selectedCharacter.value) return null;
  return relatedCharacterDetails.value.find((details) => Number(details.characterId) === Number(selectedCharacter.value.id)) || null;
});
const selectedCharacterReputation = computed(() => {
  if (!selectedCharacter.value) return [];
  const selectedId = Number(selectedCharacter.value.id);
  return relatedReputation.value.filter((entry) => Number(entry.characterId) === selectedId);
});
const selectedCharacterReputationSummary = computed(() => {
  if (!selectedCharacter.value) return [];

  const selectedId = Number(selectedCharacter.value.id);
  const entries = selectedCharacterReputation.value;
  const sumsByTarget = new Map();

  entries.forEach((entry) => {
    const targetId = Number(entry.targetId);
    if (!Number.isInteger(targetId)) return;
    const current = sumsByTarget.get(targetId) || 0;
    sumsByTarget.set(targetId, current + Number(entry.adjustment || 0));
  });

  return Array.from(sumsByTarget.entries()).map(([targetId, adjustmentSum]) => {
    const target = relatedCharacters.value.find((character) => Number(character.id) === targetId);
    const score = 50 + adjustmentSum;
    return {
      targetId,
      targetName: target ? formatValue(target.name) || `(Character #${targetId})` : `(Character #${targetId})`,
      score,
      descriptor: getReputationDescriptor(score)
    };
  });
});
const selectedReputationTargetId = ref(null);
const selectedReputationEntries = computed(() => {
  if (!selectedCharacter.value || !Number.isInteger(Number(selectedReputationTargetId.value))) return [];

  const selectedId = Number(selectedCharacter.value.id);
  const targetId = Number(selectedReputationTargetId.value);
  return relatedReputation.value.filter((entry) => Number(entry.characterId) === selectedId && Number(entry.targetId) === targetId);
});
const selectedCharacterNotes = computed(() => {
  if (!selectedCharacter.value) return [];
  const selectedId = Number(selectedCharacter.value.id);
  return relatedCharacterNotes.value.filter((entry) => Number(entry.characterId) === selectedId);
});
const selectedLocationNotes = computed(() => {
  if (!selectedLocation.value) return [];
  const selectedId = Number(selectedLocation.value.id);
  return relatedLocationNotes.value.filter((entry) => Number(entry.locationId) === selectedId);
});
const selectedLocationResidents = computed(() => {
  if (!selectedLocation.value) return [];
  const selectedId = Number(selectedLocation.value.id);
  return relatedCharacters.value.filter((character) => Number(character.location) === selectedId);
});

function allowedTableNamesForPage(pageName) {
  if (pageName === 'edit') return editTables.value.map(([name]) => name);
  if (pageName === 'view') return viewTables.value.map(([name]) => name);
  return databaseTableNames.value;
}

function getNavigationLabel(name, table) {
  if (!isEditPage.value) {
    if (name === 'characters') return 'Character';
    if (name === 'locations') return 'Location';
    return table.label;
  }

  if (name === 'characters') return 'Character';
  if (name === 'locations') return 'Location';
  return table.label;
}

function supportsCharacterDetailsType(type) {
  return ['Player Character', 'DM Character', 'NPC'].includes(type);
}

function getReputationDescriptor(score) {
  if (score <= 10) return 'Hated';
  if (score <= 20) return 'Disliked';
  if (score <= 40) return 'Distrusted';
  if (score <= 59) return 'Neutral';
  if (score <= 79) return 'Trusted';
  if (score <= 90) return 'Liked';
  if (score <= 140) return 'Loved';
  return 'Worshipped';
}

function getPageForPath(path) {
  const relativePath = getRelativePath(path);
  if (relativePath === '/' || relativePath === '/character' || relativePath === '/location' || relativePath === '/view' || relativePath.startsWith('/view/')) return 'view';
  if (relativePath === '/login') return 'login';
  if (relativePath === '/reset-password') return 'reset-password';
  if (relativePath === '/admin') return 'admin';
  if (relativePath === '/edit/characters' || relativePath === '/edit/locations') return 'edit';
  return 'view';
}

function getTableFromPath(path) {
  const relativePath = getRelativePath(path);
  if (relativePath === '/' || relativePath === '/character') return 'characters';
  if (relativePath === '/location') return 'locations';
  if (relativePath === '/edit/characters') return 'characters';
  if (relativePath === '/edit/locations') return 'locations';
  const match = relativePath.match(/^\/view\/([^/]+)$/);
  if (!match) return null;
  const candidate = decodeURIComponent(match[1]);
  return databaseTableNames.value.includes(candidate) ? candidate : null;
}

function syncTableFromPath(path) {
  const currentPage = getPageForPath(path);
  const allowedTableNames = allowedTableNamesForPage(currentPage);
  const routeTable = getTableFromPath(path);
  if (routeTable && allowedTableNames.includes(routeTable)) {
    tableName.value = routeTable;
    return;
  }

  if (!allowedTableNames.includes(tableName.value)) {
    tableName.value = allowedTableNames[0] || defaultDatabaseTableName;
  }
}

function detectBasePathFromLocation() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const routeRoots = ['/login', '/reset-password', '/admin', '/edit', '/view', '/character', '/location'];

  for (const routeRoot of routeRoots) {
    if (pathname === routeRoot || pathname.startsWith(`${routeRoot}/`)) return '';

    const index = pathname.lastIndexOf(routeRoot);
    if (index > 0) {
      const suffix = pathname.slice(index);
      if (suffix === routeRoot || suffix.startsWith(`${routeRoot}/`)) {
        const prefix = pathname.slice(0, index);
        return normalizeBasePath(prefix || '/');
      }
    }
  }

  if (pathname.endsWith('/')) {
    for (const routeRoot of routeRoots) {
      if (pathname === `${routeRoot}/`) return '';
      if (pathname.endsWith(`${routeRoot}/`)) {
        const prefix = pathname.slice(0, -(routeRoot.length + 1));
      return normalizeBasePath(prefix || '/');
      }
    }
  }

  return pathname === '/' ? '' : normalizeBasePath(pathname);
}

function getRelativePath(path) {
  if (basePath.value && path.startsWith(basePath.value)) {
    const relative = path.slice(basePath.value.length);
    return relative ? (relative.startsWith('/') ? relative : `/${relative}`) : '/';
  }

  return path || '/';
}

function normalizeBasePath(value) {
  const trimmed = String(value || '/').trim();
  if (!trimmed || trimmed === '/') return '';
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized.replace(/\/$/, '');
}

function withBasePath(pathname) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${basePath.value}${path}`;
}

function routeHref(pathname) {
  return withBasePath(pathname);
}

function tablePagePath(name, targetPage = page.value) {
  if (targetPage === 'view') {
    if (name === 'characters') return '/character';
    if (name === 'locations') return '/location';
  }

  if (targetPage === 'edit') {
    if (name === 'characters') return '/edit/characters';
    if (name === 'locations') return '/edit/locations';
    return '/edit/characters';
  }

  const base = targetPage === 'edit' ? '/edit' : '/view';
  return `${base}/${encodeURIComponent(name)}`;
}

function apiUrl(name) {
  return withBasePath(`/api/${name}`);
}

function emptyForm(table) {
  return Object.fromEntries(table.fields.filter((field) => field.name !== 'id').map((field) => [field.name, '']));
}

function emptyCharacterDetailsForm() {
  return Object.fromEntries(
    tableDefinitions.characterdetails.fields
      .filter((field) => !['id', 'characterId'].includes(field.name))
      .map((field) => [field.name, ''])
  );
}

function formatValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function editableFields(table) {
  return table.fields.filter((field) => field.name !== 'id');
}

function usesSelectField(field) {
  return Boolean(field.options || field.optionsSource);
}

function resetCharacterDetailsState() {
  characterDetailsForm.value = emptyCharacterDetailsForm();
  characterDetailsRecordId.value = null;
}

async function loadCharacterDetailsForCharacter(characterId) {
  resetCharacterDetailsState();
  if (!Number.isInteger(characterId)) return;

  const response = await fetch(apiUrl('characterdetails'), { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Unable to load character details.');

  const details = await response.json();
  const match = details.find((entry) => Number(entry.characterId) === characterId);
  if (!match) return;

  characterDetailsRecordId.value = match.id;
  characterDetailsForm.value = Object.fromEntries(characterDetailFields.value.map((field) => [field.name, formatValue(match[field.name])]))
}

function hasCharacterDetailsValues() {
  return characterDetailFields.value.some((field) => formatValue(characterDetailsForm.value[field.name]).trim() !== '');
}

function getCharacterDetailsPayload(characterId) {
  const payload = { characterId };
  characterDetailFields.value.forEach((field) => {
    const value = characterDetailsForm.value[field.name];
    payload[field.name] = field.type === 'number' ? (value === '' ? null : Number(value)) : (value === '' ? null : value);
  });
  return payload;
}

async function saveCharacterDetailsForCharacter(characterId) {
  if (!supportsCharacterDetailsType(form.value.type)) return;
  if (!hasCharacterDetailsValues() && characterDetailsRecordId.value === null) return;

  const payload = getCharacterDetailsPayload(characterId);
  const endpoint = characterDetailsRecordId.value === null
    ? apiUrl('characterdetails')
    : `${apiUrl('characterdetails')}/${characterDetailsRecordId.value}`;
  const method = characterDetailsRecordId.value === null ? 'POST' : 'PUT';
  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Unable to save character details.');
  }

  const saved = await response.json().catch(() => ({}));
  if (saved?.id) {
    characterDetailsRecordId.value = saved.id;
  }
}

async function addCharacterNote() {
  if (!canWrite.value || !selectedCharacter.value) return;
  const note = String(characterNoteForm.value.note || '').trim();
  if (!note) {
    message.value = { severity: 'error', text: 'Character note is required.' };
    return;
  }

  const response = await fetch(apiUrl('characternotes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId: selectedCharacter.value.id, note })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to add character note.');
  characterNoteForm.value.note = '';
  await loadLinkedViewData();
}

async function addLocationNote() {
  if (!canWrite.value || !selectedLocation.value) return;
  const note = String(locationNoteForm.value.note || '').trim();
  if (!note) {
    message.value = { severity: 'error', text: 'Location note is required.' };
    return;
  }

  const response = await fetch(apiUrl('locationnotes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: selectedLocation.value.id, note })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to add location note.');
  locationNoteForm.value.note = '';
  await loadLinkedViewData();
}

async function addCharacterReputation() {
  if (!canWrite.value || !selectedCharacter.value) return;

  const targetId = reputationForm.value.targetId === '' ? null : Number(reputationForm.value.targetId);
  const adjustment = reputationForm.value.adjustment === '' ? null : Number(reputationForm.value.adjustment);
  const note = reputationForm.value.note === '' ? null : reputationForm.value.note;

  if (!Number.isInteger(targetId)) {
    message.value = { severity: 'error', text: 'Target character is required.' };
    return;
  }
  if (adjustment === null || Number.isNaN(adjustment)) {
    message.value = { severity: 'error', text: 'Adjustment is required.' };
    return;
  }

  const response = await fetch(apiUrl('reputation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId: selectedCharacter.value.id, targetId, adjustment, note })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to add reputation entry.');

  reputationForm.value = { targetId: '', adjustment: '', note: '' };
  await loadLinkedViewData();
}

function openReputationEntryDetails(targetId) {
  selectedReputationTargetId.value = targetId;
}

async function deleteReputationEntry(reputationId) {
  if (!canWrite.value || !Number.isInteger(Number(reputationId))) return;
  if (!window.confirm('Delete this reputation entry?')) return;

  const response = await fetch(`${apiUrl('reputation')}/${reputationId}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Unable to delete reputation entry.');
  }

  await loadLinkedViewData();
}

async function updateReputationEntry(entry) {
  if (!canWrite.value || !entry?.id) return;

  const response = await fetch(`${apiUrl('reputation')}/${entry.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characterId: entry.characterId,
      targetId: entry.targetId,
      adjustment: entry.adjustment === '' ? null : Number(entry.adjustment),
      note: entry.note === '' ? null : entry.note
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to update reputation entry.');
  await loadLinkedViewData();
}

async function goToEditCharacterFromView() {
  if (!selectedCharacter.value || !canWrite.value) return;
  await navigate('/edit/characters');
  editRecord(selectedCharacter.value);
}

async function goToEditLocationFromView() {
  if (!selectedLocation.value || !canWrite.value) return;
  await navigate('/edit/locations');
  editRecord(selectedLocation.value);
}

function getFieldOptions(field) {
  if (field.optionsSource === 'characters') {
    const source = tableName.value === 'characters' ? records.value : optionCharacters.value;
    return source.map((character) => ({
      title: `${character.id}: ${formatValue(character.name) || '(unnamed)'}`,
      value: character.id
    }));
  }

  if (field.optionsSource === 'locations') {
    const source = tableName.value === 'locations' ? records.value : optionLocations.value;
    return source
      .filter((location) => !(tableName.value === 'locations' && editingId.value !== null && Number(location.id) === Number(editingId.value)))
      .map((location) => ({
        title: `${location.id}: ${formatValue(location.name) || '(unnamed)'}`,
        value: location.id
      }));
  }

  return field.options || [];
}

async function loadOptionLookups() {
  const [charactersResponse, locationsResponse] = await Promise.all([
    fetch(apiUrl('characters'), { credentials: 'same-origin' }),
    fetch(apiUrl('locations'), { credentials: 'same-origin' })
  ]);

  if (!charactersResponse.ok || !locationsResponse.ok) {
    throw new Error('Unable to load linked option data.');
  }

  optionCharacters.value = await charactersResponse.json();
  optionLocations.value = await locationsResponse.json();
}

async function navigate(path, { replace = false } = {}) {
  const fullPath = withBasePath(path);
  if (replace) window.history.replaceState({}, '', fullPath);
  else window.history.pushState({}, '', fullPath);
  syncTableFromPath(fullPath);
  page.value = getPageForPath(fullPath);
  menuOpen.value = false;
  if (page.value === 'admin') await loadAdminData();
  else if (page.value === 'view' || page.value === 'edit') await loadRecords();
}

function setRoute(path, { replace = false } = {}) {
  const fullPath = withBasePath(path);
  if (replace) window.history.replaceState({}, '', fullPath);
  else window.history.pushState({}, '', fullPath);
  syncTableFromPath(fullPath);
  page.value = getPageForPath(fullPath);
}

async function resolveRoute() {
  const path = getRelativePath(window.location.pathname);
  if (path === '/login') {
    setRoute('/login');
    return;
  }
  if (path === '/reset-password') {
    setRoute('/reset-password');
    return;
  }
  if (path === '/admin') {
    if (!authUser.value.isAdministrator) {
      setRoute('/');
      await loadRecords();
      return;
    }
    setRoute('/admin');
    await loadAdminData();
    return;
  }

  if (path === '/edit/characters' || path === '/edit/locations') {
    if (!authUser.value?.canWrite) {
      setRoute('/');
      await loadRecords();
      return;
    }

    setRoute(path);
    await loadRecords();
    return;
  }

  if (path === '/' || path === '/character' || path === '/location' || path === '/view' || path.startsWith('/view/')) {
    setRoute(path === '/view' ? '/' : path);
    await loadRecords();
    return;
  }

  setRoute('/');
  await loadRecords();
}

async function navigateFromUser(path) {
  if (path === '/admin' && !authUser.value?.isAdministrator) return;
  await navigate(path);
}

async function navigateFromMenu(path) {
  if (path === '/admin' && !authUser.value?.isAdministrator) return;
  if (path === '/edit/characters' && !canWrite.value) return;
  await navigate(path);
}

function isPlainLeftClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

async function navigateFromLink(event, path, options = {}) {
  if (!isPlainLeftClick(event)) return;

  const { requireAdmin = false, requireWrite = false } = options;
  if (requireAdmin && !authUser.value?.isAdministrator) {
    event.preventDefault();
    return;
  }

  if (requireWrite && !canWrite.value) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  await navigate(path);
}

/*
 * Keep route changes explicit so loading a page never starts another auth
 * initialization cycle.
 */
function legacyNavigate(path) {
  window.history.pushState({}, '', path);
  page.value = path === '/admin' ? 'admin' : 'view';
  if (path === '/admin') loadAdminData();
  else loadRecords();
}

async function loadRecords() {
  const visibleTables = allowedTableNamesForPage(page.value).map((name) => [name, tableDefinitions[name]]);
  if (!visibleTables.some(([name]) => name === tableName.value)) {
    tableName.value = visibleTables[0]?.[0] || defaultDatabaseTableName;
  }
  if (!tableName.value) {
    records.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await fetch(apiUrl(tableName.value), { credentials: 'same-origin' });
    if (response.status === 401) {
      authenticated.value = false;
      return;
    }
    if (!response.ok) throw new Error('Unable to load records.');
    records.value = await response.json();
    await loadOptionLookups();
    await loadLinkedViewData();
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  } finally {
    loading.value = false;
  }
}

function clearLinkedViewData() {
  relatedCharacters.value = [];
  relatedLocations.value = [];
  relatedReputation.value = [];
  relatedCharacterDetails.value = [];
  relatedCharacterNotes.value = [];
  relatedLocationNotes.value = [];
}

async function loadLinkedViewData() {
  if (!(page.value === 'view' && ['characters', 'locations'].includes(tableName.value))) {
    clearLinkedViewData();
    return;
  }

  const [charactersResponse, locationsResponse, reputationResponse, detailsResponse, characterNotesResponse, locationNotesResponse] = await Promise.all([
    fetch(apiUrl('characters'), { credentials: 'same-origin' }),
    fetch(apiUrl('locations'), { credentials: 'same-origin' }),
    fetch(apiUrl('reputation'), { credentials: 'same-origin' }),
    fetch(apiUrl('characterdetails'), { credentials: 'same-origin' }),
    fetch(apiUrl('characternotes'), { credentials: 'same-origin' }),
    fetch(apiUrl('locationnotes'), { credentials: 'same-origin' })
  ]);

  if (!charactersResponse.ok || !locationsResponse.ok || !reputationResponse.ok || !detailsResponse.ok || !characterNotesResponse.ok || !locationNotesResponse.ok) {
    throw new Error('Unable to load linked view data.');
  }

  relatedCharacters.value = await charactersResponse.json();
  relatedLocations.value = await locationsResponse.json();
  relatedReputation.value = await reputationResponse.json();
  relatedCharacterDetails.value = await detailsResponse.json();
  relatedCharacterNotes.value = await characterNotesResponse.json();
  relatedLocationNotes.value = await locationNotesResponse.json();

  if (tableName.value === 'characters') {
    const firstCharacterId = relatedCharacters.value[0]?.id ?? null;
    if (!selectedCharacterId.value || !relatedCharacters.value.some((character) => Number(character.id) === Number(selectedCharacterId.value))) {
      selectedCharacterId.value = firstCharacterId;
    }
  }

  if (tableName.value === 'locations') {
    const firstLocationId = relatedLocations.value[0]?.id ?? null;
    if (!selectedLocationId.value || !relatedLocations.value.some((location) => Number(location.id) === Number(selectedLocationId.value))) {
      selectedLocationId.value = firstLocationId;
    }
  }
}

async function initializeAuth() {
  try {
    basePath.value = detectBasePathFromLocation();
    const appNameResponse = await fetch(apiUrl('auth/appname'));
    if (appNameResponse.ok) {
      appName.value = (await appNameResponse.json()).appName;
      document.title = appName.value;
    }

    const currentRelativePath = getRelativePath(window.location.pathname);
    const requestedPath = currentRelativePath === '/login' ? '/' : currentRelativePath;
    const queryReturn = new URLSearchParams(window.location.search).get('return');
    returnPath.value = queryReturn === '/admin' || requestedPath === '/admin' ? '/admin' : '/';
    const response = await fetch(apiUrl('auth/me'), { credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      authUser.value = result.user;
      authenticated.value = true;
      if (authUser.value.mustResetPassword) {
        setRoute('/reset-password');
      } else if (pathWithBase('/login') === window.location.pathname) {
        setRoute('/');
        await resolveRoute();
      } else {
        await resolveRoute();
      }
    } else {
      page.value = 'login';
      if (window.location.pathname !== pathWithBase('/login')) {
        returnPath.value = window.location.pathname === '/admin' ? '/admin' : '/';
        window.history.replaceState({}, '', `${withBasePath('/login')}?return=${encodeURIComponent(returnPath.value)}`);
      }
    }
  } finally {
    authLoading.value = false;
  }
}

function pathWithBase(path) {
  return withBasePath(path);
}

async function resetPassword() {
  resetError.value = null;
  if (!resetForm.value.currentPassword) {
    resetError.value = 'Current password is required.';
    return;
  }
  if (resetForm.value.password !== resetForm.value.confirmation) {
    resetError.value = 'Passwords do not match.';
    return;
  }
  resetLoading.value = true;
  try {
    const response = await fetch(apiUrl('auth/reset-password'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: resetForm.value.currentPassword, password: resetForm.value.password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to reset password.');
    authUser.value = { ...authUser.value, mustResetPassword: false };
    resetForm.value = { currentPassword: '', password: '', confirmation: '' };
    await navigate('/', { replace: true });
  } catch (error) {
    resetError.value = error.message;
  } finally {
    resetLoading.value = false;
  }
}

async function loadAdminData() {
  const [usersResponse, settingResponse] = await Promise.all([
    fetch(apiUrl('admin/users')), fetch(apiUrl('admin/settings/appname'))
  ]);
  if (!usersResponse.ok || !settingResponse.ok) throw new Error('Unable to load administrator data.');
  adminUsers.value = await usersResponse.json();
  const versionsResponse = await fetch(apiUrl('admin/settings/versions'));
  if (versionsResponse.ok) {
    versions.value = await versionsResponse.json();
  }
  const baseUrlResponse = await fetch(apiUrl('admin/settings/baseurl'));
  if (baseUrlResponse.ok) {
    const baseUrl = await baseUrlResponse.json();
    baseUrlForm.value = baseUrl.baseUrl || '/';
    baseUrlLocked.value = Boolean(baseUrl.locked);
    baseUrlSource.value = baseUrl.source || 'database';
  }
  if (selectedAdminUserId.value !== null) {
    const selectedUser = adminUsers.value.find((user) => user.id === selectedAdminUserId.value);
    if (selectedUser) {
      selectedAdminUserForm.value = {
        name: selectedUser.name || '',
        email: selectedUser.email || '',
        username: selectedUser.username || '',
        password: '',
        canWrite: Boolean(selectedUser.canWrite),
        isAdministrator: Boolean(selectedUser.isAdministrator),
        mustResetPassword: Boolean(selectedUser.mustResetPassword)
      };
    } else {
      selectedAdminUserId.value = null;
    }

async function saveBaseUrl() {
  if (baseUrlLocked.value) return;
  const response = await fetch(apiUrl('admin/settings/baseurl'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl: baseUrlForm.value })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to save base URL.');
  baseUrlForm.value = result.baseUrl || '/';
  message.value = { severity: 'success', text: 'Base URL saved. Restart required to apply route prefix changes.' };
}
  }
  appNameForm.value = (await settingResponse.json()).appName;
}

async function saveAppName() {
  const response = await fetch(apiUrl('admin/settings/appname'), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName: appNameForm.value })
  });
  if (!response.ok) throw new Error('Unable to save application name.');
  appName.value = appNameForm.value;
  document.title = appName.value;
}

async function createUser() {
  const response = await fetch(apiUrl('admin/users'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser.value)
  });
  if (!response.ok) throw new Error('Unable to create user.');
  newUser.value = { name: '', email: '', username: '', password: '', canWrite: false, isAdministrator: false, mustResetPassword: true };
  await loadAdminData();
}

async function updateUser(user) {
  const response = await fetch(`${apiUrl('admin/users')}/${user.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canWrite: user.canWrite, isAdministrator: user.isAdministrator, mustResetPassword: user.mustResetPassword })
  });
  if (!response.ok) throw new Error('Unable to update user.');
}

function selectAdminUser(event) {
  const id = Number(event.target.value);
  if (!Number.isInteger(id)) {
    selectedAdminUserId.value = null;
    return;
  }

  const user = adminUsers.value.find((entry) => entry.id === id);
  if (!user) {
    selectedAdminUserId.value = null;
    return;
  }

  selectedAdminUserId.value = id;
  selectedAdminUserForm.value = {
    name: user.name || '',
    email: user.email || '',
    username: user.username || '',
    password: '',
    canWrite: Boolean(user.canWrite),
    isAdministrator: Boolean(user.isAdministrator),
    mustResetPassword: Boolean(user.mustResetPassword)
  };
}

async function saveSelectedAdminUser() {
  if (selectedAdminUserId.value === null) return;
  const payload = {
    name: selectedAdminUserForm.value.name,
    email: selectedAdminUserForm.value.email,
    username: selectedAdminUserForm.value.username || null,
    canWrite: selectedAdminUserForm.value.canWrite,
    isAdministrator: selectedAdminUserForm.value.isAdministrator,
    mustResetPassword: selectedAdminUserForm.value.mustResetPassword
  };
  if (selectedAdminUserForm.value.password) {
    payload.password = selectedAdminUserForm.value.password;
  }
  const response = await fetch(`${apiUrl('admin/users')}/${selectedAdminUserId.value}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Unable to update user.');
  selectedAdminUserForm.value.password = '';
  await loadAdminData();
}

async function deleteUser(user) {
  if (!window.confirm(`Delete ${user.email}?`)) return;
  const response = await fetch(`${apiUrl('admin/users')}/${user.id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Unable to delete user.');
  if (selectedAdminUserId.value === user.id) {
    selectedAdminUserId.value = null;
  }
  await loadAdminData();
}

async function login() {
  loginError.value = null;
  try {
    const response = await fetch(apiUrl('auth/login'), {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm.value)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
    authUser.value = result.user;
    authenticated.value = true;
    loginForm.value.password = '';
    if (authUser.value.mustResetPassword) {
      setRoute('/reset-password');
    } else {
      await navigate('/');
    }
  } catch (error) {
    loginError.value = error.message;
  }
}

async function logout() {
  userMenuOpen.value = false;
  await fetch(apiUrl('auth/logout'), { method: 'POST', credentials: 'same-origin' });
  authenticated.value = false;
  authUser.value = null;
  records.value = [];
  returnPath.value = '/';
  setRoute('/login');
}

async function openChangePassword() {
  userMenuOpen.value = false;
  resetError.value = null;
  resetForm.value = { currentPassword: '', password: '', confirmation: '' };
  await navigate('/reset-password');
}

watch(tableName, () => {
  form.value = emptyForm(definition.value);
  editingId.value = null;
  showEditorForm.value = false;
  characterFilter.value = '';
  resetCharacterDetailsState();
  if (authenticated.value && !isAdminPage.value) loadRecords();
});

function startAddRecord() {
  if (!canWrite.value) return;
  editingId.value = null;
  form.value = emptyForm(definition.value);
  if (tableName.value === 'characters') {
    resetCharacterDetailsState();
  }
  showEditorForm.value = true;
}

async function saveRecord() {
  if (!canWrite.value || !canEditCurrentTable.value) return;
  const payload = {};
  definition.value.fields.forEach((field) => {
    if (field.name === 'id') return;
    const value = form.value[field.name];
    payload[field.name] = field.type === 'number' ? (value === '' ? null : Number(value)) : (value === '' ? null : value);
  });
  try {
    const existingEditingId = editingId.value;
    const response = await fetch(editingId.value === null ? apiUrl(tableName.value) : `${apiUrl(tableName.value)}/${editingId.value}`, {
      method: editingId.value === null ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Unable to save record.');
    }
    const record = await response.json().catch(() => ({}));
    if (tableName.value === 'characters') {
      const characterId = Number(record.id ?? existingEditingId);
      if (Number.isInteger(characterId)) {
        await saveCharacterDetailsForCharacter(characterId);
      }
    }
    message.value = { severity: 'success', text: existingEditingId === null ? 'Record created.' : 'Record updated.' };
    form.value = emptyForm(definition.value);
    editingId.value = null;
    showEditorForm.value = false;
    resetCharacterDetailsState();
    await loadRecords();
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  }
}

function editRecord(record) {
  if (!canWrite.value || !canEditCurrentTable.value) return;
  editingId.value = record.id;
  form.value = Object.fromEntries(editableFields(definition.value).map((field) => [field.name, formatValue(record[field.name])]));
  if (tableName.value === 'characters') {
    const characterId = Number(record.id);
    if (Number.isInteger(characterId)) {
      loadCharacterDetailsForCharacter(characterId).catch((error) => {
        message.value = { severity: 'error', text: error.message };
      });
    }
  }
  showEditorForm.value = true;
}

async function editRecordFromView(record) {
  if (!canWrite.value || !canEditCurrentTable.value) return;
  await navigate(tablePagePath(tableName.value, 'edit'));
  editRecord(record);
}

async function deleteRecord(id) {
  if (!canWrite.value || !canEditCurrentTable.value || !window.confirm('Delete this record?')) return;
  try {
    const response = await fetch(`${apiUrl(tableName.value)}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Unable to delete record.');
    await loadRecords();
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  }
}

function cancelEdit() {
  editingId.value = null;
  form.value = emptyForm(definition.value);
  showEditorForm.value = false;
  resetCharacterDetailsState();
}

onMounted(() => {
  window.addEventListener('popstate', () => {
    page.value = getPageForPath(window.location.pathname);
    if (authenticated.value && (page.value === 'view' || page.value === 'edit')) loadRecords();
    if (authenticated.value && page.value === 'admin') loadAdminData();
  });
  initializeAuth();
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container v-if="authLoading" class="py-10 text-center">Checking session...</v-container>

      <v-container v-else-if="!authenticated" class="py-10">
        <v-card class="auth-card mx-auto" elevation="2">
          <v-card-title>Sign in to {{ appName }}</v-card-title>
          <v-card-text>
            <v-alert v-if="loginError" type="error" variant="tonal" class="mb-4">{{ loginError }}</v-alert>
            <v-form @submit.prevent="login">
              <v-text-field v-model="loginForm.identifier" label="Email or username" required autocomplete="username" variant="outlined" class="mb-3" />
              <v-text-field v-model="loginForm.password" label="Password" required type="password" autocomplete="current-password" variant="outlined" class="mb-4" />
              <v-btn color="primary" type="submit">Sign in</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-container>

      <v-container v-else-if="page === 'reset-password'" class="py-10">
        <v-card class="auth-card mx-auto" elevation="2">
          <v-card-title>Reset your password</v-card-title>
          <v-card-text>
            <p class="text-medium-emphasis mb-4">
              {{ authUser?.mustResetPassword ? 'A password reset is required before you can continue.' : 'Update your password.' }}
            </p>
            <v-alert v-if="resetError" type="error" variant="tonal" class="mb-4">{{ resetError }}</v-alert>
            <v-form @submit.prevent="resetPassword">
              <v-text-field
                v-model="resetForm.currentPassword"
                label="Current password"
                required
                type="password"
                autocomplete="current-password"
                variant="outlined"
                class="mb-3"
              />
              <v-text-field v-model="resetForm.password" label="New password" required minlength="8" type="password" autocomplete="new-password" variant="outlined" class="mb-3" />
              <v-text-field v-model="resetForm.confirmation" label="Confirm new password" required minlength="8" type="password" autocomplete="new-password" variant="outlined" class="mb-4" />
              <v-btn color="primary" type="submit" :loading="resetLoading">{{ resetLoading ? 'Saving...' : 'Reset password' }}</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-container>

      <template v-else>
        <v-app-bar color="primary">
          <template #prepend>
            <v-btn icon="mdi-menu" variant="text" color="white" aria-label="Open navigation" @click="menuOpen = !menuOpen" />
          </template>
          <v-btn
            variant="text"
            color="white"
            class="text-none font-weight-bold"
            :href="routeHref('/')"
            @click="navigateFromLink($event, '/')"
          >
            {{ appName }}
          </v-btn>
          <v-spacer />
          <div class="d-flex align-center ga-2">
            <v-menu v-model="userMenuOpen" location="bottom end" offset="8">
              <template #activator="{ props }">
                <v-btn v-bind="props" variant="text" color="white" class="text-none">
                  {{ authUser?.name || authUser?.email }}
                  <v-icon end icon="mdi-chevron-down" />
                </v-btn>
              </template>
              <v-list density="comfortable">
                <v-list-item title="Change password" prepend-icon="mdi-key" @click="openChangePassword" />
                <v-list-item title="Sign out" prepend-icon="mdi-logout" @click="logout" />
              </v-list>
            </v-menu>
            <v-btn
              :icon="mode === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
              variant="text"
              color="white"
              :title="`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`"
              @click="$emit('toggle-mode')"
            />
          </div>
        </v-app-bar>

        <v-navigation-drawer v-model="menuOpen" temporary location="left">
          <v-list nav density="comfortable">
            <v-list-item
              title="Home"
              prepend-icon="mdi-home"
              :href="routeHref('/character')"
              @click="navigateFromLink($event, '/character')"
            />
            <v-list-item
              title="Character"
              prepend-icon="mdi-account"
              :href="routeHref('/character')"
              @click="navigateFromLink($event, '/character')"
            />
            <v-list-item
              title="Location"
              prepend-icon="mdi-map-marker"
              :href="routeHref('/location')"
              @click="navigateFromLink($event, '/location')"
            />
            <v-list-item
              v-if="canWrite"
              title="Edit"
              prepend-icon="mdi-pencil"
              :href="routeHref('/edit/characters')"
              @click="navigateFromLink($event, '/edit/characters', { requireWrite: true })"
            />
            <v-list-item
              v-if="authUser?.isAdministrator"
              title="Admin"
              prepend-icon="mdi-shield-account"
              :href="routeHref('/admin')"
              @click="navigateFromLink($event, '/admin', { requireAdmin: true })"
            />
          </v-list>
        </v-navigation-drawer>

        <v-container v-if="page === 'view' || page === 'edit'" class="py-6">
          <v-card class="mb-4">
            <v-card-title>Tables</v-card-title>
            <v-card-text class="d-flex flex-wrap ga-2">
              <v-btn
                v-for="[name, table] in tableNavigationTables"
                :key="`table-link-${name}`"
                :href="routeHref(tablePagePath(name))"
                :variant="tableName === name ? 'flat' : 'outlined'"
                :color="tableName === name ? 'primary' : undefined"
                @click="navigateFromLink($event, tablePagePath(name), { requireWrite: page === 'edit' })"
              >
                {{ getNavigationLabel(name, table) }}
              </v-btn>
            </v-card-text>
          </v-card>

          <v-card class="mb-4">
            <v-card-title>{{ page === 'edit' ? 'Database editor' : 'Database viewer' }}</v-card-title>
            <v-card-text class="text-medium-emphasis">
              {{ page === 'edit' ? 'Edit records across the WorldBuilder database.' : 'View records across the WorldBuilder database.' }}
            </v-card-text>
            <v-card-actions v-if="page === 'edit' && canWrite && canEditCurrentTable">
              <v-btn color="primary" prepend-icon="mdi-plus" @click="startAddRecord">Add</v-btn>
            </v-card-actions>
          </v-card>

          <v-card v-if="page === 'edit' && canWrite && canEditCurrentTable && showEditorForm" class="mb-4">
            <v-card-title>{{ editingId === null ? 'Add' : 'Edit' }} {{ definition.label }}</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="saveRecord">
                <v-row>
                  <v-col v-for="field in editableFields(definition)" :key="field.name" cols="12" :md="field.multiline ? 12 : 4">
                    <v-textarea
                      v-if="field.multiline"
                      v-model="form[field.name]"
                      :label="field.label"
                      :required="field.required"
                      rows="3"
                      variant="outlined"
                    />
                    <v-text-field
                      v-else-if="!usesSelectField(field)"
                      v-model="form[field.name]"
                      :label="field.label"
                      :required="field.required"
                      :type="field.type || 'text'"
                      variant="outlined"
                    />
                    <v-select
                      v-else
                      v-model="form[field.name]"
                      :label="field.label"
                      :required="field.required"
                      :items="getFieldOptions(field)"
                      clearable
                      variant="outlined"
                    />
                  </v-col>
                  <template v-if="showCharacterDetailsFields">
                    <v-col cols="12">
                      <div class="text-subtitle-1">Character Details</div>
                    </v-col>
                    <v-col v-for="field in characterDetailFields" :key="`character-details-${field.name}`" cols="12" :md="field.multiline ? 12 : 4">
                      <v-textarea
                        v-if="field.multiline"
                        v-model="characterDetailsForm[field.name]"
                        :label="field.label"
                        :required="field.required"
                        rows="3"
                        variant="outlined"
                      />
                      <v-text-field
                        v-else
                        v-model="characterDetailsForm[field.name]"
                        :label="field.label"
                        :required="field.required"
                        :type="field.type || 'text'"
                        variant="outlined"
                      />
                    </v-col>
                  </template>
                </v-row>
                <div class="d-flex ga-3">
                  <v-btn color="primary" type="submit">{{ editingId === null ? 'Create' : 'Save' }}</v-btn>
                  <v-btn v-if="editingId !== null" variant="tonal" @click="cancelEdit">Cancel</v-btn>
                </div>
              </v-form>
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title>{{ definition.label }}</v-card-title>
            <v-card-text>
              <v-text-field
                v-if="page === 'edit' && tableName === 'characters'"
                v-model="characterFilter"
                label="Filter characters"
                placeholder="Search by ID, name, type, role, location, or affiliation"
                variant="outlined"
                clearable
                class="mb-4"
              />
              <v-progress-linear v-if="loading" indeterminate class="mb-4" />
              <template v-else>
                <template v-if="page === 'view' && tableName === 'characters'">
                  <v-select
                    v-model="selectedCharacterId"
                    :items="characterSelectItems"
                    label="Character"
                    variant="outlined"
                    class="mb-4"
                    clearable
                    hide-details
                  />
                  <v-card v-if="selectedCharacter" variant="tonal" class="mb-4">
                    <v-card-title>{{ selectedCharacter.name || `Character #${selectedCharacter.id}` }}</v-card-title>
                    <v-card-text>
                      <div>Type: {{ formatValue(selectedCharacter.type) || 'n/a' }}</div>
                      <div>Affiliation: {{ relatedCharacters.find((entry) => Number(entry.id) === Number(selectedCharacter.affiliation))?.name || 'None' }}</div>
                      <div>Location: {{ relatedLocations.find((entry) => Number(entry.id) === Number(selectedCharacter.location))?.name || 'None' }}</div>
                      <div>Details: {{ selectedCharacterDetails ? characterDetailFields.map((field) => `${field.label}: ${formatValue(selectedCharacterDetails[field.name])}`).join(' · ') : 'None' }}</div>
                      <div>
                        Reputation:
                        <template v-if="selectedCharacterReputationSummary.length">
                          <div v-for="entry in selectedCharacterReputationSummary" :key="`reputation-summary-${entry.targetId}`" class="pl-4 d-flex align-center ga-2">
                            <v-btn variant="text" color="primary" @click="openReputationEntryDetails(entry.targetId)">
                              {{ entry.targetName }}: {{ entry.score }} ({{ entry.descriptor }})
                            </v-btn>
                          </div>
                        </template>
                        <template v-else>
                          None
                        </template>
                      </div>
                      <div>Notes: {{ selectedCharacterNotes.length ? selectedCharacterNotes.map((entry) => entry.note).join(' | ') : 'None' }}</div>
                    </v-card-text>
                    <v-card-actions v-if="canWrite">
                      <v-btn variant="outlined" @click="goToEditCharacterFromView">Edit selected character</v-btn>
                    </v-card-actions>
                  </v-card>
                  <v-card v-if="canWrite && selectedCharacter" class="mb-4">
                    <v-card-title>Add character note</v-card-title>
                    <v-card-text>
                      <v-textarea v-model="characterNoteForm.note" label="Note" variant="outlined" rows="3" />
                    </v-card-text>
                    <v-card-actions>
                      <v-btn color="primary" @click="addCharacterNote">Add note</v-btn>
                    </v-card-actions>
                  </v-card>
                  <v-card v-if="canWrite && selectedCharacter">
                    <v-card-title>Add reputation entry</v-card-title>
                    <v-card-text>
                      <v-select v-model="reputationForm.targetId" :items="characterSelectItems" label="Target character" variant="outlined" class="mb-3" />
                      <v-text-field v-model="reputationForm.adjustment" label="Adjustment" type="number" variant="outlined" class="mb-3" />
                      <v-textarea v-model="reputationForm.note" label="Note" rows="3" variant="outlined" />
                    </v-card-text>
                    <v-card-actions>
                      <v-btn color="primary" @click="addCharacterReputation">Add reputation</v-btn>
                    </v-card-actions>
                  </v-card>
                  <v-card v-if="selectedCharacter && selectedReputationEntries.length" class="mb-4">
                    <v-card-title>
                      Reputation entries for
                      {{ relatedCharacters.find((entry) => Number(entry.id) === Number(selectedReputationTargetId))?.name || `Character #${selectedReputationTargetId}` }}
                    </v-card-title>
                    <v-card-text>
                      <v-row v-for="entry in selectedReputationEntries" :key="`selected-reputation-${entry.id}`" class="mb-2">
                        <v-col cols="12" md="3">
                          <v-text-field v-model="entry.adjustment" label="Adjustment" type="number" variant="outlined" hide-details />
                        </v-col>
                        <v-col cols="12" md="7">
                          <v-text-field v-model="entry.note" label="Note" variant="outlined" hide-details />
                        </v-col>
                        <v-col cols="12" md="2" class="d-flex ga-2 justify-end">
                          <v-btn v-if="canWrite" size="small" color="primary" variant="outlined" @click="updateReputationEntry(entry)">Save</v-btn>
                          <v-btn v-if="canWrite" size="small" color="error" variant="text" @click="deleteReputationEntry(entry.id)">Delete</v-btn>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </template>
                <template v-else-if="page === 'view' && tableName === 'locations'">
                  <v-select
                    v-model="selectedLocationId"
                    :items="locationSelectItems"
                    label="Location"
                    variant="outlined"
                    class="mb-4"
                    clearable
                    hide-details
                  />
                  <v-card v-if="selectedLocation" variant="tonal" class="mb-4">
                    <v-card-title>{{ selectedLocation.name || `Location #${selectedLocation.id}` }}</v-card-title>
                    <v-card-text>
                      <div>Affiliation: {{ selectedLocationResidents.length ? selectedLocationResidents.map((entry) => `${entry.id}:${formatValue(entry.name)}`).join(' | ') : 'None' }}</div>
                      <div>Location: Parent {{ formatValue(selectedLocation.parentLocation) || 'None' }}</div>
                      <div>Reputation: {{ relatedReputation.filter((entry) => selectedLocationResidents.some((resident) => Number(resident.id) === Number(entry.characterId) || Number(resident.id) === Number(entry.targetId))).length }} linked entries</div>
                      <div>Details: {{ formatValue(selectedLocation.description) || 'None' }}</div>
                      <div>Notes: {{ selectedLocationNotes.length ? selectedLocationNotes.map((entry) => entry.note).join(' | ') : 'None' }}</div>
                    </v-card-text>
                    <v-card-actions v-if="canWrite">
                      <v-btn variant="outlined" @click="goToEditLocationFromView">Edit selected location</v-btn>
                    </v-card-actions>
                  </v-card>
                  <v-card v-if="canWrite && selectedLocation">
                    <v-card-title>Add location note</v-card-title>
                    <v-card-text>
                      <v-textarea v-model="locationNoteForm.note" label="Note" variant="outlined" rows="3" />
                    </v-card-text>
                    <v-card-actions>
                      <v-btn color="primary" @click="addLocationNote">Add note</v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
                <v-list v-else-if="filteredRecords.length" lines="two">
                  <v-list-item v-for="record in filteredRecords" :key="record.id">
                    <template #title>
                      {{ definition.fields.map((field) => `${field.label}: ${formatValue(record[field.name])}`).join(' · ') }}
                    </template>
                    <template #append>
                      <div class="d-flex ga-2">
                        <v-btn
                          v-if="canWrite && canEditCurrentTable"
                          size="small"
                          variant="outlined"
                          @click="page === 'view' ? editRecordFromView(record) : editRecord(record)"
                        >
                          Edit
                        </v-btn>
                        <v-btn
                          v-if="page === 'edit' && canWrite && canEditCurrentTable"
                          size="small"
                          color="error"
                          variant="text"
                          @click="deleteRecord(record.id)"
                        >
                          Delete
                        </v-btn>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
                <v-alert v-else type="info" variant="tonal">No records found.</v-alert>
              </template>
            </v-card-text>
          </v-card>
        </v-container>

        <v-container v-else class="py-6">
          <v-card class="mb-4">
            <v-card-title>Administrator</v-card-title>
            <v-card-text>
              <div class="text-h6 mb-2">Application name</div>
              <div class="d-flex flex-wrap ga-3 mb-4">
                <v-text-field v-model="appNameForm" aria-label="Application name" label="Application name" variant="outlined" hide-details />
                <v-btn color="primary" @click="saveAppName">Save name</v-btn>
              </div>

              <div class="text-h6 mb-2">Base URL</div>
              <p class="text-medium-emphasis mb-3">Use a base URL path prefix for reverse proxy hosting. Environment variable values are locked.</p>
              <div class="d-flex flex-wrap ga-3 mb-2">
                <v-text-field v-model="baseUrlForm" aria-label="Base URL" label="Base URL" variant="outlined" :disabled="baseUrlLocked" hide-details />
                <v-btn color="primary" :disabled="baseUrlLocked" @click="saveBaseUrl">Save base URL</v-btn>
              </div>
              <p class="text-medium-emphasis mb-4">Source: {{ baseUrlSource }}{{ baseUrlLocked ? ' (locked)' : '' }}</p>

              <div class="text-h6 mb-2">Versions</div>
              <p class="text-medium-emphasis mb-3">Versions are managed programmatically and cannot be edited from the admin interface.</p>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field label="Application version" :model-value="versions.appVersion || 'n/a'" disabled readonly variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field label="Database version" :model-value="versions.dbVersion || 'n/a'" disabled readonly variant="outlined" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title>Users</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="createUser">
                <v-row>
                  <v-col cols="12" md="4"><v-text-field v-model="newUser.name" required label="Name" variant="outlined" /></v-col>
                  <v-col cols="12" md="4"><v-text-field v-model="newUser.email" required type="email" label="Email" variant="outlined" /></v-col>
                  <v-col cols="12" md="4"><v-text-field v-model="newUser.username" label="Username" variant="outlined" /></v-col>
                  <v-col cols="12" md="4"><v-text-field v-model="newUser.password" required type="password" label="Password" variant="outlined" /></v-col>
                  <v-col cols="12" md="4"><v-checkbox v-model="newUser.canWrite" label="Write access" hide-details /></v-col>
                  <v-col cols="12" md="4"><v-checkbox v-model="newUser.isAdministrator" label="Administrator" hide-details /></v-col>
                  <v-col cols="12" md="4"><v-checkbox v-model="newUser.mustResetPassword" label="Require password reset" hide-details /></v-col>
                  <v-col cols="12"><v-btn color="primary" type="submit">Create user</v-btn></v-col>
                </v-row>
              </v-form>

              <v-divider class="my-4" />

              <v-form @submit.prevent="saveSelectedAdminUser">
                <v-card variant="tonal" class="mb-4">
                  <v-card-title>Edit existing user</v-card-title>
                  <v-card-text>
                    <v-select
                      :model-value="selectedAdminUserId"
                      label="User"
                      variant="outlined"
                      :items="adminUsers.map((user) => ({ title: user.email, value: user.id }))"
                      @update:model-value="(value) => selectAdminUser({ target: { value: value ?? '' } })"
                    />
                    <v-row v-if="selectedAdminUserId !== null">
                      <v-col cols="12" md="4"><v-text-field v-model="selectedAdminUserForm.name" required label="Name" variant="outlined" /></v-col>
                      <v-col cols="12" md="4"><v-text-field v-model="selectedAdminUserForm.email" required type="email" label="Email" variant="outlined" /></v-col>
                      <v-col cols="12" md="4"><v-text-field v-model="selectedAdminUserForm.username" label="Username" variant="outlined" /></v-col>
                      <v-col cols="12" md="4"><v-text-field v-model="selectedAdminUserForm.password" type="password" label="New password (optional)" variant="outlined" /></v-col>
                      <v-col cols="12" md="4"><v-checkbox v-model="selectedAdminUserForm.canWrite" label="Write access" hide-details /></v-col>
                      <v-col cols="12" md="4"><v-checkbox v-model="selectedAdminUserForm.isAdministrator" label="Administrator" hide-details /></v-col>
                      <v-col cols="12" md="4"><v-checkbox v-model="selectedAdminUserForm.mustResetPassword" label="Require reset" hide-details /></v-col>
                      <v-col cols="12"><v-btn color="primary" type="submit">Save user</v-btn></v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-form>

              <v-list lines="two">
                <v-list-item v-for="user in adminUsers" :key="user.id">
                  <template #title>{{ user.email }}</template>
                  <template #subtitle>
                    <div class="d-flex flex-wrap ga-4 mt-1">
                      <v-checkbox
                        v-model="user.canWrite"
                        density="compact"
                        hide-details
                        label="Write"
                        @update:model-value="updateUser(user)"
                      />
                      <v-checkbox
                        v-model="user.isAdministrator"
                        density="compact"
                        hide-details
                        label="Admin"
                        @update:model-value="updateUser(user)"
                      />
                      <v-checkbox
                        v-model="user.mustResetPassword"
                        density="compact"
                        hide-details
                        label="Require reset"
                        @update:model-value="updateUser(user)"
                      />
                    </div>
                  </template>
                  <template #append>
                    <v-btn color="error" variant="text" @click="deleteUser(user)">Delete</v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-container>
      </template>

      <v-snackbar
        :model-value="Boolean(message)"
        :color="message?.severity === 'error' ? 'error' : 'success'"
        location="bottom end"
        @update:model-value="(value) => { if (!value) message = null; }"
      >
        {{ message?.text }}
        <template #actions>
          <v-btn icon="mdi-close" variant="text" @click="message = null" />
        </template>
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-card {
  max-width: 420px;
}

.user-name {
  opacity: .9;
}
</style>
