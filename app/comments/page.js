'use client';
import { useState, useEffect } from 'react';

export default function CommentsPage() {
    const [comments, setComments] = useState([]);
    const [stats, setStats] = useState({});
    const [filter, setFilter] = useState('all');
    const [replyTo, setReplyTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [newComment, setNewComment] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [loaded, setLoaded] = useState(false);

    const loadComments = () => {
        fetch(`/api/comments?filter=${filter}`).then(r => r.json()).then(d => {
            if (d.success) { setComments(d.comments || []); setStats(d.stats || {}); }
            setLoaded(true);
        }).catch(() => setLoaded(true));
    };

    useEffect(() => { loadComments(); }, [filter]);

    const addComment = async () => {
        if (!newComment.trim()) return;
        await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: newAuthor || '관리자', content: newComment }),
        });
        setNewComment(''); setNewAuthor('');
        loadComments();
    };

    const addReply = async (parentId) => {
        if (!replyText.trim()) return;
        await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: '관리자', content: replyText, parentId }),
        });
        setReplyTo(null); setReplyText('');
        loadComments();
    };

    const deleteComment = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
        loadComments();
    };

    const sentimentBadge = (s) => {
        const map = {
            positive: { icon: '😊', label: '긍정', color: 'var(--success)' },
            negative: { icon: '😟', label: '부정', color: 'var(--error)' },
            neutral: { icon: '😐', label: '중립', color: 'var(--text-muted)' },
            spam: { icon: '🚫', label: '스팸', color: 'var(--warning)' },
        };
        const m = map[s] || map.neutral;
        return (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: m.color + '20', color: m.color, fontWeight: 600 }}>
                {m.icon} {m.label}
            </span>
        );
    };

    if (!loaded) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>;

    return (
        <div>
            <div className="page-header">
                <h2>💬 댓글 관리</h2>
                <p>블로그 댓글 모니터링 · 감정 분석 · 스팸 필터링</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { icon: '💬', label: '전체', value: stats.total || 0, color: 'var(--accent-primary)' },
                    { icon: '😊', label: '긍정', value: stats.positive || 0, color: 'var(--success)' },
                    { icon: '😟', label: '부정', value: stats.negative || 0, color: 'var(--error)' },
                    { icon: '😐', label: '중립', value: stats.neutral || 0, color: 'var(--text-muted)' },
                    { icon: '🚫', label: '스팸', value: stats.spam || 0, color: 'var(--warning)' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                {/* Left: Comments list */}
                <div>
                    {/* Filter */}
                    <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { k: 'all', l: '전체' },
                            { k: 'positive', l: '😊 긍정' },
                            { k: 'negative', l: '😟 부정' },
                            { k: 'neutral', l: '😐 중립' },
                            { k: 'spam', l: '🚫 스팸' },
                        ].map(f => (
                            <button key={f.k} className={`tone-chip ${filter === f.k ? 'active' : ''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{comments.length}개</span>
                    </div>

                    {/* Comments */}
                    {comments.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                            <div>댓글이 없습니다</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {comments.map(c => (
                                <div key={c.id} className="card" style={{ padding: 16, opacity: c.isSpam ? 0.6 : 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                                                {(c.author || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.author}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('ko-KR')}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {sentimentBadge(c.sentiment)}
                                            <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ fontSize: 11 }}>💬 답글</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => deleteComment(c.id)} style={{ fontSize: 11, color: 'var(--error)' }}>🗑️</button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', paddingLeft: 40 }}>{c.content}</div>

                                    {/* Replies */}
                                    {c.replies?.length > 0 && (
                                        <div style={{ marginTop: 12, paddingLeft: 40 }}>
                                            {c.replies.map(r => (
                                                <div key={r.id} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 6, borderLeft: '3px solid var(--accent-primary)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 600 }}>↳ {r.author}</span>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => deleteComment(r.id)} style={{ fontSize: 10, color: 'var(--error)' }}>🗑️</button>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply input */}
                                    {replyTo === c.id && (
                                        <div style={{ marginTop: 8, paddingLeft: 40, display: 'flex', gap: 8 }}>
                                            <input type="text" className="form-input" style={{ flex: 1, fontSize: 12 }} placeholder="답글 내용..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addReply(c.id)} />
                                            <button className="btn btn-primary btn-sm" onClick={() => addReply(c.id)}>전송</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Add + Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Add comment (test) */}
                    <div className="card">
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✏️ 테스트 댓글</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input type="text" className="form-input" placeholder="작성자명" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} style={{ fontSize: 12 }} />
                            <textarea className="form-input" placeholder="댓글 내용 (감정 분석이 자동으로 적용됩니다)" value={newComment} onChange={e => setNewComment(e.target.value)} style={{ fontSize: 12, minHeight: 80 }} />
                            <button className="btn btn-primary btn-sm" onClick={addComment}>댓글 추가</button>
                        </div>
                    </div>

                    {/* Sentiment chart */}
                    <div className="card">
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 감정 분석</h3>
                        {(stats.total || 0) > 0 ? (
                            <>
                                <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                                    {stats.positive > 0 && <div style={{ flex: stats.positive, background: 'var(--success)', transition: 'flex 0.5s' }} />}
                                    {stats.neutral > 0 && <div style={{ flex: stats.neutral, background: 'var(--text-muted)', transition: 'flex 0.5s' }} />}
                                    {stats.negative > 0 && <div style={{ flex: stats.negative, background: 'var(--error)', transition: 'flex 0.5s' }} />}
                                    {stats.spam > 0 && <div style={{ flex: stats.spam, background: 'var(--warning)', transition: 'flex 0.5s' }} />}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    긍정률 {Math.round((stats.positive / stats.total) * 100)}%
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</div>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="card">
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💡 댓글 관리 팁</h3>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <div>• 스팸 댓글은 자동으로 필터링됩니다</div>
                            <div>• 부정 댓글에는 빠르게 답글을 달아주세요</div>
                            <div>• 긍정 댓글은 감사 답글로 소통 강화</div>
                            <div>• 주기적으로 스팸 필터를 확인하세요</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
