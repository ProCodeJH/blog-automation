'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: posts.length,
    drafts: posts.filter((p) => p.status === 'draft').length,
    ready: posts.filter((p) => p.status === 'ready').length,
    published: posts.filter((p) => p.status === 'published').length,
  };

  const recentPosts = posts.slice(0, 5);

  const getStatusBadge = (status) => {
    const map = {
      draft: { class: 'badge-draft', label: '초안' },
      ready: { class: 'badge-ready', label: '편집완료' },
      published: { class: 'badge-published', label: '발행됨' },
      scheduled: { class: 'badge-scheduled', label: '예약' },
    };
    const badge = map[status] || map.draft;
    return <span className={`post-status-badge ${badge.class}`}>{badge.label}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>📊 대시보드</h2>
        <p>블로그 자동화 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon">📝</div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">전체 게시물</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">✏️</div>
          <div className="stat-card-value">{stats.drafts}</div>
          <div className="stat-card-label">초안</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">✅</div>
          <div className="stat-card-value">{stats.ready}</div>
          <div className="stat-card-label">편집 완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🚀</div>
          <div className="stat-card-value">{stats.published}</div>
          <div className="stat-card-label">발행됨</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ 빠른 시작
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/editor" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            ✏️ 새 글 작성
          </Link>
          <Link href="/posts" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            📋 게시물 관리
          </Link>
          <Link href="/settings" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            ⚙️ 플랫폼 설정
          </Link>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 최근 게시물
          </h3>
          <Link href="/posts" style={{ fontSize: 13, color: 'var(--accent-secondary)', textDecoration: 'none' }}>
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            로딩 중...
          </div>
        ) : recentPosts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📝</div>
            <p>아직 작성한 글이 없습니다</p>
            <Link href="/editor" className="btn btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex' }}>
              첫 글 작성하기
            </Link>
          </div>
        ) : (
          <div className="posts-list">
            {recentPosts.map((post) => (
              <div key={post.id} className="post-card">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDate(post.createdAt)} · {post.images?.length || 0}장 이미지 · SEO {post.seoScore || 0}점
                  </div>
                </div>
                {getStatusBadge(post.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
