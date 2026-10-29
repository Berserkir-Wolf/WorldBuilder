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
const definition = computed(() => tableDefinitions[tableName.value]);

function apiUrl(name) {
  const pagePath = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${pagePath}api/${name}`;
}

function emptyForm(table) {
  return Object.fromEntries(table.fields.map((field) => [field.name, '']));
}

function formatValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

async function loadRecords() {
  loading.value = true;
  try {
    const response = await fetch(apiUrl(tableName.value));
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

async function initializeAuth() {
  try {
    const response = await fetch(apiUrl('auth/me'), { credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      authUser.value = result.user;
      authenticated.value = true;
      await loadRecords();
    }
  } finally {
    authLoading.value = false;
  }
}

async function login() {
  loginError.value = null;
  try {
    const response = await fetch(apiUrl('auth/login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
    authUser.value = result.user;
    authenticated.value = true;
    loginForm.value.password = '';
    await loadRecords();
  } catch (error) {
    loginError.value = error.message;
  }
}

async function logout() {
  await fetch(apiUrl('auth/logout'), { method: 'POST', credentials: 'same-origin' });
  authenticated.value = false;
  authUser.value = null;
  records.value = [];
}
}

watch(tableName, () => {
  form.value = emptyForm(definition.value);
  editingId.value = null;
  loadRecords();
});

async function saveRecord() {
  const payload = {};
  definition.value.fields.forEach((field) => {
    const value = form.value[field.name];
    payload[field.name] = field.type === 'number'
      ? (value === '' ? null : Number(value))
      : (value === '' ? null : value);
  });

  try {
    const response = await fetch(
      editingId.value === null ? apiUrl(tableName.value) : `${apiUrl(tableName.value)}/${editingId.value}`,
      {
        method: editingId.value === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
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
  editingId.value = record.id;
  form.value = Object.fromEntries(definition.value.fields.map((field) => [field.name, formatValue(record[field.name])]));
}

async function deleteRecord(id) {
  if (!window.confirm('Delete this record?')) return;

  try {
    const response = await fetch(`${apiUrl(tableName.value)}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Unable to delete record.');
    }
    message.value = { severity: 'success', text: 'Record deleted.' };
    if (editingId.value === id) {
      editingId.value = null;
      form.value = emptyForm(definition.value);
    }
    await loadRecords();
  } catch (error) {
    message.value = { severity: 'error', text: error.message };
  }
}

function cancelEdit() {
  editingId.value = null;
  form.value = emptyForm(definition.value);
}

onMounted(initializeAuth);
</script>

<template>
  <div v-if="authLoading" class="auth-message">Checking session...</div>

  <form v-else-if="!authenticated" class="login-card card" @submit.prevent="login">
    <h1>Sign in to WorldBuilder</h1>
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

  <template v-else>
  <header class="app-bar">
    <strong>WorldBuilder</strong>
    <span class="header-actions">
      <span class="user-name">{{ authUser?.name || authUser?.email }}</span>
      <button class="theme-button" type="button" :title="`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`" @click="$emit('toggle-mode')">
        {{ mode === 'light' ? '☾' : '☀' }}
      </button>
      <button class="theme-button" type="button" @click="logout">Sign out</button>
    </span>
  </header>

  <main class="container">
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

    <form class="card" @submit.prevent="saveRecord">
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
          <button type="button" title="Edit" @click="editRecord(record)">Edit</button>
          <button class="danger" type="button" title="Delete" @click="deleteRecord(record.id)">Delete</button>
        </span>
      </div>
      <p v-if="!loading && records.length === 0" class="muted">No records found.</p>
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
