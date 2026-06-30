import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function prepare() {
  // MSW mock layer removed — all API calls go to the real backend.
  return Promise.resolve();
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
