import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AccountProvider } from './contexts/AccountContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastContainer
      position="top-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="dark"
    />
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AccountProvider>
        <App />
      </AccountProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);