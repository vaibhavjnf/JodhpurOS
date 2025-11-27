import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color: white; padding: 20px;">Critical Error: Root element not found.</div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Mounting Error:", error);
  rootElement.innerHTML = `<div style="color: #ef4444; padding: 20px; font-family: sans-serif;">
    <h1>Application Crashed</h1>
    <p>Please check the console for details.</p>
    <pre>${String(error)}</pre>
  </div>`;
}