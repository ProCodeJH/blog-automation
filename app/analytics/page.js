'use client';
import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
    const [posts, setPosts] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/posts').then(r => r.json()).then(d => {
            if (d.success) setPosts(d.posts || []);
            setLoaded(true);
        }).catch(() => setLoaded(true));
    }, []);

    if (!loaded) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>;

    // === Compute analytics ===
    const total = posts.length;
    const published = posts.filter(p => p.status === 'published').length;
    const draft = posts.filter(p => p.status === 'draft').length;
    const scheduled = posts.filter(p => p.status === 'scheduled').length;
    const ready = posts.filter(p => p.status === 'ready').length;
    const totalImages = posts.reduce((s, p) => s + (p.images?.length || 0), 0);
    const avgSeo = posts.filter(p => p.seoScore > 0).length > 0
        ? Math.round(posts.filter(p => p.seoScore > 0).reduce((a, p) => a + p.seoScore, 0) / posts.filter(p => p.seoScore > 0).length)
        : 0;

    // Weekly trend (last 7 days)
    const now = new Date();
    const weekData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const count = posts.filter(p => p.createdAt?.startsWith(dateStr)).length;
        return { label: d.toLocaleDateString('ko-KR', { weekday: 'short' }), count, date: dateStr };
    });
    const maxWeek = Math.max(1, ...weekData.map(d => d.count));

    // Status distribution
    const statusData = [
        { label: '발행', count: published, color: 'var(--success)' },
        { label: '준비', count: ready, color: 'var(--info)' },
        { label: '예약', count: scheduled, color: 'var(--accent-secondary)' },
        { label: '초안', count: draft, color: 'var(--text-muted)' },
    ];
    const statusTotal = Math.max(1, statusData.reduce((s, d) => s + d.count, 0));

    // Category breakdown
    const categories = {};
    posts.forEach(p => {
        const cat = p.category || '미분류';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxCat = Math.max(1, ...catEntries.map(c => c[1]));

    // Tone usage
    const tones = {};
    posts.forEach(p => {
        const t = p.tone || 'friendly';
        tones[t] = (tones[t] || 0) + 1;
    });
    const toneEntries = Object.entries(tones).sort((a, b) => b[1] - a[1]);
    const maxTone = Math.max(1, ...toneEntries.map(t => t[1]));

    // SEO distribution
    const seoRanges = { '90+': 0, '80-89': 0, '70-79': 0, '50-69': 0, '<50': 0 };
    posts.forEach(p => {
        const s = p.seoScore || 0;
        if (s >= 90) seoRanges['90+']++;
        else if (s >= 80) seoRanges['80-89']++;
        else if (s >= 70) seoRanges['70-79']++;
        else if (s >= 50) seoRanges['50-69']++;
        else seoRanges['<50']++;
    });
    const seoColors = { '90+': 'var(--success)', '80-89': '#22d3ee', '70-79': 'hsl(45,100%,50%)', '50-69': 'var(--warning)', '<50': 'var(--error)' };
    const maxSeo = Math.max(1, ...Object.values(seoRanges));

    // Monthly trend (last 6 months)
    const monthData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStr = d.toISOString().slice(0, 7);
        const count = posts.filter(p => p.createdAt?.startsWith(monthStr)).length;
        return { label: d.toLocaleDateString('ko-KR', { month: 'short' }), count };
    });
    const maxMonth = Math.max(1, ...monthData.map(d => d.count));

    const BarChart = ({ data, maxVal, height = 120, barColor = 'var(--accent-primary)', labelKey = 'label', valueKey = 'count', colorKey = null }) => (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{d[valueKey]}</span>
                    <div style={{
                        width: '100%',
                        maxWidth: 40,
                        height: `${Math.max(4, (d[valueKey] / maxVal) * (height - 30))}px`,
                        background: colorKey && d[colorKey] ? d[colorKey] : barColor,
                        borderRadius: '4px 4px 2px 2px',
                        transition: 'height 0.5s ease',
                    }} />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{d[labelKey]}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <h2>📊 분석</h2>
                <p>BlogFlow 콘텐츠 분석 대시보드</p>
            </div>

            {/* KPI */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📝', label: '총 게시물', value: total, color: 'var(--accent-primary)' },
                    { icon: '✅', label: '발행 완료', value: published, color: 'var(--success)' },
                    { icon: '📅', label: '예약', value: scheduled, color: 'var(--accent-secondary)' },
                    { icon: '🎯', label: '평균 SEO', value: avgSeo, color: avgSeo >= 80 ? 'var(--success)' : 'hsl(45,100%,50%)' },
                    { icon: '📷', label: '총 이미지', value: totalImages, color: 'var(--info)' },
                    { icon: '📊', label: '주간 작성', value: weekData.reduce((s, d) => s + d.count, 0), color: 'var(--accent-primary)' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Weekly Trend */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📈 주간 작성 트렌드</h3>
                    <BarChart data={weekData} maxVal={maxWeek} barColor="var(--accent-primary)" />
                </div>

                {/* Monthly Trend */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📅 월별 추이 (6개월)</h3>
                    <BarChart data={monthData} maxVal={maxMonth} barColor="var(--accent-secondary)" />
                </div>

                {/* Status Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 상태 분포</h3>
                    <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                        {statusData.filter(d => d.count > 0).map((d, i) => (
                            <div key={i} style={{ flex: d.count, background: d.color, minWidth: 4, transition: 'flex 0.5s ease' }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {statusData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                                <span style={{ fontWeight: 700 }}>{d.count}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({Math.round(d.count / statusTotal * 100)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SEO Score Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🎯 SEO 점수 분포</h3>
                    <BarChart
                        data={Object.entries(seoRanges).map(([label, count]) => ({ label, count, color: seoColors[label] }))}
                        maxVal={maxSeo}
                        colorKey="color"
                    />
                </div>

                {/* Category Breakdown */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📁 카테고리별</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {catEntries.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</div>
                        ) : catEntries.map(([cat, count], i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>{cat}</span>
                                <div style={{ flex: 1, height: 16, background: 'var(--bg-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${(count / maxCat) * 100}%`, height: '100%', background: `hsl(${i * 50 + 200}, 70%, 55%)`, borderRadius: 8, transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tone Usage */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🎨 톤 분석</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {toneEntries.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</div>
                        ) : toneEntries.map(([tone, count], i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 12, minWidth: 70, color: 'var(--text-secondary)' }}>{tone}</span>
                                <div style={{ flex: 1, height: 16, background: 'var(--bg-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${(count / maxTone) * 100}%`, height: '100%', background: `hsl(${i * 70 + 260}, 65%, 55%)`, borderRadius: 8, transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
