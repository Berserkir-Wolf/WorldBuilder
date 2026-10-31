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
      { name: 'parentLocation', label: 'Parent location', type: 'number' }
    ]
  },
  characters: {
    label: 'Characters',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Type' },
      { name: 'role', label: 'Role' },
      { name: 'location', label: 'Location', type: 'number' }
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
const loading = ref(false);
const message = ref(null);
const authLoading = ref(true);
const authenticated = ref(false);
const authUser = ref(null);
const loginForm = ref({ identifier: '', password: '' });
const loginError = ref(null);
const resetForm = ref({ password: '', confirmation: '' });
const resetError = ref(null);
const resetLoading = ref(false);
const appName = ref('WorldBuilder');
const basePath = ref('');
const page = ref(getPageForPath(window.location.pathname));
const menuOpen = ref(false);
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
const definition = computed(() => tableDefinitions[tableName.value]);
const databaseTables = computed(() => Object.entries(tableDefinitions).filter(([name]) => !['users', 'applicationsettings'].includes(name)));
const canWrite = computed(() => Boolean(authUser.value?.canWrite));
const isAdminPage = computed(() => page.value === 'admin');
const isEditPage = computed(() => page.value === 'edit');

function getPageForPath(path) {
  const relativePath = getRelativePath(path);
  if (relativePath === '/login') return 'login';
  if (relativePath === '/reset-password') return 'reset-password';
  if (relativePath === '/admin') return 'admin';
  if (relativePath === '/edit') return 'edit';
  return 'view';
}

function detectBasePathFromLocation() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const routeSuffixes = ['/login', '/reset-password', '/admin', '/edit'];

  for (const suffix of routeSuffixes) {
    if (pathname === suffix) return '';
    if (pathname.endsWith(suffix)) {
      const prefix = pathname.slice(0, -suffix.length);
      return normalizeBasePath(prefix || '/');
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

function apiUrl(name) {
  return withBasePath(`/api/${name}`);
}

function emptyForm(table) {
  return Object.fromEntries(table.fields.map((field) => [field.name, '']));
}

function formatValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

async function navigate(path, { replace = false } = {}) {
  const fullPath = withBasePath(path);
  if (replace) window.history.replaceState({}, '', fullPath);
  else window.history.pushState({}, '', fullPath);
  page.value = getPageForPath(fullPath);
  menuOpen.value = false;
  if (page.value === 'admin') await loadAdminData();
  else if (page.value === 'view' || page.value === 'edit') await loadRecords();
}

function setRoute(path, { replace = false } = {}) {
  const fullPath = withBasePath(path);
  if (replace) window.history.replaceState({}, '', fullPath);
  else window.history.pushState({}, '', fullPath);
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

  if (path === '/edit') {
    if (!authUser.value?.canWrite) {
      setRoute('/');
      await loadRecords();
      return;
    }

    setRoute('/edit');
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
  if (path === '/edit' && !canWrite.value) return;
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
  const visibleTables = databaseTables.value;
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
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  } finally {
    loading.value = false;
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
      body: JSON.stringify({ password: resetForm.value.password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to reset password.');
    authUser.value = { ...authUser.value, mustResetPassword: false };
    resetForm.value = { password: '', confirmation: '' };
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
  await fetch(apiUrl('auth/logout'), { method: 'POST', credentials: 'same-origin' });
  authenticated.value = false;
  authUser.value = null;
  records.value = [];
  returnPath.value = '/';
  setRoute('/login');
}

watch(tableName, () => {
  form.value = emptyForm(definition.value);
  editingId.value = null;
  if (authenticated.value && !isAdminPage.value) loadRecords();
});

async function saveRecord() {
  if (!canWrite.value) return;
  const payload = {};
  definition.value.fields.forEach((field) => {
    const value = form.value[field.name];
    payload[field.name] = field.type === 'number' ? (value === '' ? null : Number(value)) : (value === '' ? null : value);
  });
  try {
    const response = await fetch(editingId.value === null ? apiUrl(tableName.value) : `${apiUrl(tableName.value)}/${editingId.value}`, {
      method: editingId.value === null ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Unable to save record.');
    }
    message.value = { severity: 'success', text: editingId.value === null ? 'Record created.' : 'Record updated.' };
    form.value = emptyForm(definition.value);
    editingId.value = null;
    await loadRecords();
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  }
}

function editRecord(record) {
  if (!canWrite.value) return;
  editingId.value = record.id;
  form.value = Object.fromEntries(definition.value.fields.map((field) => [field.name, formatValue(record[field.name])]));
}

async function editRecordFromView(record) {
  if (!canWrite.value) return;
  await navigate('/edit');
  editRecord(record);
}

async function deleteRecord(id) {
  if (!canWrite.value || !window.confirm('Delete this record?')) return;
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
  <div v-if="authLoading" class="auth-message">Checking session...</div>

  <form v-else-if="!authenticated" class="login-card card" @submit.prevent="login">
    <h1>Sign in to {{ appName }}</h1>
    <p v-if="loginError" class="error-message">{{ loginError }}</p>
    <label class="field">
      <span>Email or username</span>
      <input v-model="loginForm.identifier" required autocomplete="username" />
    </label>
    <label class="field">
      <span>Password</span>
      <input v-model="loginForm.password" required type="password" autocomplete="current-password" />
    </label>
    <button class="primary" type="submit">Sign in</button>
  </form>

  <form v-else-if="page === 'reset-password'" class="login-card card" @submit.prevent="resetPassword">
    <h1>Reset your password</h1>
    <p class="muted">A password reset is required before you can continue.</p>
    <p v-if="resetError" class="error-message">{{ resetError }}</p>
    <label class="field">
      <span>New password</span>
      <input v-model="resetForm.password" required minlength="8" type="password" autocomplete="new-password" />
    </label>
    <label class="field">
      <span>Confirm new password</span>
      <input v-model="resetForm.confirmation" required minlength="8" type="password" autocomplete="new-password" />
    </label>
    <button class="primary" type="submit" :disabled="resetLoading">{{ resetLoading ? 'Saving...' : 'Reset password' }}</button>
  </form>

  <template v-else>
  <header class="app-bar">
    <button class="theme-button" type="button" aria-label="Open navigation" @click="menuOpen = !menuOpen">☰</button>
    <a class="app-name" href="/" @click.prevent="navigate('/')">{{ appName }}</a>
    <span class="header-actions">
      <span class="user-name">{{ authUser?.name || authUser?.email }}</span>
      <button class="theme-button" type="button" :title="`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`" @click="$emit('toggle-mode')">
        {{ mode === 'light' ? '☾' : '☀' }}
      </button>
      <button class="theme-button" type="button" @click="logout">Sign out</button>
    </span>
  </header>

  <div v-if="menuOpen" class="menu-overlay" @click.self="menuOpen = false">
    <nav class="hamburger-menu card">
      <button type="button" @click="navigateFromMenu('/')">Home</button>
      <button v-if="canWrite" type="button" @click="navigateFromMenu('/edit')">Edit</button>
      <button v-if="authUser?.isAdministrator" type="button" @click="navigateFromMenu('/admin')">Admin</button>
    </nav>
  </div>

  <main v-if="page === 'view' || page === 'edit'" class="container">
    <label class="field table-field">
      <span>Table</span>
      <select v-model="tableName">
        <option v-for="[name, table] in databaseTables" :key="name" :value="name">{{ table.label }}</option>
      </select>
    </label>

    <section>
      <h1>{{ page === 'edit' ? 'Database editor' : 'Database viewer' }}</h1>
      <p class="muted">{{ page === 'edit' ? 'Edit records across the WorldBuilder database.' : 'View records across the WorldBuilder database.' }}</p>
    </section>

    <form v-if="page === 'edit' && canWrite" class="card" @submit.prevent="saveRecord">
      <h2>{{ editingId === null ? 'Add' : 'Edit' }} {{ definition.label }}</h2>
      <div class="form-grid">
        <label v-for="field in definition.fields" :key="field.name" class="field" :class="{ wide: field.multiline }">
          <span>{{ field.label }}</span>
          <textarea v-if="field.multiline" v-model="form[field.name]" :required="field.required" rows="3" />
          <input v-else v-model="form[field.name]" :required="field.required" :type="field.type || 'text'" />
        </label>
      </div>
      <div class="actions">
        <button class="primary" type="submit">{{ editingId === null ? 'Create' : 'Save' }}</button>
        <button v-if="editingId !== null" type="button" @click="cancelEdit">Cancel</button>
      </div>
    </form>

    <section class="card">
      <h2>{{ definition.label }}</h2>
      <p v-if="loading" class="muted">Loading...</p>
      <div v-for="record in records" v-else :key="record.id" class="record">
        <span>{{ definition.fields.map((field) => `${field.label}: ${formatValue(record[field.name])}`).join(' · ') }}</span>
        <span class="record-actions">
           <button v-if="canWrite" type="button" title="Edit" @click="page === 'view' ? editRecordFromView(record) : editRecord(record)">Edit</button>
           <button v-if="page === 'edit' && canWrite" class="danger" type="button" title="Delete" @click="deleteRecord(record.id)">Delete</button>
        </span>
      </div>
      <p v-if="!loading && records.length === 0" class="muted">No records found.</p>
    </section>
  </main>

  <main v-else class="container">
    <section class="card">
      <h1>Administrator</h1>
      <h2>Application name</h2>
      <div class="actions">
        <input v-model="appNameForm" aria-label="Application name" />
        <button class="primary" type="button" @click="saveAppName">Save name</button>
      </div>
      <h2>Base URL</h2>
      <p class="muted">Use a base URL path prefix for reverse proxy hosting. Environment variable values are locked.</p>
      <div class="actions">
        <input v-model="baseUrlForm" aria-label="Base URL" :disabled="baseUrlLocked" />
        <button class="primary" type="button" :disabled="baseUrlLocked" @click="saveBaseUrl">Save base URL</button>
      </div>
      <p class="muted">Source: {{ baseUrlSource }}{{ baseUrlLocked ? ' (locked)' : '' }}</p>
      <h2>Versions</h2>
      <p class="muted">Versions are managed programmatically and cannot be edited from the admin interface.</p>
      <div class="form-grid">
        <label class="field">
          <span>Application version</span>
          <input :value="versions.appVersion || 'n/a'" disabled readonly />
        </label>
        <label class="field">
          <span>Database version</span>
          <input :value="versions.dbVersion || 'n/a'" disabled readonly />
        </label>
      </div>
    </section>

    <section class="card">
      <h2>Users</h2>
      <form class="form-grid" @submit.prevent="createUser">
        <input v-model="newUser.name" required placeholder="Name" />
        <input v-model="newUser.email" required type="email" placeholder="Email" />
        <input v-model="newUser.username" placeholder="Username" />
        <input v-model="newUser.password" required type="password" placeholder="Password" />
        <label><input v-model="newUser.canWrite" type="checkbox" /> Write access</label>
        <label><input v-model="newUser.isAdministrator" type="checkbox" /> Administrator</label>
        <label><input v-model="newUser.mustResetPassword" type="checkbox" /> Require password reset</label>
        <button class="primary" type="submit">Create user</button>
      </form>

      <form class="card" @submit.prevent="saveSelectedAdminUser">
        <h3>Edit existing user</h3>
        <label class="field">
          <span>User</span>
          <select :value="selectedAdminUserId ?? ''" @change="selectAdminUser">
            <option value="">Select a user...</option>
            <option v-for="user in adminUsers" :key="`user-select-${user.id}`" :value="user.id">
              {{ user.email }}
            </option>
          </select>
        </label>
        <div v-if="selectedAdminUserId !== null" class="form-grid">
          <input v-model="selectedAdminUserForm.name" required placeholder="Name" />
          <input v-model="selectedAdminUserForm.email" required type="email" placeholder="Email" />
          <input v-model="selectedAdminUserForm.username" placeholder="Username" />
          <input v-model="selectedAdminUserForm.password" type="password" placeholder="New password (optional)" />
          <label><input v-model="selectedAdminUserForm.canWrite" type="checkbox" /> Write access</label>
          <label><input v-model="selectedAdminUserForm.isAdministrator" type="checkbox" /> Administrator</label>
          <label><input v-model="selectedAdminUserForm.mustResetPassword" type="checkbox" /> Require reset</label>
        </div>
        <div v-if="selectedAdminUserId !== null" class="actions">
          <button class="primary" type="submit">Save user</button>
        </div>
      </form>

      <div v-for="user in adminUsers" :key="user.id" class="record">
        <span>{{ user.email }}</span>
        <label><input v-model="user.canWrite" type="checkbox" @change="updateUser(user)" /> Write</label>
        <label><input v-model="user.isAdministrator" type="checkbox" @change="updateUser(user)" /> Admin</label>
        <label><input v-model="user.mustResetPassword" type="checkbox" @change="updateUser(user)" /> Require reset</label>
        <button class="danger" type="button" @click="deleteUser(user)">Delete</button>
      </div>
    </section>
  </main>

  <div v-if="message" class="notification" :class="message.severity" role="alert">
    {{ message.text }}
    <button type="button" aria-label="Close" @click="message = null">×</button>
  </div>
  </template>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--background); color: var(--text); }
:global(:root) { --background: #f5f7fb; --surface: #fff; --text: #172033; --muted: #657187; --border: #d7dce5; --primary: #1565c0; }
:global(.dark) { --background: #121820; --surface: #1d2733; --text: #edf2f7; --muted: #aab6c5; --border: #3a4756; --primary: #90caf9; }
.app-bar { display: flex; align-items: center; justify-content: space-between; padding: 1rem max(1.5rem, calc((100% - 1200px) / 2)); color: white; background: #1976d2; font-size: 1.25rem; }
.app-name { color: inherit; text-decoration: none; font-weight: 700; }
.header-actions { display: flex; align-items: center; gap: .75rem; } .user-name { font-size: .85rem; }
.theme-button { border: 0; color: inherit; background: transparent; font-size: 1rem; cursor: pointer; }
.menu-overlay { position: fixed; inset: 0; background: #0006; z-index: 50; }
.hamburger-menu { position: fixed; left: 0; top: 0; bottom: 0; z-index: 51; display: flex; flex-direction: column; gap: .75rem; width: min(320px, 85vw); margin: 0; padding: 1.5rem; border-radius: 0; }
.auth-message { padding: 2rem; text-align: center; } .login-card { display: grid; gap: 1rem; max-width: 420px; margin: 4rem auto; } .error-message { color: #d32f2f; }
.container { display: grid; gap: 1.5rem; max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
h1, h2 { margin: 0 0 .5rem; } h1 { font-size: 2rem; } h2 { font-size: 1.25rem; }
.muted { color: var(--muted); } .card { padding: 1.5rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); box-shadow: 0 1px 3px #00000012; }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; } .field { display: flex; flex-direction: column; gap: .4rem; } .field.wide { grid-column: 1 / -1; }
.field span { font-size: .9rem; color: var(--muted); } input, textarea, select { width: 100%; padding: .7rem; border: 1px solid var(--border); border-radius: 4px; color: var(--text); background: var(--surface); font: inherit; } .table-field { max-width: 100%; }
.actions { display: flex; gap: .75rem; margin-top: 1.5rem; } button { padding: .6rem 1rem; border: 1px solid var(--border); border-radius: 4px; color: var(--text); background: var(--surface); cursor: pointer; } button.primary { border-color: var(--primary); color: white; background: var(--primary); } button.danger { color: #d32f2f; }
.record { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--border); } .record:last-of-type { border-bottom: 0; } .record-actions { display: flex; gap: .5rem; flex-shrink: 0; }
.notification { position: fixed; right: 1.5rem; bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; padding: 1rem; border-radius: 4px; color: white; box-shadow: 0 3px 8px #0004; } .notification.success { background: #2e7d32; } .notification.error { background: #d32f2f; } .notification button { padding: 0; border: 0; color: white; background: transparent; font-size: 1.25rem; }
@media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .field.wide { grid-column: auto; } .record { align-items: flex-start; flex-direction: column; } }
</style>
