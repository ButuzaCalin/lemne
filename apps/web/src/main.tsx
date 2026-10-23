import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Home } from './routes/Home';
import { HostRoot } from './routes/Host/HostRoot';
import { PlayRoot } from './routes/Play/PlayRoot';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:code" element={<HostRoot />} />
        <Route path="/play/:code" element={<PlayRoot />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
