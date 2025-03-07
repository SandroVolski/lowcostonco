import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Importe o componente App
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> {/* Renderize o App, que contém o Router */}
  </React.StrictMode>
);