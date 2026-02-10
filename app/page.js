'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => {
      if (d.success) setPosts(d.posts);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const stats = {
    total: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    ready: posts.filter(p => p.status === 'ready').length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    avgSeo: posts.filter(p => p.seoScore > 0).length > 0
      ? Math.round(posts.filter(p => p.seoScore > 0).reduce((a, p) => a + p.seoScore, 0) / posts.filter(p => p.seoScore > 0).length)
      : 0,
    totalImages: posts.reduce((sum, p) => sum + (p.images?.length || 0), 0),
  };

  // Weekly mini chart data
  const now = new Date();
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return posts.filter(p => p.createdAt?.startsWith(dateStr)).length;
  });
  const maxWeek = Math.max(1, ...weekData);

  // Monthly trend
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: `${d.getMonth() + 1}월`, count: posts.filter(p => p.createdAt?.startsWith(ym)).length };
  });
  const maxMonth = Math.max(1, ...monthData.map(m => m.count));

  // Tone breakdown
  const toneMap = {};
  posts.forEach(p => { toneMap[p.tone || 'friendly'] = (toneMap[p.tone || 'friendly'] || 0) + 1; });
  const toneIcons = { friendly: '😊', professional: '💼', humorous: '😂', emotional: '💕' };

  const recentPosts = [...posts].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);

  const quickActions = [
    { icon: '✏️', label: '새 글 작성', href: '/editor', desc: 'AI 파워블로거 에디터', color: 'var(--accent-primary)' },
    { icon: '🧠', label: 'AI 플래너', href: '/planner', desc: '7일 콘텐츠 전략', color: '#a855f7' },
    { icon: '📋', label: '게시물 관리', href: '/posts', desc: `${stats.total}개 저장됨`, color: 'var(--info)' },
    { icon: '🎬', label: '유튜브', href: '/youtube', desc: 'AI 메타 자동 생성', color: '#ff0000' },
    { icon: '📊', label: '분석', href: '/analytics', desc: 'SEO & 차트', color: 'var(--success)' },
    { icon: '⚙️', label: '설정', href: '/settings', desc: '4 플랫폼 연동', color: 'var(--text-muted)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>🏠 대시보드</h2>
        <p>BlogFlow v4.0 · AI 파워블로거 콘텐츠 시스템</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: '📝', label: '총 게시물', value: stats.total, color: 'var(--accent-primary)' },
          { icon: '✅', label: '발행 완료', value: stats.published, color: 'var(--success)' },
          { icon: '📅', label: '예약 대기', value: stats.scheduled, color: 'var(--accent-secondary)' },
          { icon: '📝', label: '초안', value: stats.draft, color: 'var(--text-muted)' },
          { icon: '🎯', label: '평균 SEO', value: stats.avgSeo, color: stats.avgSeo >= 80 ? 'var(--success)' : stats.avgSeo >= 50 ? 'hsl(45,100%,50%)' : 'var(--text-muted)' },
          { icon: '📷', label: '총 이미지', value: stats.totalImages, color: 'var(--info)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚡ 빠른 시작</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                <div className="post-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
                  <div style={{ fontSize: 24 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Weekly Trend */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📈 주간 활동</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
                {weekData.map((count, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', maxWidth: 22,
                      height: `${Math.max(3, (count / maxWeek) * 38)}px`,
                      background: count > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      borderRadius: 3, transition: 'height 0.3s ease',
                    }} />
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                      {['일', '월', '화', '수', '목', '금', '토'][(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i)).getDay()]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📊 월별 추이</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
                {monthData.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', maxWidth: 22,
                      height: `${Math.max(3, (m.count / maxMonth) * 38)}px`,
                      background: m.count > 0 ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
                      borderRadius: 3,
                    }} />
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tone + Status Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Status Distribution */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📋 상태 분포</h3>
              {stats.total > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: '발행', count: stats.published, color: 'var(--success)' },
                    { label: '준비', count: stats.ready, color: 'var(--info)' },
                    { label: '예약', count: stats.scheduled, color: 'var(--accent-secondary)' },
                    { label: '초안', count: stats.draft, color: 'var(--text-muted)' },
                  ].filter(s => s.count > 0).map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ minWidth: 28 }}>{s.label}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(s.count / stats.total) * 100}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ minWidth: 16, textAlign: 'right', color: 'var(--text-muted)' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>데이터 없음</div>}
            </div>

            {/* Tone Usage */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎭 톤 사용량</h3>
              {Object.keys(toneMap).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(toneMap).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span>{toneIcons[t] || '📝'}</span>
                      <span style={{ minWidth: 44 }}>{t}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(c / stats.total) * 100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3 }} />
                      </div>
                      <span style={{ minWidth: 16, textAlign: 'right', color: 'var(--text-muted)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>데이터 없음</div>}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>📄 최근 게시물</h3>
              <Link href="/posts" style={{ fontSize: 12, color: 'var(--accent-secondary)', textDecoration: 'none' }}>전체 보기 →</Link>
            </div>

            {!loaded ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>로딩 중...</div>
            ) : recentPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                <p>아직 게시물이 없습니다</p>
                <Link href="/editor" className="btn btn-primary" style={{ marginTop: 8, display: 'inline-block', textDecoration: 'none', fontSize: 12 }}>✏️ 첫 글 작성</Link>
              </div>
            ) : (
              <div className="posts-list" style={{ maxHeight: 180, overflow: 'auto' }}>
                {recentPosts.map((p) => (
                  <div key={p.id} className="post-card" style={{ padding: '10px 12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{p.title || '무제'}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`status-badge status-${p.status}`} style={{ fontSize: 10 }}>{p.status}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                        {p.seoScore > 0 && <span style={{ fontSize: 10, color: p.seoScore >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>SEO {p.seoScore}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
