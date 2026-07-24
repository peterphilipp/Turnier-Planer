import { useEffect, useRef } from 'react';

interface EditModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export default function EditModal({ title, onClose, children, width = 500 }: EditModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Tablet-responsive width
  const modalWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? '95vw' : `min(${width}px, 90vw)`;

  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: modalWidth, maxWidth: width, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}>×</button>
        </div>
        
        {/* Scrollable Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
