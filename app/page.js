'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ── Inline SVG Icons ── */
const SvgIcon = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const QuickIcons = {
  editor: <SvgIcon><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z" /></SvgIcon>,
  planner: <SvgIcon><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></SvgIcon>,
  posts: <SvgIcon><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></SvgIcon>,
  youtube: <SvgIcon><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></SvgIcon>,
  analytics: <SvgIcon><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m19 9-5 5-4-4-3 3" /></SvgIcon>,
  settings: <SvgIcon><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></SvgIcon>,
  empty: <SvgIcon size={24}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18v-6" /><path d="m9 15 3-3 3 3" /></SvgIcon>,
};

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

  // Weekly chart
  const now = new Date();
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return { count: posts.filter(p => p.createdAt?.startsWith(dateStr)).length, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] };
  });
  const maxWeek = Math.max(1, ...weekData.map(w => w.count));

  // Monthly trend
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: `${d.getMonth() + 1}`, count: posts.filter(p => p.createdAt?.startsWith(ym)).length };
  });
  const maxMonth = Math.max(1, ...monthData.map(m => m.count));

  // Tone breakdown
  const toneMap = {};
  posts.forEach(p => { toneMap[p.tone || 'friendly'] = (toneMap[p.tone || 'friendly'] || 0) + 1; });
  const toneLabels = { friendly: '친근한', professional: '전문적', humorous: '유머', emotional: '감성' };

  const recentPosts = [...posts].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);

  const quickActions = [
    { icon: QuickIcons.editor, label: '새 글 작성', href: '/editor', desc: 'AI 파워블로거 에디터' },
    { icon: QuickIcons.planner, label: 'AI 플래너', href: '/planner', desc: '7일 콘텐츠 전략' },
    { icon: QuickIcons.posts, label: '게시물 관리', href: '/posts', desc: `${stats.total}개 저장됨` },
    { icon: QuickIcons.youtube, label: '유튜브', href: '/youtube', desc: 'AI 메타 자동 생성' },
    { icon: QuickIcons.analytics, label: '분석', href: '/analytics', desc: 'SEO & 차트' },
    { icon: QuickIcons.posts, label: '발행 이력', href: '/history', desc: '전체 발행 기록' },
    { icon: QuickIcons.settings, label: '설정', href: '/settings', desc: '4 플랫폼 연동' },
  ];

  const statusMap = { published: 'success', ready: 'info', scheduled: 'warning', draft: 'neutral' };
  const statusLabels = { published: '발행', ready: '준비', scheduled: '예약', draft: '초안' };

  return (
    <div>
      <div className="page-header">
        <h2 className="text-h1">대시보드</h2>
        <p className="text-body">BlogFlow v6.0 · AI 콘텐츠 스튜디오</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: '총 게시물', value: stats.total },
          { label: '발행 완료', value: stats.published, color: 'var(--success)' },
          { label: '예약 대기', value: stats.scheduled, color: 'var(--accent-hover)' },
          { label: '초안', value: stats.draft },
          { label: '평균 SEO', value: stats.avgSeo, color: stats.avgSeo >= 80 ? 'var(--success)' : stats.avgSeo >= 50 ? 'var(--warning)' : 'var(--text-muted)' },
          { label: '총 이미지', value: stats.totalImages, color: 'var(--info)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Quick Actions — left column, spans 2 rows */}
        <div className="card bento-main">
          <div className="section-title">시작하기</div>
          <div className="quick-actions-grid">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href} className="quick-action-card">
                <div className="quick-action-icon">{a.icon}</div>
                <div>
                  <div className="quick-action-label">{a.label}</div>
                  <div className="quick-action-desc">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="card">
          <div className="section-title">주간 활동</div>
          <div className="chart-container">
            {weekData.map((w, i) => (
              <div key={i} className="chart-col">
                <div
                  className={`chart-bar${w.count > 0 ? ' active' : ''}`}
                  style={{ height: `${Math.max(3, (w.count / maxWeek) * 42)}px` }}
                >
                  {w.count > 0 && <div className="chart-bar-tooltip">{w.count}</div>}
                </div>
                <div className="chart-bar-label">{w.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="card">
          <div className="section-title">월별 추이</div>
          <div className="chart-container">
            {monthData.map((m, i) => (
              <div key={i} className="chart-col">
                <div
                  className={`chart-bar${m.count > 0 ? ' active' : ''}`}
                  style={{ height: `${Math.max(3, (m.count / maxMonth) * 42)}px` }}
                >
                  {m.count > 0 && <div className="chart-bar-tooltip">{m.count}</div>}
                </div>
                <div className="chart-bar-label">{m.label}월</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status + Tone — full width row */}
        <div className="card">
          <div className="section-title">상태 분포</div>
          {stats.total > 0 ? (
            <div className="data-rows">
              {[
                { label: '발행', count: stats.published, color: 'var(--success)' },
                { label: '준비', count: stats.ready, color: 'var(--info)' },
                { label: '예약', count: stats.scheduled, color: 'var(--accent-hover)' },
                { label: '초안', count: stats.draft, color: 'var(--text-muted)' },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} className="data-row">
                  <span className="data-row-label">{s.label}</span>
                  <div className="data-row-bar">
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${(s.count / stats.total) * 100}%`, background: s.color }} />
                    </div>
                  </div>
                  <span className="data-row-value">{s.count}</span>
                </div>
              ))}
            </div>
          ) : <div className="empty-state"><span className="empty-state-text">데이터 없음</span></div>}
        </div>

        <div className="card">
          <div className="section-title">톤 분포</div>
          {Object.keys(toneMap).length > 0 ? (
            <div className="data-rows">
              {Object.entries(toneMap).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
                <div key={t} className="data-row">
                  <span className="data-row-label">{toneLabels[t] || t}</span>
                  <div className="data-row-bar">
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${(c / stats.total) * 100}%` }} />
                    </div>
                  </div>
                  <span className="data-row-value">{c}</span>
                </div>
              ))}
            </div>
          ) : <div className="empty-state"><span className="empty-state-text">데이터 없음</span></div>}
        </div>

        {/* Recent Posts — full width */}
        <div className="card bento-full">
          <div className="section-title">
            최근 게시물
          </div>

          {!loaded ? (
            <div className="skeleton-rows">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton skeleton-text" style={{ height: 40 }} />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{QuickIcons.empty}</div>
              <span className="empty-state-text">아직 게시물이 없습니다</span>
              <Link href="/editor" className="btn btn-primary btn-sm">첫 글 작성</Link>
            </div>
          ) : (
            <div className="posts-list">
              {recentPosts.map((p) => (
                <div key={p.id} className="post-item">
                  <div style={{ flex: 1 }}>
                    <div className="post-item-title">{p.title || '무제'}</div>
                    <div className="post-item-meta">
                      <span className={`badge badge-${statusMap[p.status] || 'neutral'}`}>{statusLabels[p.status] || p.status}</span>
                      <span>
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                      {p.seoScore > 0 && (
                        <span style={{ color: p.seoScore >= 80 ? 'var(--success)' : 'var(--text-muted)' }}>
                          SEO {p.seoScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href="/editor" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {recentPosts.length > 0 && (
            <>
              <div className="divider" />
              <Link href="/posts" className="text-caption" style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>
                전체 보기 →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
