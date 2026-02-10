'use client';
import { useState } from 'react';

export default function PlannerPage() {
    const [category, setCategory] = useState('');
    const [niche, setNiche] = useState('');
    const [plan, setPlan] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

    const niches = [
        { key: 'lifestyle', label: '🏠 라이프스타일', color: '#ec4899' },
        { key: 'tech', label: '💻 IT/테크', color: '#3b82f6' },
        { key: 'food', label: '🍽️ 맛집/요리', color: '#f97316' },
        { key: 'travel', label: '✈️ 여행', color: '#06b6d4' },
        { key: 'beauty', label: '💄 뷰티', color: '#a855f7' },
        { key: 'finance', label: '💰 재테크', color: '#22c55e' },
        { key: 'parenting', label: '👶 육아', color: '#f59e0b' },
        { key: 'health', label: '🏃 건강', color: '#ef4444' },
    ];

    const handleGenerate = async () => {
        if (!category.trim() && !niche) { showToast('❌ 카테고리 또는 니치를 선택하세요'); return; }
        setIsGenerating(true);
        setPlan(null);
        try {
            const res = await fetch('/api/ai/planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: category || niche, niche: niche || category }),
            });
            const data = await res.json();
            if (data.success && data.plan) {
                setPlan(data.plan);
                showToast('✅ 7일 콘텐츠 플랜 생성 완료!');
            } else { showToast('❌ 플랜 생성 실패'); }
        } catch (e) { showToast('❌ ' + e.message); }
        finally { setIsGenerating(false); }
    };

    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    const getDifficultyColor = (d) => d === '쉬움' ? '#22c55e' : d === '보통' ? '#f59e0b' : '#ef4444';

    return (
        <div>
            {toastMessage && (
                <div className="toast-container">
                    <div className={`toast ${toastMessage.startsWith('✅') ? 'toast-success' : 'toast-error'}`}>{toastMessage}</div>
                </div>
            )}

            <div className="page-header">
                <h2>📅 AI 콘텐츠 플래너</h2>
                <p>AI가 7일간의 최적화된 콘텐츠 전략을 설계합니다</p>
            </div>

            {/* Config */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="form-label">카테고리 · 니치 키워드</label>
                        <input type="text" className="form-input" placeholder="예: 주식투자 초보, 강남 카페 리뷰, 홈트레이닝..." value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">빠른 선택</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {niches.map(n => (
                                <button key={n.key} className={`tone-chip ${niche === n.key ? 'active' : ''}`} onClick={() => setNiche(n.key)} style={{ borderColor: niche === n.key ? n.color : undefined, color: niche === n.key ? n.color : undefined }}>
                                    {n.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating} style={{ height: 42 }}>
                        {isGenerating ? <><span className="spinner"></span> 생성 중...</> : '🤖 7일 플랜 생성'}
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isGenerating && (
                <div className="ai-generating" style={{ minHeight: 300 }}>
                    <div style={{ fontSize: 48 }}>📅</div>
                    <p>AI가 7일간의 콘텐츠 전략을 설계 중...</p>
                    <div className="dots"><span></span><span></span><span></span></div>
                </div>
            )}

            {/* Plan Grid */}
            {plan && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {plan.map((day, i) => (
                            <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                                {/* Day Badge */}
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                                    {dayNames[i] || i + 1}
                                </div>

                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Day {i + 1}</div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.4, paddingRight: 40 }}>{day.title}</h3>

                                {day.topic && (
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{day.topic}</div>
                                )}

                                {/* Meta Row */}
                                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                                    {day.estimatedReadingTime && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: 20 }}>📖 {day.estimatedReadingTime}분</span>
                                    )}
                                    {day.difficulty && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', background: getDifficultyColor(day.difficulty) + '20', color: getDifficultyColor(day.difficulty), borderRadius: 20, fontWeight: 600 }}>{day.difficulty}</span>
                                    )}
                                    {day.targetAudience && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(59,130,246,0.1)', color: 'var(--info)', borderRadius: 20 }}>🎯 {day.targetAudience}</span>
                                    )}
                                </div>

                                {/* Keywords */}
                                {day.keywords?.length > 0 && (
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>키워드</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {day.keywords.map((k, ki) => (
                                                <span key={ki} className="tag" style={{ fontSize: 10 }}>#{k}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Outline */}
                                {day.outline?.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>구성</div>
                                        {day.outline.map((item, oi) => (
                                            <div key={oi} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '2px 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, minWidth: 14 }}>{oi + 1}.</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>🔄 다시 생성</button>
                        <button className="btn btn-secondary" onClick={() => {
                            const text = plan.map((d, i) => `## Day ${i + 1}: ${d.title}\n주제: ${d.topic || ''}\n키워드: ${(d.keywords || []).join(', ')}\n구성: ${(d.outline || []).map((o, oi) => `${oi + 1}. ${o}`).join(' | ')}\n`).join('\n');
                            navigator.clipboard.writeText(text);
                            showToast('✅ 플랜 복사 완료');
                        }}>📋 플랜 복사</button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!plan && !isGenerating && (
                <div className="preview-placeholder" style={{ minHeight: 300 }}>
                    <div className="preview-placeholder-icon">📅</div>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>AI 콘텐츠 플래너</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>카테고리를 입력하고 7일 플랜을 생성하세요</p>
                    </div>
                </div>
            )}
        </div>
    );
}
