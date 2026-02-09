'use client';
import { useState } from 'react';

export default function SettingsPage() {
    const [geminiKey, setGeminiKey] = useState('');
    const [saved, setSaved] = useState(false);

    const [wpUrl, setWpUrl] = useState('');
    const [wpUsername, setWpUsername] = useState('');
    const [wpAppPassword, setWpAppPassword] = useState('');

    const platforms = [
        {
            id: 'wordpress',
            name: 'WordPress',
            icon: '🔵',
            status: 'API 지원',
            statusColor: 'var(--success)',
            desc: 'REST API + Application Password',
        },
        {
            id: 'naver',
            name: '네이버 블로그',
            icon: '🟢',
            status: 'API 지원',
            statusColor: 'var(--success)',
            desc: 'Blog Write API (OAuth)',
        },
        {
            id: 'tistory',
            name: '티스토리',
            icon: '🟠',
            status: '브라우저 자동화',
            statusColor: 'var(--warning)',
            desc: 'Puppeteer 기반 (API 종료됨)',
        },
        {
            id: 'velog',
            name: '벨로그',
            icon: '🟣',
            status: '브라우저 자동화',
            statusColor: 'var(--warning)',
            desc: 'Puppeteer 기반',
        },
    ];

    const handleSaveKey = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div>
            <div className="page-header">
                <h2>⚙️ 설정</h2>
                <p>AI 엔진 및 블로그 플랫폼 연동을 관리합니다</p>
            </div>

            {/* Gemini API Key */}
            <div className="card settings-section" style={{ marginBottom: 24 }}>
                <h3>🤖 Gemini AI 설정</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Google AI Studio에서 발급받은 API 키를 입력하세요. <code>.env.local</code> 파일에도 설정 가능합니다.
                </p>
                <div className="form-group" style={{ maxWidth: 500 }}>
                    <label className="form-label">GEMINI API KEY</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="AIzaSy..."
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={handleSaveKey}>
                            {saved ? '✅ 저장됨' : '저장'}
                        </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        💡 보안: API 키는 서버 사이드에서만 사용됩니다
                    </div>
                </div>
            </div>

            {/* Platform Settings */}
            <div className="card settings-section" style={{ marginBottom: 24 }}>
                <h3>📤 플랫폼 연동</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    블로그 플랫폼별 연동 상태를 확인하고 설정하세요
                </p>

                <div className="platform-grid">
                    {platforms.map((p) => (
                        <div key={p.id} className="platform-card">
                            <div className="platform-icon" style={{ fontSize: 28 }}>{p.icon}</div>
                            <div className="platform-info" style={{ flex: 1 }}>
                                <h4>{p.name}</h4>
                                <span>{p.desc}</span>
                                <div style={{ marginTop: 4, fontSize: 11, color: p.statusColor, fontWeight: 600 }}>
                                    ● {p.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* WordPress Settings */}
            <div className="card settings-section">
                <h3>🔵 WordPress 연동</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    WordPress REST API 연동 정보를 입력하세요
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
                    <div className="form-group">
                        <label className="form-label">사이트 URL</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="https://your-blog.com"
                            value={wpUrl}
                            onChange={(e) => setWpUrl(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">사용자명</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="admin"
                            value={wpUsername}
                            onChange={(e) => setWpUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Application Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="xxxx xxxx xxxx xxxx"
                            value={wpAppPassword}
                            onChange={(e) => setWpAppPassword(e.target.value)}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            WordPress 대시보드 → 사용자 → 프로필 → Application Password에서 생성
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                        연동 저장
                    </button>
                </div>
            </div>
        </div>
    );
}
