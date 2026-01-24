import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 註冊 Service Worker (PWA 核心)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 考慮到部署在 GitHub Pages 的 /famtrip/ 下，使用靈活的路徑
    const swPath = window.location.pathname.startsWith('/famtrip') ? '/famtrip/sw.js' : '/sw.js';
    
    navigator.serviceWorker.register(swPath)
      .then(registration => {
        console.log('FamTrip SW registered:', registration.scope);
      })
      .catch(err => {
        console.warn('SW registration failed (expected in some dev environments):', err);
      });
  });
}