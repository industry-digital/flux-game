import { createApp } from 'vue';
import { router } from './router';
import { useTheme } from '~/infrastructure/theme/composables';
import App from './App.vue';

const app = createApp(App);

// Install router
app.use(router);

// Initialize theme system
useTheme('dark');

// Mount app
app.mount('#app');
