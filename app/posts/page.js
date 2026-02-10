'use client';
import { useState, useEffect, useRef } from 'react';

export default function PostsPage() {
    const [posts, setPosts] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [toneFilter, setToneFilter] = useState('');
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [sortBy, setSortBy] = useState('newest');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const fileRef = useRef(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        const res = await fetch('/api/posts');
        const data = await res.json();
        if (data.success) setPosts(data.posts);
    };

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const res = await fetch('/api/posts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) setPosts((prev) => prev.filter((p) => p.id !== id));
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.size === 0) return;
        if (!confirm(`${selectedPosts.size}개의 게시물을 삭제하시겠습니까?`)) return;
        setIsDeleting(true);
        for (const id of selectedPosts) {
            await fetch('/api/posts', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
        }
        setSelectedPosts(new Set());
        await fetchPosts();
        setIsDeleting(false);
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedPosts.size === 0) return;
        for (const id of selectedPosts) {
            const post = posts.find(p => p.id === id);
            if (post) {
                await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...post, status: newStatus }),
                });
            }
        }
        setSelectedPosts(new Set());
        await fetchPosts();
    };

    const toggleSelectAll = () => {
        if (selectedPosts.size === filteredPosts.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
        }
    };

    const toggleSelect = (id) => {
        setSelectedPosts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const copyToClipboard = async (post) => {
        const text = `<h1>${post.title}</h1>\n${post.content}\n\n${(post.tags || []).map(t => `#${t}`).join(' ')}`;
        await navigator.clipboard.writeText(text);
        alert('HTML 복사 완료! 블로그에 붙여넣기 하세요');
    };

    // ⑦ Import handler
    const handleImport = async (format) => {
        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: importText, format }),
            });
            const data = await res.json();
            if (data.success) { alert(`✅ ${data.imported}개 가져오기 완료`); setShowImport(false); setImportText(''); fetchPosts(); }
            else alert('❌ ' + data.error);
        } catch (e) { alert('❌ ' + e.message); }
    };

    // ⑩ Export
    const handleExport = (format) => {
        const data = format === 'csv'
            ? 'title,rawText,tags,category,tone,status,seoScore\n' + posts.map(p => `"${p.title}","${(p.rawText || '').slice(0, 200)}","${(p.tags || []).join(';')}","${p.category || ''}","${p.tone || ''}","${p.status}","${p.seoScore || 0}"`).join('\n')
            : JSON.stringify(posts, null, 2);
        const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `blogflow-posts.${format}`; a.click();
        URL.revokeObjectURL(url);
    };

    const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
    const tones = [...new Set(posts.map(p => p.tone).filter(Boolean))];

    const filteredPosts = posts
        .filter((p) => filter === 'all' || p.status === filter)
        .filter((p) => !categoryFilter || p.category === categoryFilter)
        .filter((p) => !toneFilter || p.tone === toneFilter)
        .filter((p) => !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.rawText?.toLowerCase().includes(searchQuery.toLowerCase()) || (p.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === 'seo') return (b.seoScore || 0) - (a.seoScore || 0);
            if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            return 0;
        });

    const getSeoClass = (score) => score >= 80 ? 'seo-good' : score >= 50 ? 'seo-ok' : 'seo-bad';

    return (
        <div>
            <div className="page-header">
                <h2>📋 게시물 관리</h2>
                <p>{posts.length}개 게시물 · {posts.filter(p => p.status === 'published').length}개 발행됨</p>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" className="form-input" placeholder="🔍 제목·내용·태그 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 220, fontSize: 13 }} />

                <div style={{ display: 'flex', gap: 4 }}>
                    {['all', 'draft', 'ready', 'scheduled', 'published'].map((f) => (
                        <button key={f} className={`tone-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? '전체' : f}
                        </button>
                    ))}
                </div>

                {categories.length > 0 && (
                    <select className="form-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 'auto', fontSize: 13 }}>
                        <option value="">📂 카테고리</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}

                {tones.length > 0 && (
                    <select className="form-input" value={toneFilter} onChange={(e) => setToneFilter(e.target.value)} style={{ width: 'auto', fontSize: 13 }}>
                        <option value="">🎭 톤</option>
                        {tones.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                )}

                <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto', fontSize: 13 }}>
                    <option value="newest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="seo">SEO순</option>
                    <option value="title">제목순</option>
                </select>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>📥 가져오기</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExport('json')}>📤 JSON</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExport('csv')}>📤 CSV</button>
                </div>

                {selectedPosts.size > 0 && (
                    <div style={{ display: 'flex', gap: 6, width: '100%', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>{selectedPosts.size}개 선택</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatusChange('ready')}>준비 완료</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatusChange('published')}>발행</button>
                        <button className="btn btn-sm" style={{ background: 'var(--error)', color: '#fff' }} onClick={handleBulkDelete} disabled={isDeleting}>
                            {isDeleting ? '삭제 중...' : '🗑️ 삭제'}
                        </button>
                    </div>
                )}
            </div>

            {/* ⑦ Import Modal */}
            {showImport && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700 }}>📥 벌크 가져오기</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}>✕</button>
                    </div>
                    <textarea className="form-input" rows={6} placeholder={'JSON:\n[{"title":"제목","rawText":"내용","tags":["태그1"]}]\n\nCSV:\ntitle,rawText,tags,category,tone\n제목,내용,태그1;태그2,카테고리,friendly'} value={importText} onChange={e => setImportText(e.target.value)} style={{ fontSize: 12, fontFamily: 'monospace' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleImport('json')}>JSON 가져오기</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleImport('csv')}>CSV 가져오기</button>
                    </div>
                </div>
            )}

            {/* Posts Table */}
            <div className="card" style={{ padding: 0 }}>
                {filteredPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                        <p>게시물이 없습니다</p>
                        <a href="/editor" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>✏️ 글 작성하기</a>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>
                                    <input type="checkbox" checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0} onChange={toggleSelectAll} />
                                </th>
                                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>제목</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 70 }}>상태</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 50 }}>SEO</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 40 }}>📷</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 90 }}>날짜</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 100 }}>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.map((post) => (
                                <tr key={post.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <input type="checkbox" checked={selectedPosts.has(post.id)} onChange={() => toggleSelect(post.id)} />
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{post.title || '무제'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {post.tone && <span>{post.tone} · </span>}
                                            {post.category && <span>{post.category} · </span>}
                                            {(post.tags || []).slice(0, 3).map(t => `#${t}`).join(' ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        <span className={`status-badge status-${post.status}`}>{post.status}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        {post.seoScore > 0 && <span className={`seo-badge ${getSeoClass(post.seoScore)}`}>{post.seoScore}</span>}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                        {post.images?.length || 0}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                                        {new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                            {post.content && <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(post)} title="HTML 복사">📋</button>}
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(post.id)} title="삭제">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
