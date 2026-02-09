'use client';
import { useState } from 'react';

const YOUTUBE_CATEGORIES = [
    { id: '1', name: 'Film & Animation' },
    { id: '2', name: 'Autos & Vehicles' },
    { id: '10', name: 'Music' },
    { id: '15', name: 'Pets & Animals' },
    { id: '17', name: 'Sports' },
    { id: '20', name: 'Gaming' },
    { id: '22', name: 'People & Blogs' },
    { id: '23', name: 'Comedy' },
    { id: '24', name: 'Entertainment' },
    { id: '25', name: 'News & Politics' },
    { id: '26', name: 'Howto & Style' },
    { id: '27', name: 'Education' },
    { id: '28', name: 'Science & Technology' },
];

export default function YouTubePage() {
    const [videoFile, setVideoFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [categoryId, setCategoryId] = useState('22');
    const [privacyStatus, setPrivacyStatus] = useState('private');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const getYouTubeCredentials = () => {
        try {
            const saved = localStorage.getItem('blogflow_settings');
            if (saved) {
                const s = JSON.parse(saved);
                return {
                    clientId: s.ytClientId || '',
                    clientSecret: s.ytClientSecret || '',
                    accessToken: s.ytAccessToken || '',
                    refreshToken: s.ytRefreshToken || '',
                };
            }
        } catch { }
        return { clientId: '', clientSecret: '', accessToken: '', refreshToken: '' };
    };

    const handleVideoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('동영상 파일만 업로드 가능합니다.');
                return;
            }
            setVideoFile(file);
            setError('');
            // Auto-generate title from filename
            if (!title) {
                const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                setTitle(name);
            }
        }
    };

    const handleAIGenerate = async () => {
        if (!title) {
            setError('제목을 먼저 입력해주세요.');
            return;
        }
        setIsGeneratingAI(true);
        try {
            const res = await fetch('/api/ai/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: `YouTube 동영상 설명을 작성해주세요.\n제목: ${title}\n카테고리: ${YOUTUBE_CATEGORIES.find(c => c.id === categoryId)?.name || ''}\n추가 메모: ${description}`,
                    tone: 'friendly',
                    category: 'YouTube',
                    customPromptAddition: '유튜브 영상 설명글로 작성해주세요. 해시태그와 키워드를 포함하고, 시청자의 관심을 끌 수 있는 설명문을 만들어주세요. SEO 최적화된 태그 10개도 추천해주세요.',
                }),
            });
            const data = await res.json();
            if (data.success && data.result) {
                if (data.result.metaDescription) setDescription(data.result.metaDescription + '\n\n' + (data.result.content || '').replace(/<[^>]+>/g, '').slice(0, 500));
                if (data.result.tags) setTags(data.result.tags.join(', '));
            } else {
                setError('AI 생성 실패: ' + (data.error || '알 수 없는 오류'));
            }
        } catch (err) {
            setError('AI 생성 오류: ' + err.message);
        }
        setIsGeneratingAI(false);
    };

    const handleUpload = async () => {
        if (!videoFile) {
            setError('동영상 파일을 선택해주세요.');
            return;
        }
        if (!title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }

        const creds = getYouTubeCredentials();
        if (!creds.clientId || !creds.clientSecret || !creds.accessToken) {
            setError('YouTube API 인증 정보를 설정에서 입력해주세요.\n(Client ID, Client Secret, Access Token 필요)');
            return;
        }

        setUploading(true);
        setProgress('동영상 준비 중...');
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('tags', tags);
            formData.append('privacyStatus', privacyStatus);
            formData.append('categoryId', categoryId);
            formData.append('clientId', creds.clientId);
            formData.append('clientSecret', creds.clientSecret);
            formData.append('accessToken', creds.accessToken);
            formData.append('refreshToken', creds.refreshToken);

            setProgress('YouTube에 업로드 중... (파일 크기에 따라 시간이 걸릴 수 있습니다)');

            const res = await fetch('/api/youtube/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                setResult(data);
                setProgress('');
            } else {
                setError(data.error || '업로드 실패');
                setProgress('');
            }
        } catch (err) {
            setError('업로드 오류: ' + err.message);
            setProgress('');
        }

        setUploading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h2>🎬 유튜브 업로드</h2>
                <p>동영상을 업로드하고 AI로 제목/설명/태그를 자동 생성합니다</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left: Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Video File */}
                    <div className="card">
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📁 동영상 파일</h3>
                        {!videoFile ? (
                            <label className="image-uploader" style={{ cursor: 'pointer' }}>
                                <div className="upload-icon">🎥</div>
                                <div className="upload-text">동영상 파일을 선택하세요</div>
                                <div className="upload-hint">MP4, MOV, AVI, WebM 지원</div>
                                <input type="file" accept="video/*" onChange={handleVideoSelect} hidden />
                            </label>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ fontSize: 32 }}>🎬</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{videoFile.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setVideoFile(null)}>✕</button>
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>📝 동영상 정보</h3>
                            <button className="btn btn-secondary btn-sm" onClick={handleAIGenerate} disabled={isGeneratingAI || !title}>
                                {isGeneratingAI ? '🔄 AI 생성 중...' : '🤖 AI 자동 생성'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">제목 *</label>
                                <input type="text" className="form-input" placeholder="동영상 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">설명</label>
                                <textarea className="form-input" style={{ minHeight: 120 }} placeholder="동영상 설명 (AI 자동 생성 가능)" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">태그 (쉼표 구분)</label>
                                <input type="text" className="form-input" placeholder="태그1, 태그2, 태그3" value={tags} onChange={(e) => setTags(e.target.value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">카테고리</label>
                                    <select className="form-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                        {YOUTUBE_CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">공개 설정</label>
                                    <select className="form-input" value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value)}>
                                        <option value="private">🔒 비공개</option>
                                        <option value="unlisted">🔗 일부 공개</option>
                                        <option value="public">🌍 공개</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Preview & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Preview */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>👁️ 미리보기</h3>
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                            <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                {videoFile ? (
                                    <video src={URL.createObjectURL(videoFile)} controls style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)' }} />
                                ) : (
                                    <span style={{ fontSize: 48, opacity: 0.3 }}>🎬</span>
                                )}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title || '동영상 제목'}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                                {description || '동영상 설명이 여기에 표시됩니다'}
                            </div>
                            {tags && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {tags.split(',').map((tag, i) => (
                                        <span key={i} className="tag">{tag.trim()}</span>
                                    ))}
                                </div>
                            )}
                            <div style={{ marginTop: 12, display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>📁 {YOUTUBE_CATEGORIES.find(c => c.id === categoryId)?.name || ''}</span>
                                <span>·</span>
                                <span>{privacyStatus === 'public' ? '🌍 공개' : privacyStatus === 'unlisted' ? '🔗 일부 공개' : '🔒 비공개'}</span>
                                {videoFile && <><span>·</span><span>📦 {(videoFile.size / 1024 / 1024).toFixed(1)} MB</span></>}
                            </div>
                        </div>
                    </div>

                    {/* Upload Action */}
                    <div className="card">
                        {error && (
                            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 13, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                                ❌ {error}
                            </div>
                        )}

                        {progress && (
                            <div style={{ padding: '12px 16px', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid var(--border-active)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-secondary)', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="spinner" /> {progress}
                            </div>
                        )}

                        {result && (
                            <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>✅ 업로드 성공!</div>
                                <div style={{ fontSize: 13 }}>
                                    <div>🎬 {result.title}</div>
                                    <a href={result.url} target="_blank" style={{ color: 'var(--info)', fontSize: 12 }}>{result.url}</a>
                                </div>
                            </div>
                        )}

                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleUpload} disabled={uploading || !videoFile || !title.trim()}>
                            {uploading ? '⏳ 업로드 중...' : '🚀 YouTube 업로드'}
                        </button>

                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                            YouTube API 인증 정보는 <a href="/settings" style={{ color: 'var(--info)' }}>설정</a>에서 관리합니다
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
