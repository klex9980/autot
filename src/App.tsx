import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { FormAnnuncio } from './features/annunci/FormAnnuncio';
import { ListaAnnunci } from './features/annunci/ListaAnnunci';
import { PaginaDati } from './features/dati/PaginaDati';
import { FormModello } from './features/modelli/FormModello';
import { ListaModelli } from './features/modelli/ListaModelli';
import { FormMotore } from './features/motori/FormMotore';
import { ListaMotori } from './features/motori/ListaMotori';

const VOCI = [
  { to: '/annunci', icona: '🚗', testo: 'Annunci' },
  { to: '/motori', icona: '⚙️', testo: 'Motori' },
  { to: '/modelli', icona: '📋', testo: 'Modelli' },
  { to: '/dati', icona: '💾', testo: 'Dati' },
];

export default function App() {
  return (
    // HashRouter: funziona su qualsiasi hosting statico senza configurazione
    <HashRouter>
      <nav className="nav">
        {VOCI.map((v) => (
          <NavLink key={v.to} to={v.to}><span aria-hidden>{v.icona}</span>{v.testo}</NavLink>
        ))}
      </nav>
      <main className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/annunci" replace />} />
          <Route path="/annunci" element={<ListaAnnunci />} />
          <Route path="/annunci/:id" element={<FormAnnuncio />} />
          <Route path="/motori" element={<ListaMotori />} />
          <Route path="/motori/:id" element={<FormMotore />} />
          <Route path="/modelli" element={<ListaModelli />} />
          <Route path="/modelli/:id" element={<FormModello />} />
          <Route path="/dati" element={<PaginaDati />} />
          <Route path="*" element={<p>Pagina non trovata.</p>} />
        </Routes>
      </main>
    </HashRouter>
  );
}
