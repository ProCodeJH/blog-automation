'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function EditorPage() {
    // ── State ──
    const [postId, setPostId] = useState(null);
    const [title, setTitle] = useState('');
    const [rawText, setRawText] = useState('');
    const [category, setCategory] = useState('');
    const [tone, setTone] = useState('friendly');
    const [templateId, setTemplateId] = useState('');
    const [images, setImages] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [manualTags, setManualTags] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [showCustomPrompt, setShowCustomPrompt] = useState(false);

    // AI Results
    const [aiResult, setAiResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Keyword Research
    const [showKeywords, setShowKeywords] = useState(false);
    const [keywordTopic, setKeywordTopic] = useState('');
    const [keywordResult, setKeywordResult] = useState(null);
    const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false);

    // Schedule
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Export
    const [showExport, setShowExport] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Edit mode
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [existingPosts, setExistingPosts] = useState([]);

    // v4: SEO Panel
    const [seoResult, setSeoResult] = useState(null);
    const [seoKeyword, setSeoKeyword] = useState('');

    // v4: Title A/B
    const [showTitleAB, setShowTitleAB] = useState(false);
    const [titleCandidates, setTitleCandidates] = useState([]);
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

    // v4: Batch Publish
    const [showPublish, setShowPublish] = useState(false);
    const [publishPlatforms, setPublishPlatforms] = useState({ naver: false, wordpress: false, tistory: false });
    const [publishStatus, setPublishStatus] = useState({});
    const [isPublishing, setIsPublishing] = useState(false);

    // v5: Platform Preview
    const [showPreview, setShowPreview] = useState(false);
    const [previewPlatform, setPreviewPlatform] = useState('naver');

    // v5: Repurpose
    const [showRepurpose, setShowRepurpose] = useState(false);
    const [repurposeResult, setRepurposeResult] = useState(null);
    const [isRepurposing, setIsRepurposing] = useState(false);

    // v5: Version History
    const [showHistory, setShowHistory] = useState(false);
    const [historyVersions, setHistoryVersions] = useState([]);

    // v6: AI Thumbnail
    const [showThumbnail, setShowThumbnail] = useState(false);
    const [thumbnailData, setThumbnailData] = useState(null);
    const [thumbnailStyle, setThumbnailStyle] = useState('modern');
    const [isGenThumbnail, setIsGenThumbnail] = useState(false);

    const fileInputRef = useRef(null);
    const autoSaveTimer = useRef(null);

    const tones = [
        { key: 'friendly', label: '친근한' },
        { key: 'professional', label: '전문적' },
        { key: 'humorous', label: '유머러스' },
        { key: 'emotional', label: '감성적' },
    ];

    const templates = [
        { id: '', label: '기본', desc: '범용' },
        { id: 'restaurant', label: '맛집', desc: '맛집 리뷰' },
        { id: 'travel', label: '여행', desc: '여행 후기' },
        { id: 'product', label: '제품', desc: '제품 리뷰' },
        { id: 'tech', label: 'IT', desc: '테크/개발' },
        { id: 'daily', label: '일상', desc: '에세이' },
        { id: 'beauty', label: '뷰티', desc: '화장품/패션' },
        { id: 'recipe', label: '요리', desc: '레시피' },
        { id: 'parenting', label: '육아', desc: '육아/교육' },
    ];

    // ── Auto-save (every 30s) ──
    useEffect(() => {
        autoSaveTimer.current = setInterval(() => {
            if (rawText.trim() || title.trim()) {
                const draft = { title, rawText, category, tone, templateId, manualTags, customPrompt, images: images.map(img => ({ id: img.id, memo: img.memo, name: img.name, url: img.url })), savedAt: Date.now() };
                localStorage.setItem('blogflow_draft', JSON.stringify(draft));
            }
        }, 30000);
        return () => clearInterval(autoSaveTimer.current);
    }, [title, rawText, category, tone, templateId, manualTags, customPrompt, images]);

    // ── Restore draft on load ──
    useEffect(() => {
        const saved = localStorage.getItem('blogflow_draft');
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                const age = Date.now() - (draft.savedAt || 0);
                if (age < 86400000) {
                    setTitle(draft.title || '');
                    setRawText(draft.rawText || '');
                    setCategory(draft.category || '');
                    setTone(draft.tone || 'friendly');
                    setTemplateId(draft.templateId || '');
                    setManualTags(draft.manualTags || []);
                    setCustomPrompt(draft.customPrompt || '');
                }
            } catch (e) { }
        }
    }, []);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave('draft');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isGenerating && rawText.trim()) handleGenerate();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rawText, isGenerating]);

    // ── Toast ──
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // ── v4: Real-time content stats ──
    const getStats = () => {
        const text = rawText || '';
        const charCount = text.length;
        const charNoSpace = text.replace(/\s/g, '').length;
        const readingTime = Math.max(1, Math.round(charCount / 500));
        return { charCount, charNoSpace, readingTime };
    };
    const stats = getStats();

    // ── v4: Run SEO analysis ──
    const runSeoAnalysis = async () => {
        if (!aiResult) return;
        try {
            const res = await fetch('/api/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: aiResult.title,
                    content: aiResult.content,
                    metaDescription: aiResult.metaDescription,
                    tags: aiResult.tags || manualTags,
                    images: aiResult.uploadedImages || [],
                    keyword: seoKeyword || category,
                }),
            });
            const data = await res.json();
            if (data.success) setSeoResult(data);
        } catch (e) { /* silent */ }
    };

    // Auto-run SEO when aiResult changes
    useEffect(() => {
        if (aiResult) runSeoAnalysis();
    }, [aiResult]);

    // ── v4: Title A/B Test ──
    const handleTitleAB = async () => {
        const topic = title || rawText.slice(0, 100);
        if (!topic.trim()) { showToast('제목 또는 본문을 먼저 입력하세요'); return; }
        setIsGeneratingTitles(true);
        setTitleCandidates([]);
        try {
            const res = await fetch('/api/ai/titles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, category, tone }),
            });
            const data = await res.json();
            if (data.success && data.titles) {
                setTitleCandidates(data.titles);
                setShowTitleAB(true);
            } else { showToast('제목 생성 실패'); }
        } catch (e) { showToast(e.message); }
        finally { setIsGeneratingTitles(false); }
    };

    // ── v4: Batch Publish ──
    const handleBatchPublish = async () => {
        const platforms = Object.entries(publishPlatforms).filter(([, v]) => v).map(([k]) => k);
        if (platforms.length === 0) { showToast('플랫폼을 선택하세요'); return; }

        // AI 결과 or 에디터 내용 사용
        const publishTitle = aiResult?.title || title || '제목 없음';
        const publishContent = aiResult?.content || rawText || '';
        const publishTags = aiResult?.tags || manualTags || [];
        if (!publishContent.trim()) { showToast('발행할 내용이 없습니다'); return; }

        setIsPublishing(true);
        const settings = JSON.parse(localStorage.getItem('blogflow_settings') || '{}');
        const results = {};

        // 업로드된 이미지 경로 수집 (네이버 Puppeteer용)
        const imagePaths = (aiResult?.uploadedImages || []).map(img => img.originalUrl || img.url).filter(Boolean);

        for (const platform of platforms) {
            try {
                setPublishStatus(prev => ({ ...prev, [platform]: 'publishing' }));
                console.log(`[발행] ${platform} 시작...`);

                let credentials = {};
                if (platform === 'wordpress') {
                    credentials = { siteUrl: settings.wpUrl, username: settings.wpUser, appPassword: settings.wpPass };
                } else if (platform === 'tistory') {
                    credentials = { accessToken: settings.tsToken, blogName: settings.tsBlogName };
                } else if (platform === 'naver') {
                    credentials = { naverBlogId: settings.naverBlogId };
                }

                const res = await fetch('/api/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform,
                        credentials,
                        post: {
                            title: publishTitle,
                            content: publishContent,
                            tags: publishTags,
                            imagePaths,
                        },
                    }),
                });
                const data = await res.json();
                console.log(`[발행] ${platform} 결과:`, data);
                results[platform] = data.success ? 'success' : 'error';
                setPublishStatus(prev => ({ ...prev, [platform]: data.success ? 'success' : 'error' }));
                if (data.success && data.postUrl) {
                    showToast(`${platform}: ${data.postUrl}`);
                } else if (!data.success) {
                    showToast(`${platform} 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                }
            } catch (e) {
                console.error(`[발행] ${platform} 에러:`, e);
                results[platform] = 'error';
                setPublishStatus(prev => ({ ...prev, [platform]: 'error' }));
                showToast(`${platform} 에러: ${e.message}`, 'error');
            }
        }

        const successCount = Object.values(results).filter(r => r === 'success').length;
        showToast(`${successCount}/${platforms.length} 플랫폼 발행 완료`);
        setIsPublishing(false);
    };

    // ── Image Handlers ──
    const handleFileSelect = useCallback(async (files) => {
        const newImages = [];
        for (const file of files) {
            const url = URL.createObjectURL(file);
            newImages.push({ id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, file, url, memo: '', name: file.name });
        }
        setImages((prev) => [...prev, ...newImages]);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length > 0) handleFileSelect(files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const removeImage = useCallback((id) => setImages((prev) => prev.filter((img) => img.id !== id)), []);
    const updateImageMemo = useCallback((id, memo) => setImages((prev) => prev.map((img) => (img.id === id ? { ...img, memo } : img))), []);

    const handleImageDragStart = (index) => setDraggedIndex(index);
    const handleImageDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setImages((prev) => {
            const n = [...prev];
            const [d] = n.splice(draggedIndex, 1);
            n.splice(index, 0, d);
            return n;
        });
        setDraggedIndex(index);
    };
    const handleImageDragEnd = () => setDraggedIndex(null);

    // ── Tags ──
    const handleTagKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const t = tagInput.trim().replace(/^#/, '');
            if (t && !manualTags.includes(t)) setManualTags((prev) => [...prev, t]);
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && manualTags.length > 0) {
            setManualTags((prev) => prev.slice(0, -1));
        }
    };

    // ── AI Generate ──
    const handleGenerate = async () => {
        if (!rawText.trim()) { setError('글 내용을 입력해주세요.'); return; }
        setError('');
        setIsGenerating(true);
        setAiResult(null);

        try {
            let uploadedImages = [];
            if (images.length > 0) {
                const formData = new FormData();
                for (const img of images) {
                    if (img.file) formData.append('images', img.file);
                }
                if (formData.has('images')) {
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) {
                        uploadedImages = uploadData.images.map((u, i) => ({ ...u, memo: images[i]?.memo || '' }));
                    }
                }
            }

            const res = await fetch('/api/ai/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: `제목: ${title}\n\n${rawText}`,
                    imageInfos: images.map((img, i) => ({ index: i + 1, memo: img.memo || '' })),
                    tone,
                    category,
                    templateId,
                    customPromptAddition: customPrompt,
                }),
            });

            const data = await res.json();
            if (data.success) {
                let content = data.data.content;
                uploadedImages.forEach((img, i) => {
                    const placeholder = new RegExp(`\\[IMAGE_${i + 1}\\]|<div class="blog-image" data-index="${i + 1}"></div>`, 'g');
                    content = content.replace(placeholder, `<div style="text-align:center;margin:24px 0"><img src="${img.optimizedUrl || img.url}" alt="${img.memo || `이미지 ${i + 1}`}" style="max-width:100%;border-radius:12px"><p style="text-align:center;font-size:13px;color:#888;margin-top:8px">${img.memo || ''}</p></div>`);
                });
                setAiResult({ ...data.data, content, uploadedImages });
                showToast('AI 편집 완료');
            } else {
                setError(data.error || 'AI 편집에 실패했습니다.');
            }
        } catch (err) {
            setError('서버 연결에 실패했습니다: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Save Post ──
    const handleSave = async (status = 'draft') => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: postId || undefined,
                    title: aiResult?.title || title || '제목 없음',
                    rawText, content: aiResult?.content || '', metaDescription: aiResult?.metaDescription || '',
                    tags: aiResult?.tags || manualTags, images: aiResult?.uploadedImages || [],
                    tone, category, templateId, status,
                    seoScore: seoResult?.score || aiResult?.seoScore || 0,
                    scheduledAt: (scheduledDate && scheduledTime) ? `${scheduledDate}T${scheduledTime}:00` : null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPostId(data.post.id);
                showToast(`"${data.post.title}" ${status === 'draft' ? '초안 저장' : status === 'scheduled' ? '예약 설정' : '저장'} 완료`);
                localStorage.removeItem('blogflow_draft');
            }
        } catch (err) {
            showToast('저장 실패: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Keyword Research ──
    const handleKeywordResearch = async () => {
        if (!keywordTopic.trim()) return;
        setIsAnalyzingKeywords(true);
        setKeywordResult(null);
        try {
            const res = await fetch('/api/ai/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: keywordTopic }),
            });
            const data = await res.json();
            if (data.success) setKeywordResult(data.data);
            else showToast('키워드 분석 실패');
        } catch (err) {
            showToast(err.message);
        } finally {
            setIsAnalyzingKeywords(false);
        }
    };

    // ── Copy to clipboard ──
    const copyToClipboard = async (format) => {
        if (!aiResult) return;
        let text;
        if (format === 'html') {
            text = `<h1>${aiResult.title}</h1>\n${aiResult.content}\n\n${(aiResult.tags || []).map(t => `#${t}`).join(' ')}`;
        } else {
            text = aiResult.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            text = `# ${aiResult.title}\n\n${text}\n\n${(aiResult.tags || []).map(t => `#${t}`).join(' ')}`;
        }
        try {
            await navigator.clipboard.writeText(text);
            showToast(`${format === 'html' ? 'HTML' : '마크다운'} 복사 완료`);
        } catch (e) {
            showToast('복사 실패');
        }
    };

    // ── Load existing post ──
    const loadExistingPosts = async () => {
        const res = await fetch('/api/posts');
        const data = await res.json();
        if (data.success) setExistingPosts(data.posts);
        setShowLoadModal(true);
    };

    const loadPost = (post) => {
        setPostId(post.id);
        setTitle(post.title || '');
        setRawText(post.rawText || '');
        setCategory(post.category || '');
        setTone(post.tone || 'friendly');
        setTemplateId(post.templateId || '');
        setManualTags(post.tags || []);
        if (post.content) {
            setAiResult({ title: post.title, content: post.content, metaDescription: post.metaDescription, tags: post.tags, seoScore: post.seoScore, uploadedImages: post.images });
        }
        setShowLoadModal(false);
        showToast('글 불러오기 완료');
    };

    // ── New post ──
    const handleNewPost = () => {
        setPostId(null); setTitle(''); setRawText(''); setCategory(''); setTone('friendly');
        setTemplateId(''); setImages([]); setManualTags([]); setAiResult(null);
        setCustomPrompt(''); setError(''); setSeoResult(null); setTitleCandidates([]);
        localStorage.removeItem('blogflow_draft');
        showToast('새 글 시작');
    };

    const getSeoClass = (score) => score >= 80 ? 'seo-good' : score >= 50 ? 'seo-ok' : 'seo-bad';
    const getSeoIcon = (status) => status === 'good' ? 'good' : status === 'warn' ? 'warn' : 'bad';

    return (
        <div>
            {/* Toast */}
            {toastMessage && (
                <div className="toast-container">
                    <div className={`toast ${toastMessage.includes('실패') || toastMessage.includes('오류') ? 'toast-error' : toastMessage.includes('완료') || toastMessage.includes('적용') || toastMessage.includes('추가') ? 'toast-success' : 'toast-info'}`}>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {showLoadModal && (
                <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
                    <div className="modal-content" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>글 불러오기</h3>
                            <button className="modal-close" onClick={() => setShowLoadModal(false)}>×</button>
                        </div>
                        {existingPosts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>저장된 글이 없습니다</p>
                        ) : (
                            <div className="posts-list">
                                {existingPosts.map((p) => (
                                    <div key={p.id} className="post-card" onClick={() => loadPost(p)}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(p.createdAt).toLocaleDateString('ko-KR')} · {p.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Title A/B Modal */}
            {showTitleAB && titleCandidates.length > 0 && (
                <div className="modal-overlay" onClick={() => setShowTitleAB(false)}>
                    <div className="modal-content" style={{ width: 550 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>제목 A/B 테스트</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>클릭하여 제목 적용</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowTitleAB(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {titleCandidates.map((t, i) => (
                                <div key={i} className="post-card" style={{ cursor: 'pointer', padding: 14 }} onClick={() => { setTitle(t.title); if (aiResult) setAiResult({ ...aiResult, title: t.title }); setShowTitleAB(false); showToast('제목 적용 완료'); }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.title}</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 20, fontWeight: 600 }}>CTR {t.estimatedCTR || '?'}%</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 20 }}>{t.style}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.reason}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>글 작성하기</h2>
                        <p>러프한 초안 → AI 파워블로거 편집 · <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ctrl+S 저장 · Ctrl+Enter 생성 · 30초 자동저장</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={handleNewPost}>새 글</button>
                        <button className="btn btn-ghost btn-sm" onClick={loadExistingPosts}>불러오기</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowKeywords(!showKeywords)}>키워드</button>
                        <button className="btn btn-ghost btn-sm" onClick={handleTitleAB} disabled={isGeneratingTitles}>
                            {isGeneratingTitles ? '...' : '제목 A/B'}
                        </button>
                    </div>
                </div>
            </div>

            {/* v4: Real-time Stats Bar */}
            <div className="stats-inline">
                <span className="stat-item"><b>{stats.charCount}</b>자</span>
                <span className="stat-divider" />
                <span className="stat-item"><b>{stats.readingTime}</b>분</span>
                <span className="stat-divider" />
                <span className="stat-item"><b>{images.length}</b>장</span>
                <span className="stat-divider" />
                <span className="stat-item"><b>{manualTags.length}</b>태그</span>
                {seoResult && <><span className="stat-divider" /><span className="stat-item" style={{ color: seoResult.score >= 80 ? 'var(--success)' : seoResult.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>SEO <b>{seoResult.score}</b> ({seoResult.grade})</span></>}
                <div style={{ flex: 1 }} />
                {rawText.length > 0 && <span className="stat-item" style={{ color: stats.charCount >= 2000 ? 'var(--success)' : stats.charCount >= 1000 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {stats.charCount >= 2000 ? '충분한 분량' : stats.charCount >= 1000 ? '조금 짧음' : '2000자 이상 권장'}
                </span>}
            </div>

            {/* Keyword Research Panel */}
            {showKeywords && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>키워드 리서치</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowKeywords(false)}>닫기</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input type="text" className="form-input" placeholder="주제를 입력하세요 (예: 강남 맛집, 아이폰 16 리뷰)" value={keywordTopic} onChange={(e) => setKeywordTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleKeywordResearch()} style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={handleKeywordResearch} disabled={isAnalyzingKeywords}>
                            {isAnalyzingKeywords ? <><span className="spinner"></span> 분석 중...</> : '분석'}
                        </button>
                    </div>
                    {keywordResult && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-hover)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>관련 키워드</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {(keywordResult.relatedKeywords || []).map((k, i) => (
                                        <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => { setManualTags(prev => [...new Set([...prev, k.keyword])]); showToast(`"${k.keyword}" 태그 추가`); }}>
                                            {k.keyword} <span style={{ fontSize: 9, opacity: 0.6 }}>({k.searchVolume})</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-hover)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>추천 제목</div>
                                {(keywordResult.suggestedTitle || []).map((t, i) => (
                                    <div key={i} style={{ fontSize: 13, marginBottom: 4, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }} className="post-card" onClick={() => { setTitle(t); showToast('제목 적용 완료'); }}>
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="editor-layout">
                {/* ── Left: Input Panel ── */}
                <div className="editor-panel">
                    <div className="card" style={{ overflow: 'auto' }}>
                        <div className="editor-panel-header">
                            <h3>초안 입력</h3>
                            {postId && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>편집 중: {postId.slice(0, 8)}...</span>}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                            {/* Template */}
                            <div className="form-group">
                                <label className="form-label">템플릿</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {templates.map((t) => (
                                        <button key={t.id} className={`tone-chip ${templateId === t.id ? 'active' : ''}`} onClick={() => setTemplateId(t.id)} title={t.desc}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">제목 <span style={{ fontSize: 11, color: title.length > 60 ? 'var(--error)' : title.length >= 15 ? 'var(--success)' : 'var(--text-muted)' }}>({title.length}자)</span></label>
                                <input type="text" className="form-input" placeholder="예: 서울 맛집 투어, 신혼여행 후기..." value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label className="form-label">카테고리</label>
                                <input type="text" className="form-input" placeholder="맛집, 여행, IT, 일상, 리뷰..." value={category} onChange={(e) => setCategory(e.target.value)} />
                            </div>

                            {/* Tone */}
                            <div className="form-group">
                                <label className="form-label">톤 & 스타일</label>
                                <div className="tone-selector">
                                    {tones.map((t) => (
                                        <button key={t.key} className={`tone-chip ${tone === t.key ? 'active' : ''}`} onClick={() => setTone(t.key)}>{t.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="form-group">
                                <label className="form-label">본문 (대략적으로 써주세요) <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.charCount}자 · {stats.readingTime}분</span></label>
                                <textarea className="form-input form-textarea" placeholder="여기에 대략적인 내용을 적어주세요. 키워드, 메모, 핵심 내용 등 자유롭게 작성하면 AI가 파워블로거 스타일로 변환합니다." value={rawText} onChange={(e) => setRawText(e.target.value)} rows={8} />
                            </div>

                            {/* Custom Prompt */}
                            <div className="form-group">
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomPrompt(!showCustomPrompt)} style={{ alignSelf: 'flex-start' }}>
                                    {showCustomPrompt ? '−' : '+'} 추가 지시사항
                                </button>
                                {showCustomPrompt && (
                                    <textarea className="form-input" style={{ minHeight: 80, marginTop: 6 }} placeholder="예: 사진 설명을 더 자세히 해줘, 비교 표를 추가해줘..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
                                )}
                            </div>

                            {/* Image Upload */}
                            <div className="form-group">
                                <label className="form-label">사진 ({images.length}장) · 드래그로 순서 변경</label>
                                <div className={`image-uploader ${isDragging ? 'dragging' : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                                    <div className="upload-icon">↑</div>
                                    <div className="upload-text">클릭 또는 드래그앤드롭</div>
                                    <div className="upload-hint">JPG, PNG, WebP · 자동 WebP 변환 & 압축</div>
                                    <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelect(Array.from(e.target.files))} />
                                </div>
                                {images.length > 0 && (
                                    <div className="image-grid">
                                        {images.map((img, index) => (
                                            <div key={img.id} className={`image-item ${draggedIndex === index ? 'dragging' : ''}`} draggable onDragStart={() => handleImageDragStart(index)} onDragOver={(e) => handleImageDragOver(e, index)} onDragEnd={handleImageDragEnd}>
                                                <img src={img.url} alt={img.name} />
                                                <div className="image-number">{index + 1}</div>
                                                <button className="image-remove" onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}>×</button>
                                                <div className="image-memo">
                                                    <input type="text" placeholder="메모..." value={img.memo} onChange={(e) => updateImageMemo(img.id, e.target.value)} onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="form-group">
                                <label className="form-label">추가 태그</label>
                                <div className="tags-container">
                                    {manualTags.map((tag) => (
                                        <span key={tag} className="tag">#{tag}<span className="tag-remove" onClick={() => setManualTags((prev) => prev.filter((t) => t !== tag))}>×</span></span>
                                    ))}
                                    <input className="tags-input" placeholder="Enter로 추가..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
                                </div>
                            </div>

                            {/* Error */}
                            {error && <div style={{ color: 'var(--error)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>{error}</div>}

                            {/* Generate Button */}
                            <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={isGenerating || !rawText.trim()} style={{ width: '100%' }}>
                                {isGenerating ? <><span className="spinner"></span> 편집 중...</> : 'AI 편집 시작'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right: Preview Panel ── */}
                <div className="editor-panel">
                    <div className="preview-panel">
                        <div className="preview-header">
                            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>미리보기</h3>
                            {aiResult && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={isGenerating}>재생성</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(!showExport)}>내보내기</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowSchedule(!showSchedule)}>예약</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPublish(!showPublish)}>발행</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleSave('ready')} disabled={isSaving}>
                                        {isSaving ? '...' : '저장'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Export Bar */}
                        {showExport && aiResult && (
                            <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard('html')}>HTML 복사</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard('markdown')}>마크다운</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => { handleSave('draft'); }}>초안 저장</button>
                            </div>
                        )}

                        {/* Schedule Bar */}
                        {showSchedule && aiResult && (
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>예약</span>
                                <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                                <input type="time" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                                <button className="btn btn-primary btn-sm" onClick={() => handleSave('scheduled')} disabled={!scheduledDate || !scheduledTime}>
                                    예약 저장
                                </button>
                            </div>
                        )}

                        {/* v4: Batch Publish Panel */}
                        {showPublish && aiResult && (
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>플랫폼 발행</div>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                    {[
                                        { key: 'naver', label: '네이버', icon: 'N', color: '#03c75a' },
                                        { key: 'wordpress', label: 'WordPress', icon: 'W', color: '#21759b' },
                                        { key: 'tistory', label: '티스토리', icon: 'T', color: '#f36f21' },
                                    ].map(p => (
                                        <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 8, background: publishPlatforms[p.key] ? p.color + '20' : 'var(--bg-tertiary)', border: `1px solid ${publishPlatforms[p.key] ? p.color : 'var(--border)'}`, transition: 'all 0.2s' }}>
                                            <input type="checkbox" checked={publishPlatforms[p.key]} onChange={(e) => setPublishPlatforms(prev => ({ ...prev, [p.key]: e.target.checked }))} style={{ display: 'none' }} />
                                            <span style={{ fontWeight: 800, color: p.color }}>{p.icon}</span>
                                            <span>{p.label}</span>
                                            {publishStatus[p.key] && (
                                                <span style={{ fontSize: 11 }}>
                                                    {publishStatus[p.key] === 'publishing' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : publishStatus[p.key] === 'success' ? <span className="status-dot-indicator dot-good" /> : <span className="status-dot-indicator dot-bad" />}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                    <button className="btn btn-primary btn-sm" onClick={handleBatchPublish} disabled={isPublishing} style={{ marginLeft: 'auto' }}>
                                        {isPublishing ? '발행 중...' : '발행'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => copyToClipboard('html')}>HTML 복사</button>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => copyToClipboard('markdown')}>MD 복사</button>
                                </div>
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="ai-generating">

                                <p style={{ fontWeight: 500 }}>AI 편집 중</p>
                                <div className="dots"><span></span><span></span><span></span></div>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                    {templateId ? `${templates.find(t => t.id === templateId)?.label} 템플릿 적용 중` : '잠시만 기다려주세요'}
                                </p>
                            </div>
                        ) : aiResult ? (
                            <div style={{ padding: 24 }}>
                                {/* v4: Detailed SEO Panel */}
                                {seoResult ? (
                                    <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <div className={`seo-score-circle ${getSeoClass(seoResult.score)}`}>{seoResult.score}</div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700 }}>SEO 점수: {seoResult.grade}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {seoResult.stats?.charCount}자 · {seoResult.stats?.readingTime}분 · {seoResult.stats?.imgCount}이미지 · {seoResult.stats?.headingCount}소제목
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }} />
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                <input type="text" className="form-input" style={{ width: 120, padding: '4px 8px', fontSize: 11 }} placeholder="SEO 키워드" value={seoKeyword} onChange={(e) => setSeoKeyword(e.target.value)} />
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={runSeoAnalysis}>분석</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                            {seoResult.checks?.map((c, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 0' }}>
                                                    <span className={`status-dot-indicator dot-${getSeoIcon(c.status)}`}></span>
                                                    <span style={{ color: 'var(--text-secondary)', minWidth: 80 }}>{c.label}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{c.detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="seo-score">
                                        <div className={`seo-score-circle ${getSeoClass(aiResult.seoScore)}`}>{aiResult.seoScore}</div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>SEO 점수</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>분석 중...</div>
                                        </div>
                                    </div>
                                )}

                                {/* Meta */}
                                {aiResult.metaDescription && (
                                    <div style={{ margin: '12px 0', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>META </span>{aiResult.metaDescription}
                                    </div>
                                )}

                                {/* Title */}
                                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 12px', lineHeight: 1.4 }}>{aiResult.title}</h1>

                                {/* Content */}
                                <div className="preview-content" dangerouslySetInnerHTML={{ __html: aiResult.content }} />

                                {/* Tags */}
                                {aiResult.tags?.length > 0 && (
                                    <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {aiResult.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
                                        </div>
                                    </div>
                                )}

                                {/* SEO Tips */}
                                {aiResult.seoTips?.length > 0 && (
                                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(59,130,246,0.08)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--info)' }}>SEO 개선 제안</div>
                                        {aiResult.seoTips.map((tip, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>• {tip}</div>)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="preview-placeholder">
                                <div className="preview-placeholder-icon" style={{ fontSize: 36, opacity: 0.15, letterSpacing: 4 }}>···</div>
                                <div>
                                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>AI 편집 결과가 여기에 표시됩니다</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>초안 입력 → AI 편집 시작 클릭</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── v5 Action Bar ─── */}
            {aiResult && (
                <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>도구</span>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                        setIsRepurposing(true); setShowRepurpose(true);
                        try {
                            const res = await fetch('/api/ai/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: aiResult.title, content: aiResult.content }) });
                            const d = await res.json();
                            if (d.success) setRepurposeResult(d.repurposed);
                        } catch { }
                        setIsRepurposing(false);
                    }}>SNS 변환</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(true)}>플랫폼 미리보기</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                        setIsGenThumbnail(true); setShowThumbnail(true);
                        try {
                            const res = await fetch('/api/ai/image-gen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: aiResult.title || title, category, tags: aiResult.tags || manualTags, style: thumbnailStyle }) });
                            const d = await res.json();
                            if (d.success) setThumbnailData(d.thumbnail);
                        } catch { }
                        setIsGenThumbnail(false);
                    }}>썸네일 생성</button>
                    {postId && <button className="btn btn-ghost btn-sm" onClick={async () => {
                        const res = await fetch(`/api/posts?history=${postId}`);
                        const d = await res.json();
                        if (d.success) { setHistoryVersions(d.versions || []); setShowHistory(true); }
                    }}>히스토리</button>}
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPublish(true)}>발행</button>
                </div>
            )}

            {/* Publish Modal */}
            {showPublish && (
                <div className="modal-overlay" onClick={() => setShowPublish(false)}>
                    <div className="modal-content" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>플랫폼 발행</h3>
                            <button className="modal-close" onClick={() => setShowPublish(false)}>×</button>
                        </div>
                        <p className="text-caption" style={{ marginBottom: 14 }}>발행할 플랫폼을 선택하세요. 설정에서 인증 정보를 먼저 등록해야 합니다.</p>
                        <div className="platform-grid">
                            {[{ key: 'naver', name: '네이버 블로그', desc: 'Puppeteer 자동 발행' }, { key: 'wordpress', name: 'WordPress', desc: 'REST API 발행' }, { key: 'tistory', name: '티스토리', desc: 'Open API 발행' }].map(p => (
                                <div key={p.key} className={`platform-card ${publishPlatforms[p.key] ? 'selected' : ''}`} onClick={() => setPublishPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}>
                                    <div className="platform-icon" style={{ background: publishPlatforms[p.key] ? 'var(--accent-muted)' : 'var(--bg-tertiary)', color: publishPlatforms[p.key] ? 'var(--accent-hover)' : 'var(--text-muted)' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                    </div>
                                    <div className="platform-info">
                                        <h4>{p.name}</h4>
                                        <span>{publishStatus[p.key] === 'publishing' ? '발행 중...' : publishStatus[p.key] === 'success' ? '완료' : publishStatus[p.key] === 'error' ? '실패' : p.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPublish(false)}>취소</button>
                            <button className="btn btn-primary btn-sm" onClick={handleBatchPublish} disabled={isPublishing}>
                                {isPublishing ? '발행 중...' : '발행하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform Preview Modal */}
            {showPreview && aiResult && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: 800 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>플랫폼별 미리보기</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {[{ k: 'naver', l: '네이버' }, { k: 'tistory', l: '티스토리' }, { k: 'velog', l: 'Velog' }, { k: 'wordpress', l: 'WordPress' }].map(p => (
                                <button key={p.k} className={`tone-chip ${previewPlatform === p.k ? 'active' : ''}`} onClick={() => setPreviewPlatform(p.k)}>{p.l}</button>
                            ))}
                        </div>
                        <div style={{
                            background: previewPlatform === 'naver' ? '#fff' : previewPlatform === 'tistory' ? '#fff' : previewPlatform === 'velog' ? '#1e1e1e' : '#fff',
                            color: previewPlatform === 'velog' ? '#d9d9d9' : '#333',
                            padding: 24, borderRadius: 12, fontFamily: previewPlatform === 'naver' ? "'Noto Sans KR', sans-serif" : previewPlatform === 'velog' ? "'Fira Mono', monospace" : 'inherit',
                            border: '1px solid #e5e5e5',
                        }}>
                            {previewPlatform === 'naver' && <div style={{ borderBottom: '3px solid #03c75a', paddingBottom: 8, marginBottom: 16, fontSize: 11, color: '#03c75a', fontWeight: 700 }}>네이버 블로그</div>}
                            {previewPlatform === 'tistory' && <div style={{ borderBottom: '2px solid #FF5A00', paddingBottom: 8, marginBottom: 16, fontSize: 11, color: '#FF5A00', fontWeight: 700 }}>Tistory</div>}
                            {previewPlatform === 'velog' && <div style={{ borderBottom: '2px solid #20c997', paddingBottom: 8, marginBottom: 16, fontSize: 11, color: '#20c997', fontWeight: 700 }}>velog</div>}
                            {previewPlatform === 'wordpress' && <div style={{ borderBottom: '2px solid #0073aa', paddingBottom: 8, marginBottom: 16, fontSize: 11, color: '#0073aa', fontWeight: 700 }}>WordPress</div>}
                            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{aiResult.title}</h1>
                            <div style={{ fontSize: 12, color: previewPlatform === 'velog' ? '#aaa' : '#999', marginBottom: 16 }}>{new Date().toLocaleDateString('ko-KR')} · 약 {Math.ceil((aiResult.content?.length || 0) / 500)}분 읽기</div>
                            <div style={{ fontSize: 14, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: aiResult.content?.slice(0, 1500) }} />
                            {aiResult.tags?.length > 0 && <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{aiResult.tags.map(t => <span key={t} style={{ padding: '2px 10px', background: previewPlatform === 'velog' ? '#2d2d2d' : '#f0f0f0', borderRadius: 12, fontSize: 11, color: previewPlatform === 'velog' ? '#20c997' : '#666' }}>#{t}</span>)}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Repurpose Modal */}
            {showRepurpose && (
                <div className="modal-overlay" onClick={() => setShowRepurpose(false)}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>SNS 변환</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowRepurpose(false)}>×</button>
                        </div>
                        {isRepurposing ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto 16px' }} />AI가 각 플랫폼에 맞게 변환 중...</div>
                        ) : repurposeResult ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {Object.entries(repurposeResult).map(([platform, text]) => (
                                    <div key={platform} style={{ padding: 14, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{platform === 'instagram' ? '인스타그램' : platform === 'twitter' ? '트위터/X' : platform === 'linkedin' ? '링크드인' : platform === 'thread' ? '스레드' : '유튜브 설명'}</span>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(text); }}>복사</button>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{text}</div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Version History Modal */}
            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>버전 히스토리</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(false)}>×</button>
                        </div>
                        {historyVersions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>이전 버전이 없습니다</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {historyVersions.slice().reverse().map((v, i) => (
                                    <div key={i} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>v{v.version} — {v.title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(v.savedAt).toLocaleString('ko-KR')}</div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setRawText(v.rawText || ''); setTitle(v.title || ''); setShowHistory(false); }}>복원</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── v6 AI Thumbnail Modal ─── */}
            {showThumbnail && (
                <div className="modal-overlay" onClick={() => setShowThumbnail(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>썸네일 생성</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowThumbnail(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {['modern', 'warm', 'nature', 'ocean', 'minimal'].map(s => (
                                <button key={s} className={`tone-chip ${thumbnailStyle === s ? 'active' : ''}`} onClick={async () => {
                                    setThumbnailStyle(s); setIsGenThumbnail(true);
                                    try {
                                        const res = await fetch('/api/ai/image-gen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: aiResult?.title || title, category, tags: aiResult?.tags || manualTags, style: s }) });
                                        const d = await res.json();
                                        if (d.success) setThumbnailData(d.thumbnail);
                                    } catch { }
                                    setIsGenThumbnail(false);
                                }}>{s}</button>
                            ))}
                        </div>
                        {isGenThumbnail ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto 12px' }} />생성 중...</div>
                        ) : thumbnailData ? (
                            <div>
                                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: thumbnailData.svg }} />
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        const blob = new Blob([thumbnailData.svg], { type: 'image/svg+xml' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href = url; a.download = 'thumbnail.svg'; a.click();
                                    }}>SVG 다운로드</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                        navigator.clipboard.writeText(thumbnailData.svg);
                                    }}>SVG 복사</button>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{thumbnailData.width}x{thumbnailData.height}</span>
                                </div>
                                {thumbnailData.altText && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Alt: {thumbnailData.altText}</div>}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
