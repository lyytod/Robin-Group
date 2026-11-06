import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css'
import App from './App.tsx'

// Cegah mouse wheel mengubah angka pada input bertipe number secara tidak sengaja
document.addEventListener('wheel', () => {
  if (
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.type === 'number'
  ) {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
