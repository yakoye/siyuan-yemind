import '../../src/styles/index.css';
import './styles.css';
import { YeMindWebApp } from './webApp';
import { createWebServices } from './webServices';
import { createIndexedDbWebStore } from './webStorage';

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  const app = new YeMindWebApp(root, createWebServices(createIndexedDbWebStore()));
  app.start().catch((error) => {
    root.innerHTML = `<div class="ymw-fatal"><strong>YeMind 启动失败</strong><pre></pre></div>`;
    root.querySelector('pre')!.textContent = error instanceof Error ? error.message : String(error);
  });
}
