'use client';

import dynamic from 'next/dynamic';

const KontrolClient = dynamic(() => import('./KontrolClient'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #16a34a',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
          aria-hidden
        />
        <p style={{ color: '#475569', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Memuat panel kontrol...</p>
      </div>
    </div>
  ),
});

export default function KontrolWrapper() {
  return <KontrolClient />;
}
