'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [geminiKey, setGeminiKey] = useState('');
    const [theme, setTheme] = useState('dark');
    const [wpUrl, setWpUrl] = useState('');
    const [wpUser, setWpUser] = useState('');
    const [wpPass, setWpPass] = useState('');
    const [saveMsg, setSaveMsg] = useState('');
    const [masterPromptOverride, setMasterPromptOverride] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('blogflow_settings');
        if (saved) {
            const s = JSON.parse(saved);
            setGeminiKey(s.geminiKey || '');
            setWpUrl(s.wpUrl || '');
            setWpUser(s.wpUser || '');
            setWpPass(s.wpPass || '');
            setMasterPromptOverride(s.masterPromptOverride || '');
        }
        const t = localStorage.getItem('blogflow_theme') || 'dark';
        setTheme(t);
        document.documentElement.setAttribute('data-theme', t);
    }, []);

    const handleSave = () => {
        localStorage.setItem('blogflow_settings', JSON.stringify({ geminiKey, wpUrl, wpUser, wpPass, masterPromptOverride }));
        setSaveMsg('✅ 설정 저장 완료!');
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const toggleTheme = (t) => {
        setTheme(t);
        localStorage.setItem('blogflow_theme', t);
        document.documentElement.setAttribute('data-theme', t);
    };

    const platforms = [
        { key: 'wordpress', icon: 'W', label: 'WordPress', desc: 'REST API 연동', color: '#21759b', status: wpUrl ? 'connected' : 'disconnected' },
        { key: 'naver', icon: 'N', label: '네이버 블로그', desc: 'API 연동 (준비 중)', color: '#03c75a', status: 'coming' },
        { key: 'tistory', icon: 'T', label: '티스토리', desc: '자동 발행 (준비 중)', color: '#f36f21', status: 'coming' },
        { key: 'velog', icon: 'V', label: '벨로그', desc: '자동 발행 (준비 중)', color: '#20c997', status: 'coming' },
    ];

    return (
        <div>
            <div className="page-header">
                <h2>⚙️ 설정</h2>
                <p>API 키, 플랫폼 연동, 테마, AI 프롬프트를 관리합니다</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* API Key */}
                    <div className="card settings-section">
                        <h3>🔑 Gemini API 키</h3>
                        <div className="form-group">
                            <input type="password" className="form-input" placeholder="AIza..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <a href="https://aistudio.google.com/apikey" target="_blank" style={{ color: 'var(--info)' }}>Google AI Studio</a>에서 발급 가능
                            </span>
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="card settings-section">
                        <h3>🎨 테마</h3>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[
                                { key: 'dark', label: '🌙 다크', desc: '기본' },
                                { key: 'light', label: '☀️ 라이트', desc: '밝은 모드' },
                            ].map((t) => (
                                <button key={t.key} className={`tone-chip ${theme === t.key ? 'active' : ''}`} onClick={() => toggleTheme(t.key)} style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 20 }}>{t.label.split(' ')[0]}</span>
                                    <span style={{ fontSize: 11 }}>{t.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* WordPress */}
                    <div className="card settings-section">
                        <h3>W WordPress 연동</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="form-group">
                                <label className="form-label">사이트 URL</label>
                                <input type="url" className="form-input" placeholder="https://yourblog.com" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">사용자명</label>
                                <input type="text" className="form-input" placeholder="admin" value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Application Password</label>
                                <input type="password" className="form-input" placeholder="xxxx xxxx xxxx" value={wpPass} onChange={(e) => setWpPass(e.target.value)} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                WordPress → 사용자 → 보안 → Application Passwords에서 생성
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Platforms */}
                    <div className="card settings-section">
                        <h3>📤 플랫폼 연동 상태</h3>
                        <div className="platform-grid">
                            {platforms.map((p) => (
                                <div key={p.key} className="platform-card">
                                    <div className="platform-icon" style={{ background: p.color + '20', color: p.color, fontWeight: 800, fontSize: 16 }}>{p.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </div>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'connected' ? 'var(--success)' : p.status === 'coming' ? 'var(--warning)' : 'var(--text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Custom Prompt */}
                    <div className="card settings-section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3>🧠 AI 프롬프트 커스터마이징</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPromptEditor(!showPromptEditor)}>
                                {showPromptEditor ? '접기' : '편집'}
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                            마스터 프롬프트에 추가 지시사항을 영구적으로 적용합니다
                        </p>
                        {showPromptEditor && (
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <textarea className="form-input" style={{ minHeight: 120 }} placeholder="예: 항상 결론 부분에 '좋아요/공유 부탁드려요' 추가해줘, 이모지를 더 많이 사용해줘, 각 문단을 짧게 써줘..." value={masterPromptOverride} onChange={(e) => setMasterPromptOverride(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* About */}
                    <div className="card settings-section">
                        <h3>ℹ️ BlogFlow 정보</h3>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                            <div><strong>버전</strong>: 2.0 (Phase 20+)</div>
                            <div><strong>AI 엔진</strong>: Google Gemini 2.0 Flash</div>
                            <div><strong>기능</strong>: 8가지 템플릿, 키워드 리서치, 캘린더, 분석</div>
                            <div><strong>저장소</strong>: <a href="https://github.com/ProCodeJH/blog-automation" target="_blank" style={{ color: 'var(--info)' }}>GitHub</a></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-primary btn-lg" onClick={handleSave}>💾 설정 저장</button>
                {saveMsg && <span style={{ color: 'var(--success)', fontSize: 14 }}>{saveMsg}</span>}
            </div>
        </div>
    );
}
