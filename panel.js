import { createApp } from 'vue'
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';

import '@arco-design/web-vue/dist/arco.css';
import './src/assets/panel.css'
import './src/assets/iconfont.css'
import Panel from './Panel.vue'
const app = createApp(Panel)
app.use(ArcoVue);
app.use(ArcoVueIcon);
app.mount('#app')



