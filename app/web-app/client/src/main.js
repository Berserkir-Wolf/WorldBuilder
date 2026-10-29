import { createApp, defineComponent, h, ref, watch } from 'vue';
import App from './App.vue';

const mode = ref(localStorage.getItem('worldbuilder-theme') || 'light');

watch(mode, (value) => {
  localStorage.setItem('worldbuilder-theme', value);
  document.documentElement.classList.toggle('dark', value === 'dark');
}, { immediate: true });

const Root = defineComponent({
  setup() {
    const toggleMode = () => {
      mode.value = mode.value === 'light' ? 'dark' : 'light';
    };

    return () => h(App, { mode: mode.value, onToggleMode: toggleMode });
  }
});

createApp(Root).mount('#root');
