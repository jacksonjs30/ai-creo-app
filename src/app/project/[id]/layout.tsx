'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, FileSearch, PenTool, ImagePlay, Activity, Blocks, Image as ImageIcon, FileText } from 'lucide-react';
import { use } from 'react';

const STEPS = [
  { id: 'brief', label: '1. Ingestion / Brief', icon: LayoutDashboard },
  { id: 'discovery', label: '2. Audience Discovery', icon: FileSearch },
  { id: 'avatars', label: '3. Avatar Research', icon: Users },
  { id: 'studio', label: '4. Creative Studio', icon: PenTool },
  { id: 'gallery', label: '5. Галерея Креативов', icon: ImageIcon },
  { id: 'adtexts', label: '6. Тексты объявлений', icon: FileText },
  { id: 'assets', label: '7. Asset Production', icon: ImagePlay },
  { id: 'feedback', label: '7. Feedback Loop', icon: Activity },
  { id: 'integrations', label: '8. Integrations / API', icon: Blocks },
];

export default function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'avatars'; // default to avatars

  return (
    <div className="workspace-layout">
      {/* Sidebar */}
      <aside className="workspace-sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--foreground)' }}>
              MarketingSpace
            </span>
          </Link>
          
          <div style={{ padding: '0.75rem', background: 'var(--secondary)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Active Project</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Project Workspace
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            MARKETING FUNNEL STEPS
          </div>
          <nav>
            {STEPS.map((step) => {
              const Icon = step.icon;
              // If we are deep inside a route (e.g. /avatar/0), don't highlight the tabs strictly,
              // or highlight 'avatars' if we are in avatar route.
              const isActive =
                pathname === `/project/${id}`
                  ? currentTab === step.id
                  : pathname.includes('/avatar/') && step.id === 'avatars';
              
              return (
                <Link 
                  key={step.id} 
                  href={`/project/${id}?tab=${step.id}`}
                  className={`workspace-step ${isActive ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Icon size={18} className="step-icon" />
                  <span style={{ fontSize: '0.875rem' }}>{step.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
            Synced to Supabase
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
            Local-First Buffer Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="workspace-content">
        {children}
      </main>
    </div>
  );
}
