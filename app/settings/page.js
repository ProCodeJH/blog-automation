'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [geminiKey, setGeminiKey] = useState('');
    const [theme, setTheme] = useState('dark');

    // WordPress
    const [wpUrl, setWpUrl] = useState('');
    const [wpUser, setWpUser] = useState('');
    const [wpPass, setWpPass] = useState('');

    // Tistory
    const [tsToken, setTsToken] = useState('');
    const [tsBlogName, setTsBlogName] = useState('');

    // YouTube
    const [ytClientId, setYtClientId] = useState('');
    const [ytClientSecret, setYtClientSecret] = useState('');
    const [ytAccessToken, setYtAccessToken] = useState('');
    const [ytRefreshToken, setYtRefreshToken] = useState('');

    const [masterPromptOverride, setMasterPromptOverride] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('blogflow_settings');
        if (saved) {
            const s = JSON.parse(saved);
            setGeminiKey(s.geminiKey || '');
            setWpUrl(s.wpUrl || '');
            setWpUser(s.wpUser || '');
            setWpPass(s.wpPass || '');
            setTsToken(s.tsToken || '');
            setTsBlogName(s.tsBlogName || '');
            setYtClientId(s.ytClientId || '');
            setYtClientSecret(s.ytClientSecret || '');
            setYtAccessToken(s.ytAccessToken || '');
            setYtRefreshToken(s.ytRefreshToken || '');
            setMasterPromptOverride(s.masterPromptOverride || '');
        }
        const t = localStorage.getItem('blogflow_theme') || 'dark';
        setTheme(t);
        document.documentElement.setAttribute('data-theme', t);
    }, []);

    const handleSave = () => {
        localStorage.setItem('blogflow_settings', JSON.stringify({
            geminiKey, wpUrl, wpUser, wpPass,
            tsToken, tsBlogName,
            ytClientId, ytClientSecret, ytAccessToken, ytRefreshToken,
            masterPromptOverride,
        }));
        setSaveMsg('✅ 설정 저장 완료!');
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const toggleTheme = (t) => {
        setTheme(t);
        localStorage.setItem('blogflow_theme', t);
        document.documentElement.setAttribute('data-theme', t);
    };

    const platforms = [
        { key: 'wordpress', icon: 'W', label: 'WordPress', desc: 'REST API', color: '#21759b', status: wpUrl ? 'connected' : 'disconnected' },
        { key: 'tistory', icon: 'T', label: '티스토리', desc: 'Open API', color: '#f36f21', status: tsToken ? 'connected' : 'disconnected' },
        { key: 'youtube', icon: '▶', label: 'YouTube', desc: 'Data API v3', color: '#ff0000', status: ytAccessToken ? 'connected' : 'disconnected' },
        { key: 'naver', icon: 'N', label: '네이버 블로그', desc: 'API 없음 (클립보드 복사)', color: '#03c75a', status: 'clipboard' },
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
                                <a href="https://aistudio.google.com/apikey" target="_blank" style={{ color: 'var(--info)' }}>Google AI Studio</a>에서 발급
                            </span>
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="card settings-section">
                        <h3>🎨 테마</h3>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[
                                { key: 'dark', label: '🌙 다크' },
                                { key: 'light', label: '☀️ 라이트' },
                            ].map((t) => (
                                <button key={t.key} className={`tone-chip ${theme === t.key ? 'active' : ''}`} onClick={() => toggleTheme(t.key)} style={{ flex: 1, padding: '12px 16px' }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* WordPress */}
                    <div className="card settings-section">
                        <h3>W WordPress</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input type="url" className="form-input" placeholder="https://yourblog.com" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} />
                            <input type="text" className="form-input" placeholder="사용자명" value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
                            <input type="password" className="form-input" placeholder="Application Password" value={wpPass} onChange={(e) => setWpPass(e.target.value)} />
                        </div>
                    </div>

                    {/* Tistory */}
                    <div className="card settings-section">
                        <h3 style={{ color: '#f36f21' }}>T 티스토리</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="form-group">
                                <label className="form-label">블로그명</label>
                                <input type="text" className="form-input" placeholder="myblog (myblog.tistory.com)" value={tsBlogName} onChange={(e) => setTsBlogName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Access Token</label>
                                <input type="password" className="form-input" placeholder="티스토리 Open API 토큰" value={tsToken} onChange={(e) => setTsToken(e.target.value)} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <a href="https://www.tistory.com/guide/api/manage/register" target="_blank" style={{ color: '#f36f21' }}>티스토리 API 관리</a>에서 앱 등록 후 토큰 발급
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Platforms */}
                    <div className="card settings-section">
                        <h3>📤 연동 상태</h3>
                        <div className="platform-grid">
                            {platforms.map((p) => (
                                <div key={p.key} className="platform-card">
                                    <div className="platform-icon" style={{ background: p.color + '20', color: p.color, fontWeight: 800, fontSize: 16 }}>{p.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </div>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'connected' ? 'var(--success)' : p.status === 'clipboard' ? 'var(--warning)' : 'var(--text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* YouTube */}
                    <div className="card settings-section">
                        <h3 style={{ color: '#ff0000' }}>▶ YouTube</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="form-group">
                                <label className="form-label">Client ID</label>
                                <input type="text" className="form-input" placeholder="Google Cloud Console에서 발급" value={ytClientId} onChange={(e) => setYtClientId(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client Secret</label>
                                <input type="password" className="form-input" placeholder="OAuth 2.0 Client Secret" value={ytClientSecret} onChange={(e) => setYtClientSecret(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Access Token</label>
                                <input type="password" className="form-input" placeholder="OAuth 인증 후 발급되는 토큰" value={ytAccessToken} onChange={(e) => setYtAccessToken(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Refresh Token (선택)</label>
                                <input type="password" className="form-input" placeholder="토큰 자동 갱신용" value={ytRefreshToken} onChange={(e) => setYtRefreshToken(e.target.value)} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style={{ color: '#ff0000' }}>Google Cloud Console</a> → YouTube Data API v3 활성화 → OAuth 2.0 클라이언트 생성
                            </span>
                        </div>
                    </div>

                    {/* Custom Prompt */}
                    <div className="card settings-section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3>🧠 AI 프롬프트</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPromptEditor(!showPromptEditor)}>
                                {showPromptEditor ? '접기' : '편집'}
                            </button>
                        </div>
                        {showPromptEditor && (
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <textarea className="form-input" style={{ minHeight: 100 }} placeholder="마스터 프롬프트에 추가할 지시사항..." value={masterPromptOverride} onChange={(e) => setMasterPromptOverride(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-primary btn-lg" onClick={handleSave}>💾 설정 저장</button>
                {saveMsg && <span style={{ color: 'var(--success)', fontSize: 14 }}>{saveMsg}</span>}
            </div>
        </div>
    );
}
