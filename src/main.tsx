// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import App from './App';
// import './index.css';

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>
// );
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// import { Toaster } from 'react-hot-toast';

// ❌ REMOVE BrowserRouter from here
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  //   {/* ❌ Remove this BrowserRouter wrapper */}
  //   <App /> {/* Just render App directly */}
  // </React.StrictMode>
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
  <App />
</React.StrictMode>
);