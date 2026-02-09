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

  const recentPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const quickActions = [
    { icon: '✏️', label: '새 글 작성', href: '/editor', desc: 'AI 파워블로거 에디터', color: 'var(--accent-primary)' },
    { icon: '📋', label: '게시물 관리', href: '/posts', desc: `${stats.total}개 저장됨`, color: 'var(--info)' },
    { icon: '📅', label: '캘린더', href: '/calendar', desc: '발행 스케줄 관리', color: 'var(--accent-secondary)' },
    { icon: '📊', label: '분석', href: '/analytics', desc: 'SEO & 통계', color: 'var(--success)' },
    { icon: '🔍', label: '키워드 리서치', href: '/editor', desc: '에디터에서 사용', color: 'hsl(45,100%,50%)' },
    { icon: '⚙️', label: '설정', href: '/settings', desc: 'API & 플랫폼', color: 'var(--text-muted)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>🏠 대시보드</h2>
        <p>BlogFlow v2.0 · AI 파워블로거 편집 시스템</p>
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

        {/* Recent Posts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>📄 최근 게시물</h3>
            <Link href="/posts" style={{ fontSize: 12, color: 'var(--accent-secondary)', textDecoration: 'none' }}>전체 보기 →</Link>
          </div>

          {!loaded ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : recentPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <p>아직 게시물이 없습니다</p>
              <Link href="/editor" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>✏️ 첫 글 작성하기</Link>
            </div>
          ) : (
            <div className="posts-list">
              {recentPosts.map((p) => (
                <div key={p.id} className="post-card">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title || '무제'}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`status-badge status-${p.status}`}>{p.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                      {p.seoScore > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SEO {p.seoScore}</span>}
                    </div>
                  </div>
                  {p.images?.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📷{p.images.length}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
