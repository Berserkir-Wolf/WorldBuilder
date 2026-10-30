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

const tableName = ref('users');
const records = ref([]);
const form = ref(emptyForm(tableDefinitions.users));
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
const page = ref(getPageForPath(window.location.pathname));
const returnPath = ref('/');
const adminUsers = ref([]);
const appNameForm = ref('');
const newUser = ref({ name: '', email: '', username: '', password: '', canWrite: false, isAdministrator: false, mustResetPassword: true });
const definition = computed(() => tableDefinitions[tableName.value]);
const canWrite = computed(() => Boolean(authUser.value?.canWrite));
const isAdminPage = computed(() => page.value === 'admin');

function getPageForPath(path) {
  if (path === '/login') return 'login';
  if (path === '/reset-password') return 'reset-password';
  if (path === '/admin') return 'admin';
  return 'database';
}

function apiUrl(name) {
  return `/api/${name}`;
}

function emptyForm(table) {
  return Object.fromEntries(table.fields.map((field) => [field.name, '']));
}

function formatValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

async function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  page.value = getPageForPath(path);
  if (page.value === 'admin') await loadAdminData();
  else if (page.value === 'database') await loadRecords();
}

function setRoute(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  page.value = getPageForPath(path);
}

async function resolveRoute() {
  const path = window.location.pathname;
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
  setRoute('/');
  await loadRecords();
}

async function navigateFromUser(path) {
  if (path === '/admin' && !authUser.value?.isAdministrator) return;
  await navigate(path);
}

/*
 * Keep route changes explicit so loading a page never starts another auth
 * initialization cycle.
 */
function legacyNavigate(path) {
  window.history.pushState({}, '', path);
  page.value = path === '/admin' ? 'admin' : 'database';
  if (path === '/admin') loadAdminData();
  else loadRecords();
}

async function loadRecords() {
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
    const appNameResponse = await fetch(apiUrl('auth/appname'));
    if (appNameResponse.ok) {
      appName.value = (await appNameResponse.json()).appName;
      document.title = appName.value;
    }

    const requestedPath = window.location.pathname === '/login' ? '/' : window.location.pathname;
    const queryReturn = new URLSearchParams(window.location.search).get('return');
    returnPath.value = queryReturn === '/admin' || requestedPath === '/admin' ? '/admin' : '/';
    const response = await fetch(apiUrl('auth/me'), { credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      authUser.value = result.user;
      authenticated.value = true;
      if (authUser.value.mustResetPassword) {
        setRoute('/reset-password');
      } else if (window.location.pathname === '/login') {
        setRoute('/');
        await resolveRoute();
      } else {
        await resolveRoute();
      }
    } else {
      page.value = 'login';
      if (window.location.pathname !== '/login') {
        returnPath.value = window.location.pathname === '/admin' ? '/admin' : '/';
        window.history.replaceState({}, '', `/login?return=${encodeURIComponent(returnPath.value)}`);
      }
    }
  } finally {
    authLoading.value = false;
  }
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

async function deleteUser(user) {
  if (!window.confirm(`Delete ${user.email}?`)) return;
  const response = await fetch(`${apiUrl('admin/users')}/${user.id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Unable to delete user.');
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
    if (authenticated.value && page.value === 'database') loadRecords();
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
    <a class="app-name" href="/" @click.prevent="navigate('/')">{{ appName }}</a>
    <span class="header-actions">
      <span class="user-name">{{ authUser?.name || authUser?.email }}</span>
      <button v-if="authUser?.isAdministrator && page !== 'admin'" class="theme-button" type="button" @click="navigate('/admin')">Admin</button>
      <button v-if="page === 'admin'" class="theme-button" type="button" @click="navigate('/')">Database</button>
      <button class="theme-button" type="button" :title="`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`" @click="$emit('toggle-mode')">
        {{ mode === 'light' ? '☾' : '☀' }}
      </button>
      <button class="theme-button" type="button" @click="logout">Sign out</button>
    </span>
  </header>

  <main v-if="page === 'database'" class="container">
    <section>
      <h1>Database manager</h1>
      <p class="muted">Create and manage records across the WorldBuilder database.</p>
    </section>

    <label class="field table-field">
      <span>Table</span>
      <select v-model="tableName">
        <option v-for="(table, name) in tableDefinitions" :key="name" :value="name">{{ table.label }}</option>
      </select>
    </label>

    <form v-if="canWrite" class="card" @submit.prevent="saveRecord">
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
           <button v-if="canWrite" type="button" title="Edit" @click="editRecord(record)">Edit</button>
           <button v-if="canWrite" class="danger" type="button" title="Delete" @click="deleteRecord(record.id)">Delete</button>
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
        <button class="primary" type="submit">Create user</button>
      </form>
      <div v-for="user in adminUsers" :key="user.id" class="record">
        <span>{{ user.email }}</span>
        <label><input v-model="user.canWrite" type="checkbox" @change="updateUser(user)" /> Write</label>
        <label><input v-model="user.isAdministrator" type="checkbox" @change="updateUser(user)" /> Admin</label>
        <label><input v-model="user.mustResetPassword" type="checkbox" @change="updateUser(user)" /> Reset</label>
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
