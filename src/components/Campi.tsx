import type { ReactNode } from 'react';
import { etichetta } from '../db/schema';

interface Base { etichetta: string; intero?: boolean; aiuto?: ReactNode }

/** Casella "da verificare" collegata all'elenco daVerificare del record. */
export function FlagVerifica({ campo, elenco, onChange }: { campo: string; elenco: string[]; onChange: (l: string[]) => void }) {
  const attivo = elenco.includes(campo);
  return (
    <span className="verifica" title="Segna questo dato come da verificare">
      <input type="checkbox" checked={attivo}
        onChange={(e) => onChange(e.target.checked ? [...elenco, campo] : elenco.filter((c) => c !== campo))} />
      <span className={attivo ? 'da-verificare' : ''}>da verificare</span>
    </span>
  );
}

function Contenitore({ etichetta: et, intero, extra, children, aiuto }: Base & { extra?: ReactNode; children: ReactNode }) {
  return (
    <div className={'campo' + (intero ? ' intero' : '')}>
      <label><span>{et}</span>{extra}</label>
      {children}
      {aiuto && <div className="tenue" style={{ fontSize: '.8rem', marginTop: 4 }}>{aiuto}</div>}
    </div>
  );
}

export function CampoTesto(p: Base & { valore: string; onChange: (v: string) => void; extra?: ReactNode; multilinea?: boolean; tipo?: string; placeholder?: string }) {
  return (
    <Contenitore {...p}>
      {p.multilinea
        ? <textarea value={p.valore} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />
        : <input type={p.tipo ?? 'text'} value={p.valore} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />}
    </Contenitore>
  );
}

export function CampoNumero(p: Base & { valore: number | null; onChange: (v: number | null) => void; extra?: ReactNode; min?: number; max?: number; passo?: number; placeholder?: string }) {
  return (
    <Contenitore {...p}>
      <input type="number" inputMode="decimal" value={p.valore ?? ''} min={p.min} max={p.max} step={p.passo ?? 'any'}
        placeholder={p.placeholder}
        onChange={(e) => p.onChange(e.target.value === '' ? null : Number(e.target.value))} />
    </Contenitore>
  );
}

export function CampoScelta<T extends string>(p: Base & {
  valore: T | null; opzioni: readonly T[]; onChange: (v: T | null) => void; vuoto?: string; extra?: ReactNode;
}) {
  return (
    <Contenitore {...p}>
      <select value={p.valore ?? ''} onChange={(e) => p.onChange(e.target.value === '' ? null : (e.target.value as T))}>
        {p.vuoto !== undefined && <option value="">{p.vuoto}</option>}
        {p.opzioni.map((o) => <option key={o} value={o}>{etichetta(o)}</option>)}
      </select>
    </Contenitore>
  );
}

/** Mostra un valore con l'avviso se il campo è da verificare. */
export function Val({ children, campo, daVerificare }: { children: ReactNode; campo: string; daVerificare: string[] }) {
  return daVerificare.includes(campo)
    ? <span className="da-verificare" title="Dato da verificare">{children} ⚠</span>
    : <>{children}</>;
}
