import { useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────
export type ModalType = 'confirm' | 'alert' | 'form' | null;

interface ConfirmOpts {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface AlertOpts {
  title: string;
  message: string;
  okText?: string;
}

interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'password' | 'email' | 'select';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

interface FormOpts {
  title: string;
  fields: FormField[];
  submitText?: string;
  cancelText?: string;
}

// ─── Context ─────────────────────────────────────────────────────────────
const ModalContext = new (class {
  state: { type: ModalType; opts: any } = { type: null, opts: {} };
  listeners: Set<() => void> = new Set();

  open(type: 'confirm', opts: ConfirmOpts): Promise<boolean>;
  open(type: 'alert', opts: AlertOpts): Promise<void>;
  open(type: 'form', opts: FormOpts): Promise<Record<string, any>>;
  open(type: ModalType, opts: any): Promise<any> {
    return new Promise((resolve) => {
      this.state = { type, opts };
      this.listeners.forEach(fn => fn());

      const close = (result: any) => {
        this.state = { type: null, opts: {} };
        resolve(result);
      };

      if (type === 'confirm') {
        (window as any).__modalConfirmResolve = close;
      } else if (type === 'alert') {
        (window as any).__modalAlertResolve = close;
      } else if (type === 'form') {
        (window as any).__modalFormResolve = close;
      }
    });
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
})();

export const useModal = () => ModalContext;

// ─── Confirm Dialog ──────────────────────────────────────────────────────
function ConfirmDialog({ opts }: { opts: ConfirmOpts }) {
  const modal = useModal();
  const [loading, setLoading] = useState(false);

  const variantStyles = {
    danger: { accent: '#dc3545', icon: '\u26A0\uFE0F' },
    warning: { accent: '#ffc107', icon: '\uD83D\uDD36' },
    info: { accent: '#0d6efd', icon: '\u2139\uFE0F' },
  };
  const style = variantStyles[opts.variant || 'warning'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{style.icon}</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#495057', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{opts.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => (window as any).__modalConfirmResolve(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', color: '#495057', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {opts.cancelText || 'Abbrechen'}
          </button>
          <button onClick={() => { setLoading(true); (window as any).__modalConfirmResolve(true); }} disabled={loading} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: loading ? '#6c757d' : style.accent, color: opts.variant === 'warning' ? '#212529' : '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }} >
            {loading ? '\u23F3\uFE0F' : (opts.confirmText || 'Best\u00E4tigen')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Dialog ────────────────────────────────────────────────────────
function AlertDialog({ opts }: { opts: AlertOpts }) {
  const modal = useModal();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#495057', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{opts.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => (window as any).__modalAlertResolve()} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#0d6efd', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {opts.okText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Dialog ─────────────────────────────────────────────────────────
function FormDialog({ opts }: { opts: FormOpts }) {
  const modal = useModal();
  const [values, setValues] = useState<Record<string, any>>({});

  const handleChange = (key: string, val: any) => setValues(prev => ({ ...prev, [key]: val }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        {opts.fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 4 }}>{f.label}</label>
            {f.type === 'select' && f.options ? (
              <select value={values[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, background: '#fff' }}>
                <option value="">Bitte w\u00E4hlen...</option>
                {f.options.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} placeholder={f.placeholder} value={values[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 }} />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={() => (window as any).__modalFormResolve(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', color: '#495057', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {opts.cancelText || 'Abbrechen'}
          </button>
          <button onClick={() => (window as any).__modalFormResolve(values)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#0d6efd', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {opts.submitText || 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root Component (render once in App.tsx) ─────────────────────────────
export function ModalRoot() {
  const [state, setState] = useState(ModalContext.state);

  useModal().subscribe(() => setState({ ...ModalContext.state }));

  if (!state.type) return null;

  if (state.type === 'confirm') return <ConfirmDialog opts={state.opts as ConfirmOpts} />;
  if (state.type === 'alert') return <AlertDialog opts={state.opts as AlertOpts} />;
  if (state.type === 'form') return <FormDialog opts={state.opts as FormOpts} />;
  return null;
}

// ─── Convenience helpers ─────────────────────────────────────────────────
export const modal = {
  confirm: (opts: Omit<ConfirmOpts, 'type'>) => ModalContext.open('confirm', opts),
  alert: (opts: Omit<AlertOpts, 'type'>) => ModalContext.open('alert', opts),
  form: (opts: Omit<FormOpts, 'type'>) => ModalContext.open('form', opts),
};
