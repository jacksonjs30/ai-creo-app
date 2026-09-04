'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReferralsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = async (p = 1) => {
    try {
      setLoading(true);
      setError(false);
      
      const [sumRes, refRes] = await Promise.all([
        fetch('/api/referral/summary'),
        fetch(`/api/referral/referrals?page=${p}&per_page=20`)
      ]);

      if (!sumRes.ok || !refRes.ok) throw new Error('Fetch failed');

      const sumData = await sumRes.json();
      const refData = await refRes.json();

      setSummary(sumData);
      setReferrals(refData);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const handleCopy = () => {
    if (summary?.referral_url) {
      navigator.clipboard.writeText(summary.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error && !summary) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <h2>Couldn't load your referral data.</h2>
        <button onClick={() => fetchData(page)} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Block 1 - Hero */}
      <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Refer a friend, get {summary ? formatCents(summary.reward_cents) : '$20'}</h1>
        <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '1.5rem', maxWidth: '600px' }}>
          Share your link. When someone signs up and makes their first payment, you get {summary ? formatCents(summary.reward_cents) : '$20'} in account credit — and they get {summary?.referred_discount_percent || 20}% off their first month.
        </p>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            readOnly 
            value={summary?.referral_url || ''} 
            onClick={(e) => (e.target as HTMLInputElement).select()}
            placeholder={loading ? "Loading your link..." : ""}
            style={{ flex: '1', minWidth: '250px', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', outline: 'none' }}
          />
          <button 
            onClick={handleCopy}
            disabled={!summary?.referral_url}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', minWidth: '120px' }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        {summary?.referral_url && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <a href={`mailto:?subject=20% off&body=I've been using this product and thought you'd like it. Here's 20% off your first month: ${encodeURIComponent(summary.referral_url)}`} 
               style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              ✉️ Email
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been using this product and thought you'd like it. Here's 20% off your first month: ${summary.referral_url}`)}`} target="_blank" rel="noopener noreferrer"
               style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              🐦 X (Twitter)
            </a>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`I've been using this product and thought you'd like it. Here's 20% off your first month: ${summary.referral_url}`)}`} target="_blank" rel="noopener noreferrer"
               style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              💬 WhatsApp
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(summary.referral_url)}`} target="_blank" rel="noopener noreferrer"
               style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              💼 LinkedIn
            </a>
          </div>
        )}
      </div>

      {/* Block 2 - Stats */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Your referrals</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Signups</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary?.stats.signups ?? '-'}</div>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Paid</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary?.stats.paid ?? '-'}</div>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Earned</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary ? formatCents(summary.stats.total_earned_cents) : '-'}</div>
        </div>
      </div>
      
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px', color: '#166534', marginBottom: summary?.stats.pending_cents > 0 ? '0.5rem' : '2rem' }}>
        <strong>Available credit: {summary ? formatCents(summary.balance_cents) : '-'}</strong> — applied automatically to your next invoice
      </div>
      
      {summary?.stats.pending_cents > 0 && (
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
          {formatCents(summary.stats.pending_cents)} pending — will be credited after the {summary.hold_days}-day qualifying period
        </div>
      )}

      {/* Block 3 - Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem' }}>
        {loading && !referrals ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : referrals?.items.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>No referrals yet</h3>
            <p style={{ color: '#64748b', margin: 0, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.5 }}>
              Share your link above. You'll see signups here as soon as someone joins.
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>User</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Signed up</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals?.items.map((ref: any) => {
                    let statusLabel = '';
                    let statusColor = '';
                    let statusBg = '';
                    let rewardText = '';
                    let tooltip = '';
                    
                    if (ref.status === 'signed_up') {
                      statusLabel = 'Signed up';
                      statusColor = '#475569';
                      statusBg = '#f1f5f9';
                      rewardText = '—';
                      tooltip = 'Waiting for their first payment';
                    } else if (ref.status === 'paid') {
                      statusLabel = 'Paid';
                      statusColor = '#1d4ed8';
                      statusBg = '#dbeafe';
                      rewardText = `${summary ? formatCents(summary.reward_cents) : '$20'} pending`;
                      tooltip = `Credit will be added on ${ref.reward_due_at ? formatDate(ref.reward_due_at) : 'soon'}`;
                    } else if (ref.status === 'rewarded') {
                      statusLabel = 'Credited';
                      statusColor = '#15803d';
                      statusBg = '#dcfce7';
                      rewardText = summary ? formatCents(ref.reward_cents || summary.reward_cents) : '$20';
                      tooltip = 'Added to your balance';
                    } else if (ref.status === 'rejected') {
                      statusLabel = 'Not eligible';
                      statusColor = '#475569';
                      statusBg = '#f1f5f9';
                      rewardText = '—';
                      const reasons: Record<string, string> = {
                        'self_referral': 'Self-referrals aren\'t eligible',
                        'existing_user': 'This account already existed',
                        'same_ip': 'Couldn\'t verify this referral',
                        'churned_in_hold': 'Subscription didn\'t stay active for 30 days',
                        'refunded': 'The payment was refunded',
                        'monthly_cap': 'Monthly referral limit reached',
                        'same_payment_method': 'Couldn\'t verify this referral'
                      };
                      tooltip = ref.reject_reason ? (reasons[ref.reject_reason] || 'Rejected') : 'Rejected';
                    }

                    return (
                      <tr key={ref.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontSize: '0.95rem' }}>{ref.masked_email}</td>
                        <td style={{ padding: '1rem', fontSize: '0.95rem', color: '#64748b' }}>{formatDate(ref.signed_up_at)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ background: statusBg, color: statusColor, padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }} title={tooltip}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.95rem' }} title={tooltip}>{rewardText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {referrals?.total > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', gap: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <button 
                  disabled={page * 20 >= referrals.total} 
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: page * 20 >= referrals.total ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Block 4 - How it works */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>How it works</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '0.5rem' }}>1</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Share your link</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>Send it to colleagues, post it anywhere. No limits.</p>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '0.5rem' }}>2</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>They sign up and subscribe</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>Their {summary?.referred_discount_percent || 20}% discount is applied automatically at checkout.</p>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '0.5rem' }}>3</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>You get {summary ? formatCents(summary.reward_cents) : '$20'} in credit</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>After {summary?.hold_days || 30} days, credit lands on your balance and reduces your next invoice.</p>
        </div>
      </div>

      {/* Block 5 - Program terms */}
      <details style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <summary style={{ fontWeight: 600, cursor: 'pointer', outline: 'none' }}>Program terms</summary>
        <ul style={{ marginTop: '1rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, paddingLeft: '1.5rem' }}>
          <li>Credit is issued for the referred user's first successful payment, provided their subscription is still active 30 days later.</li>
          <li>You cannot refer yourself, your own additional accounts, or people using your payment method.</li>
          <li>Credit is applied to your account balance and cannot be withdrawn as cash.</li>
          <li>Up to 10 credited referrals per calendar month.</li>
          <li>Credit expires 12 months after it is issued.</li>
          <li>Credit may be reversed if the referred payment is refunded or charged back, or if we detect abuse.</li>
          <li>We may change these terms at any time. Credit already issued will not be affected.</li>
        </ul>
      </details>
      
    </div>
  );
}
