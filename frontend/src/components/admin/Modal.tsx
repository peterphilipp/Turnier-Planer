import { useState, useEffect } from 'react';

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

// ─── Global state (works outside React components) ───────────────────────
let _modalState: { type: ModalType; opts: any } = { type: null, opts: {} };
let _confirmResolve: ((value: boolean) => void) | null = null;
let _alertResolve: (() => void) | null = null;
let _formResolve: ((value: Record<string, any>) => void) | null = null;
let _listeners: (() => void)[] = [];

function triggerUpdate() {
  _listeners.forEach(l => l());
}

function clearState() {
  _modalState = { type: null, opts: {} };
  triggerUpdate();
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────
function ConfirmDialog({ opts }: { opts: ConfirmOpts }) {
  const [loading, setLoading] = useState(false);

  const variantStyles = {
    danger: { accent: '#dc3545', icon: '\u26A0\uFE0F' },
    warning: { accent: '#ffc107', icon: '\uD83D\uDD36' },
    info: { accent: '#0d6efd', icon: '\u2139\uFE0F' },
  };
  const style = variantStyles[opts.variant || 'warning'];

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget && _confirmResolve) _confirmResolve(false); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 420, width: '92%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{style.icon}</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#495057', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{opts.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => { if (_confirmResolve) _confirmResolve(false); }} style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', color: '#495057', fontSize: 14, fontWeight: 500, cursor: 'pointer', minWidth: 100 }}>
            {opts.cancelText || 'Abbrechen'}
          </button>
          <button onClick={() => { setLoading(true); if (_confirmResolve) _confirmResolve(true); }} disabled={loading} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: loading ? '#6c757d' : style.accent, color: opts.variant === 'warning' ? '#212529' : '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, minWidth: 100 }} >
            {loading ? '\u23F3\uFE0F' : (opts.confirmText || 'Best\u00E4tigen')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Dialog ────────────────────────────────────────────────────────
function AlertDialog({ opts }: { opts: AlertOpts }) {
  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget && _alertResolve) _alertResolve(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 420, width: '92%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#495057', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{opts.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => { if (_alertResolve) _alertResolve(); }} style={{ padding: '12px 32px', borderRadius: 8, border: 'none', background: '#0d6efd', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 100 }}>
            {opts.okText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Dialog ─────────────────────────────────────────────────────────
function FormDialog({ opts }: { opts: FormOpts }) {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleChange = (key: string, val: any) => setValues(prev => ({ ...prev, [key]: val }));

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget && _formResolve) _formResolve({}); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', maxWidth: 480, width: '92%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#212529' }}>{opts.title}</h3>
        {opts.fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 4 }}>{f.label}</label>
            {f.type === 'select' && f.options ? (
              <select value={values[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} style={{ width: '100%', padding: '12px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, background: '#fff', minHeight: 44 }}>
                <option value="">Bitte w\u00E4hlen...</option>
                {f.options.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} placeholder={f.placeholder} value={values[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} style={{ width: '100%', padding: '12px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14, minHeight: 44 }} />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>
          <button onClick={() => { if (_formResolve) _formResolve({}); }} style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', color: '#495057', fontSize: 14, fontWeight: 500, cursor: 'pointer', minWidth: 100 }}>
            {opts.cancelText || 'Abbrechen'}
          </button>
          <button onClick={() => { if (_formResolve) _formResolve(values); }} style={{ padding: '12px 32px', borderRadius: 8, border: 'none', background: '#0d6efd', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 100 }}>
            {opts.submitText || 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ModalRoot (syncs with global state via pub/sub) ────────────────────────
export function ModalRoot() {
  const [state, setState] = useState(_modalState);
  
  useEffect(() => {
    const handler = () => {
      setState({ ..._modalState });
    };
    _listeners.push(handler);
    return () => { 
      _listeners = _listeners.filter(l => l !== handler); 
    };
  }, []);

  if (!state.type) return null;

  if (state.type === 'confirm') return <ConfirmDialog opts={state.opts as ConfirmOpts} />;
  if (state.type === 'alert') return <AlertDialog opts={state.opts as AlertOpts} />;
  if (state.type === 'form') return <FormDialog opts={state.opts as FormOpts} />;
  return null;
}

// ─── Backward-compatible modal API ───────────────────────────────────────
export const modal = {
  confirm: (opts: Omit<ConfirmOpts, 'type'>): Promise<boolean> => {
    _modalState = { type: 'confirm', opts };
    triggerUpdate();
    return new Promise((resolve) => { 
      _confirmResolve = (val) => {
        clearState();
        resolve(val);
      }; 
    });
  },
  alert: (opts: Omit<AlertOpts, 'type'>): Promise<void> => {
    _modalState = { type: 'alert', opts };
    triggerUpdate();
    return new Promise((resolve) => { 
      _alertResolve = () => {
        clearState();
        resolve();
      }; 
    });
  },
  form: (opts: Omit<FormOpts, 'type'>): Promise<Record<string, any>> => {
    _modalState = { type: 'form', opts };
    triggerUpdate();
    return new Promise((resolve) => { 
      _formResolve = (val) => {
        clearState();
        resolve(val);
      }; 
    });
  },
};
