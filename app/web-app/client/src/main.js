import { createApp, defineComponent, h, ref, watch } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const storedTheme = localStorage.getItem('worldbuilder-theme');
const mode = ref(storedTheme || (systemThemeQuery.matches ? 'dark' : 'light'));

function applyTheme(value) {
  const themeName = value === 'dark' ? 'dark' : 'light';
  vuetify.theme.global.name.value = themeName;
  document.documentElement.classList.toggle('dark', themeName === 'dark');
}

watch(mode, (value) => {
  localStorage.setItem('worldbuilder-theme', value);
  applyTheme(value);
}, { immediate: true });

const onSystemThemeChanged = (event) => {
  const savedTheme = localStorage.getItem('worldbuilder-theme');
  if (!savedTheme) {
    mode.value = event.matches ? 'dark' : 'light';
  }
};

if (typeof systemThemeQuery.addEventListener === 'function') {
  systemThemeQuery.addEventListener('change', onSystemThemeChanged);
} else if (typeof systemThemeQuery.addListener === 'function') {
  systemThemeQuery.addListener(onSystemThemeChanged);
}

const Root = defineComponent({
  setup() {
    const toggleMode = () => {
      mode.value = mode.value === 'light' ? 'dark' : 'light';
    };

    return () => h(App, { mode: mode.value, onToggleMode: toggleMode });
  }
});

createApp(Root).use(vuetify).mount('#root');
