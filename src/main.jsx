// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 
import { AppKitProvider } from "./src/AppKitProvider";

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletKitProvider>
      <App />
    </WalletKitProvider>
  </React.StrictMode>
);
