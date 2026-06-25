import Link from "next/link";

export default function TopHeader() {
  return (
    <header style={{ 
      padding: '1.5rem 0', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      borderBottom: '1px solid var(--border)', 
      marginBottom: '2rem' 
    }}>
      <Link href="/" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </div>
        <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
          MarketingSpace
        </span>
      </Link>
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <a 
          href="/api/auth/facebook" 
          className="btn" 
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#0866FF', 
            color: 'white', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook Ads
        </a>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>Professional</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mika@creo.ai</span>
        </div>
        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Выйти</button>
      </nav>
    </header>
  );
}
