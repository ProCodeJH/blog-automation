'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [geminiKey, setGeminiKey] = useState('');
    const [gaId, setGaId] = useState('');
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

    // Naver
    const [naverCookies, setNaverCookies] = useState('');
    const [naverBlogId, setNaverBlogId] = useState('');
    const [naverTestResult, setNaverTestResult] = useState(null);
    const [naverTesting, setNaverTesting] = useState(false);

    const [masterPromptOverride, setMasterPromptOverride] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('blogflow_settings');
        if (saved) {
            const s = JSON.parse(saved);
            setGeminiKey(s.geminiKey || '');
            setGaId(s.gaId || '');
            setWpUrl(s.wpUrl || '');
            setWpUser(s.wpUser || '');
            setWpPass(s.wpPass || '');
            setTsToken(s.tsToken || '');
            setTsBlogName(s.tsBlogName || '');
            setYtClientId(s.ytClientId || '');
            setYtClientSecret(s.ytClientSecret || '');
            setYtAccessToken(s.ytAccessToken || '');
            setYtRefreshToken(s.ytRefreshToken || '');
            setNaverCookies(s.naverCookies || '');
            setNaverBlogId(s.naverBlogId || '');
            setMasterPromptOverride(s.masterPromptOverride || '');
        }
        const t = localStorage.getItem('blogflow_theme') || 'dark';
        setTheme(t);
        document.documentElement.setAttribute('data-theme', t);
    }, []);

    const handleSave = () => {
        localStorage.setItem('blogflow_settings', JSON.stringify({
            geminiKey, gaId, wpUrl, wpUser, wpPass,
            tsToken, tsBlogName,
            ytClientId, ytClientSecret, ytAccessToken, ytRefreshToken,
            naverCookies, naverBlogId,
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
        { key: 'naver', icon: 'N', label: '네이버 블로그', desc: naverCookies ? '쿠키 인증 (자동 발행)' : 'HTML 복사 모드', color: '#03c75a', status: naverCookies ? 'connected' : 'clipboard' },
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

                    {/* GA4 */}
                    <div className="card settings-section">
                        <h3>📊 Google Analytics</h3>
                        <div className="form-group">
                            <label className="form-label">GA4 Measurement ID</label>
                            <input type="text" className="form-input" placeholder="G-XXXXXXXXXX" value={gaId} onChange={(e) => setGaId(e.target.value)} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <a href="https://analytics.google.com" target="_blank" style={{ color: 'var(--info)' }}>Google Analytics</a> → 관리 → 데이터 스트림 → Measurement ID
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                                ⚠️ 서버 적용: <code>.env.local</code>에 <code>NEXT_PUBLIC_GA_MEASUREMENT_ID={gaId || 'G-XXXXXXXXXX'}</code> 추가
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

                    {/* Naver Cookie Auth */}
                    <div className="card settings-section">
                        <h3 style={{ color: '#03c75a' }}>N 네이버 블로그 (자동 발행)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="form-group">
                                <label className="form-label">블로그 ID (선택)</label>
                                <input type="text" className="form-input" placeholder="네이버 아이디 (자동 감지됨)" value={naverBlogId} onChange={(e) => setNaverBlogId(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">쿠키</label>
                                <textarea className="form-input" style={{ minHeight: 80, fontFamily: 'monospace', fontSize: 11 }}
                                    placeholder="NID_AUT=...; NID_SES=...; nid_inf=..."
                                    value={naverCookies}
                                    onChange={(e) => setNaverCookies(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button className="btn btn-sm" style={{ background: '#03c75a', color: '#fff', border: 'none' }} disabled={naverTesting || !naverCookies} onClick={async () => {
                                    setNaverTesting(true);
                                    setNaverTestResult(null);
                                    try {
                                        const res = await fetch('/api/naver/test-cookie', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ cookies: naverCookies }),
                                        });
                                        const data = await res.json();
                                        setNaverTestResult(data);
                                        if (data.blogId && !naverBlogId) setNaverBlogId(data.blogId);
                                    } catch (e) {
                                        setNaverTestResult({ success: false, message: e.message });
                                    }
                                    setNaverTesting(false);
                                }}>
                                    {naverTesting ? '⏳ 테스트 중...' : '🔍 쿠키 테스트'}
                                </button>
                                {naverTestResult && (
                                    <span style={{ fontSize: 12, color: naverTestResult.success ? 'var(--success)' : 'var(--danger)' }}>
                                        {naverTestResult.message}
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, padding: 10, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                <strong>📋 쿠키 추출 방법:</strong><br />
                                1. Chrome에서 <a href="https://blog.naver.com" target="_blank" style={{ color: '#03c75a' }}>blog.naver.com</a>에 로그인<br />
                                2. F12 → Application → Cookies → blog.naver.com<br />
                                3. <code>NID_AUT</code>, <code>NID_SES</code> 값을 복사<br />
                                4. 형식: <code>NID_AUT=값; NID_SES=값</code>
                            </div>
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
