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
          <v-btn variant="text" color="white" class="text-none font-weight-bold" @click="navigate('/')">{{ appName }}</v-btn>
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
            <v-list-item title="Home" prepend-icon="mdi-home" @click="navigateFromMenu('/')" />
            <v-list-item v-if="canWrite" title="Edit" prepend-icon="mdi-pencil" @click="navigateFromMenu('/edit')" />
            <v-list-item v-if="authUser?.isAdministrator" title="Admin" prepend-icon="mdi-shield-account" @click="navigateFromMenu('/admin')" />
          </v-list>
        </v-navigation-drawer>

        <v-container v-if="page === 'view' || page === 'edit'" class="py-6">
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="tableName"
                label="Table"
                variant="outlined"
                :items="databaseTables.map(([name, table]) => ({ title: table.label, value: name }))"
              />
            </v-col>
          </v-row>

          <v-card class="mb-4">
            <v-card-title>{{ page === 'edit' ? 'Database editor' : 'Database viewer' }}</v-card-title>
            <v-card-text class="text-medium-emphasis">
              {{ page === 'edit' ? 'Edit records across the WorldBuilder database.' : 'View records across the WorldBuilder database.' }}
            </v-card-text>
          </v-card>

          <v-card v-if="page === 'edit' && canWrite" class="mb-4">
            <v-card-title>{{ editingId === null ? 'Add' : 'Edit' }} {{ definition.label }}</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="saveRecord">
                <v-row>
                  <v-col v-for="field in definition.fields" :key="field.name" cols="12" :md="field.multiline ? 12 : 4">
                    <v-textarea
                      v-if="field.multiline"
                      v-model="form[field.name]"
                      :label="field.label"
                      :required="field.required"
                      rows="3"
                      variant="outlined"
                    />
                    <v-text-field
                      v-else
                      v-model="form[field.name]"
                      :label="field.label"
                      :required="field.required"
                      :type="field.type || 'text'"
                      variant="outlined"
                    />
                  </v-col>
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
              <v-progress-linear v-if="loading" indeterminate class="mb-4" />
              <template v-else>
                <v-list v-if="records.length" lines="two">
                  <v-list-item v-for="record in records" :key="record.id">
                    <template #title>
                      {{ definition.fields.map((field) => `${field.label}: ${formatValue(record[field.name])}`).join(' · ') }}
                    </template>
                    <template #append>
                      <div class="d-flex ga-2">
                        <v-btn
                          v-if="canWrite"
                          size="small"
                          variant="outlined"
                          @click="page === 'view' ? editRecordFromView(record) : editRecord(record)"
                        >
                          Edit
                        </v-btn>
                        <v-btn
                          v-if="page === 'edit' && canWrite"
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
