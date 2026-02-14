'use client';
import { useState, useEffect } from 'react';

export default function HistoryPage() {
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState({ platform: '', status: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, [filter]);

    const fetchHistory = async () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '100' });
        if (filter.platform) params.set('platform', filter.platform);
        if (filter.status) params.set('status', filter.status);
        try {
            const res = await fetch(`/api/history?${params}`);
            setRecords(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/history?action=stats');
            setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleClear = async () => {
        if (!confirm('모든 발행 이력을 삭제하시겠습니까?')) return;
        await fetch('/api/history', { method: 'DELETE' });
        fetchHistory();
        fetchStats();
    };

    const platformIcons = { naver: { icon: 'N', color: '#03c75a' }, wordpress: { icon: 'W', color: '#21759b' }, tistory: { icon: 'T', color: '#f36f21' }, velog: { icon: 'V', color: '#20c997' } };
    const statusBadge = (s) => s === 'success' ? { bg: '#dcfce7', color: '#16a34a', text: '성공' } : { bg: '#fee2e2', color: '#dc2626', text: '실패' };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>발행 이력</h2>
                        <p>모든 플랫폼 발행 기록을 한눈에 확인하세요</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={handleClear}>이력 삭제</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { fetchHistory(); fetchStats(); }}>새로고침</button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-primary)' }}>{stats.total}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>전체 발행</div>
                    </div>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{stats.today}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>오늘 발행</div>
                    </div>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#2563eb' }}>{stats.thisWeek}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>이번 주</div>
                    </div>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626' }}>{stats.totalFailed}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>실패</div>
                    </div>
                </div>
            )}

            {/* Platform Breakdown */}
            {stats?.byPlatform && Object.keys(stats.byPlatform).length > 0 && (
                <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>플랫폼별 발행</div>
                    <div style={{ display: 'flex', gap: 24 }}>
                        {Object.entries(stats.byPlatform).map(([p, count]) => {
                            const pi = platformIcons[p] || { icon: '?', color: '#888' };
                            return (
                                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 28, height: 28, borderRadius: 8, background: pi.color + '20', color: pi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{pi.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{count}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select className="form-input" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} value={filter.platform} onChange={(e) => setFilter(f => ({ ...f, platform: e.target.value }))}>
                    <option value="">모든 플랫폼</option>
                    <option value="naver">네이버</option>
                    <option value="wordpress">WordPress</option>
                    <option value="tistory">티스토리</option>
                    <option value="velog">Velog</option>
                </select>
                <select className="form-input" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}>
                    <option value="">모든 상태</option>
                    <option value="success">성공</option>
                    <option value="failed">실패</option>
                </select>
            </div>

            {/* Records Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
                ) : records.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>발행 이력이 없습니다</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>플랫폼</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>제목</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>상태</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>소요</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => {
                                const pi = platformIcons[r.platform] || { icon: '?', color: '#888' };
                                const sb = statusBadge(r.status);
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 16px' }}>
                                            <span style={{ width: 24, height: 24, borderRadius: 6, background: pi.color + '20', color: pi.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11 }}>{pi.icon}</span>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            {r.postUrl ? <a href={r.postUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{r.title}</a> : r.title}
                                            {r.error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{r.error}</div>}
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: sb.bg, color: sb.color, fontWeight: 600 }}>{sb.text}</span>
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{r.elapsed}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                                            {new Date(r.publishedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
