import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackRender={({ error }) => <div>{error.stack}</div>}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
