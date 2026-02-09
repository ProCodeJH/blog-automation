'use client';
import { useState, useEffect, useMemo } from 'react';

export default function AnalyticsPage() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        fetch('/api/posts').then(r => r.json()).then(d => {
            if (d.success) setPosts(d.posts);
        });
    }, []);

    // Stats
    const stats = useMemo(() => {
        const total = posts.length;
        const byStatus = { draft: 0, ready: 0, scheduled: 0, published: 0 };
        const byTone = {};
        const byCategory = {};
        const seoScores = [];
        const weeklyCount = new Array(7).fill(0);
        const monthlyCount = new Array(12).fill(0);

        posts.forEach((p) => {
            byStatus[p.status] = (byStatus[p.status] || 0) + 1;
            if (p.tone) byTone[p.tone] = (byTone[p.tone] || 0) + 1;
            if (p.category) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
            if (p.seoScore > 0) seoScores.push(p.seoScore);
            const d = new Date(p.createdAt);
            weeklyCount[d.getDay()]++;
            monthlyCount[d.getMonth()]++;
        });

        const avgSeo = seoScores.length > 0 ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length) : 0;
        const maxSeo = seoScores.length > 0 ? Math.max(...seoScores) : 0;
        const totalImages = posts.reduce((sum, p) => sum + (p.images?.length || 0), 0);

        return { total, byStatus, byTone, byCategory, avgSeo, maxSeo, seoScores, weeklyCount, monthlyCount, totalImages };
    }, [posts]);

    const toneLabels = { friendly: '😊 친근', professional: '💼 전문', humorous: '😂 유머', emotional: '💕 감성' };
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const monthLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    const BarChart = ({ data, labels, maxVal, color }) => {
        const max = maxVal || Math.max(...data, 1);
        return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {data.map((v, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v || ''}</span>
                        <div style={{ width: '100%', height: `${Math.max((v / max) * 100, 4)}%`, background: color || 'var(--accent-primary)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{labels[i]}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div>
            <div className="page-header">
                <h2>📊 분석 대시보드</h2>
                <p>콘텐츠 성과와 작성 패턴을 분석합니다</p>
            </div>

            {/* KPI Cards */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {[
                    { icon: '📝', label: '총 게시물', value: stats.total, color: 'var(--accent-primary)' },
                    { icon: '🎯', label: '평균 SEO', value: stats.avgSeo, color: stats.avgSeo >= 80 ? 'var(--success)' : stats.avgSeo >= 50 ? 'hsl(45,100%,50%)' : 'var(--error)' },
                    { icon: '🏆', label: '최고 SEO', value: stats.maxSeo, color: 'var(--accent-secondary)' },
                    { icon: '📷', label: '총 이미지', value: stats.totalImages, color: 'var(--info)' },
                ].map((s) => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Weekly Pattern */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📆 요일별 작성 패턴</h3>
                    <BarChart data={stats.weeklyCount} labels={dayLabels} color="var(--accent-primary)" />
                </div>

                {/* Monthly Trend */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📈 월별 추이</h3>
                    <BarChart data={stats.monthlyCount} labels={monthLabels} color="var(--accent-secondary)" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Status Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📋 상태별 분류</h3>
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                        <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span className={`status-badge status-${status}`}>{status}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 80, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`, background: 'var(--accent-primary)', borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{count}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tone Usage */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎭 톤 사용 빈도</h3>
                    {Object.entries(stats.byTone).sort((a, b) => b[1] - a[1]).map(([tone, count]) => (
                        <div key={tone} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 13 }}>{toneLabels[tone] || tone}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>{count}</span>
                        </div>
                    ))}
                    {Object.keys(stats.byTone).length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>아직 데이터가 없어요</p>}
                </div>

                {/* Category */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🏷️ 카테고리</h3>
                    {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 13 }}>{cat}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-secondary)' }}>{count}</span>
                        </div>
                    ))}
                    {Object.keys(stats.byCategory).length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>아직 데이터가 없어요</p>}
                </div>
            </div>

            {/* SEO Score Distribution */}
            {stats.seoScores.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎯 SEO 점수 분포</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { label: '90~100', range: [90, 100], color: '#22c55e' },
                            { label: '70~89', range: [70, 89], color: '#3b82f6' },
                            { label: '50~69', range: [50, 69], color: '#eab308' },
                            { label: '0~49', range: [0, 49], color: '#ef4444' },
                        ].map((r) => {
                            const count = stats.seoScores.filter(s => s >= r.range[0] && s <= r.range[1]).length;
                            return (
                                <div key={r.label} style={{ flex: 1, padding: 12, background: r.color + '15', border: `1px solid ${r.color}40`, borderRadius: 8, textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: r.color }}>{count}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.label}점</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
