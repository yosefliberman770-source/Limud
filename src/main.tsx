import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './design/base.css';
import { useStore } from './app/store';

// QA hook (only with ?qa in the URL): lets the screenshot scripts change settings.
if (/[?&]qa\b/.test(location.search)) (window as unknown as { __store: unknown }).__store = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
