import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { applyNativeChrome, isNativeApp } from './lib/runtime';
import './index.css';

applyNativeChrome();

const Router = isNativeApp() ? HashRouter : BrowserRouter;

if (isNativeApp()) {
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', () => {
      if (window.history.length > 1) window.history.back();
      else CapApp.exitApp();
    });
  }).catch(() => {});
  import('./lib/nativeDeepLink').then(({ bindNativeDeepLinks }) => {
    bindNativeDeepLinks().catch(() => {});
  }).catch(() => {});
  import('@capacitor/keyboard').then(({ Keyboard }) => {
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>,
);
