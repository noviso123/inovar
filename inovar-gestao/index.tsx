
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

console.log('🚀 Index.tsx is mounting...');

const rootElement = document.getElementById('root');

// CRITICAL: Global error listener to catch crashes before/during mount
window.onerror = (message, source, lineno, colno, error) => {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #fff1f2; color: #e11d48; font-family: sans-serif; border-radius: 12px; margin: 20px; border: 1px solid #fda4af;">
        <h1 style="margin-top: 0;">⚠️ Initial Load Error</h1>
        <p>O sistema encontrou um erro crítico durante a inicialização:</p>
        <pre style="background: #0f172a; color: #94a3b8; padding: 15px; border-radius: 8px; overflow: auto; font-size: 12px;">${message}</pre>
        <p style="font-size: 12px; opacity: 0.7;">Isso geralmente ocorre por variáveis de ambiente ausentes no dashboard do Vercel.</p>
      </div>
    `;
  }
};

if (!rootElement) {
  console.error("❌ Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
