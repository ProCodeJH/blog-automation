'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PostsPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/posts');
            const data = await res.json();
            if (data.success) setPosts(data.posts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (id) => {
        if (!confirm('이 게시물을 삭제하시겠습니까?')) return;
        try {
            await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
            setPosts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredPosts = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

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
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>📋 게시물 관리</h2>
                        <p>작성한 게시물을 관리하고 발행하세요</p>
                    </div>
                    <Link href="/editor" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        ✏️ 새 글 작성
                    </Link>
                </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'all', label: '전체' },
                    { key: 'draft', label: '초안' },
                    { key: 'ready', label: '편집완료' },
                    { key: 'published', label: '발행됨' },
                ].map((f) => (
                    <button
                        key={f.key}
                        className={`tone-chip ${filter === f.key ? 'active' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label} ({f.key === 'all' ? posts.length : posts.filter((p) => p.status === f.key).length})
                    </button>
                ))}
            </div>

            {/* Posts List */}
            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    로딩 중...
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📝</div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                        {filter === 'all' ? '아직 작성한 글이 없습니다' : `${filter} 상태의 글이 없습니다`}
                    </p>
                    <Link href="/editor" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        첫 글 작성하기
                    </Link>
                </div>
            ) : (
                <div className="posts-list">
                    {filteredPosts.map((post) => (
                        <div key={post.id} className="post-card">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {post.title}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    <span>📅 {formatDate(post.createdAt)}</span>
                                    <span>🖼️ {post.images?.length || 0}장</span>
                                    <span>📊 SEO {post.seoScore || 0}점</span>
                                    {post.tone && <span>🎨 {post.tone}</span>}
                                </div>
                                {post.tags && post.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                        {post.tags.slice(0, 5).map((tag) => (
                                            <span key={tag} className="tag" style={{ fontSize: 10 }}>#{tag}</span>
                                        ))}
                                        {post.tags.length > 5 && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{post.tags.length - 5}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                {getStatusBadge(post.status)}
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => deletePost(post.id)}
                                    style={{ color: 'var(--error)', fontSize: 18 }}
                                    title="삭제"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
