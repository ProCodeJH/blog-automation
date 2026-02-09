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
    const [saveMessage, setSaveMessage] = useState('');

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

    const fileInputRef = useRef(null);
    const autoSaveTimer = useRef(null);

    const tones = [
        { key: 'friendly', label: '😊 친근한' },
        { key: 'professional', label: '💼 전문적' },
        { key: 'humorous', label: '😂 유머러스' },
        { key: 'emotional', label: '💕 감성적' },
    ];

    const templates = [
        { id: '', label: '📄 기본', desc: '범용' },
        { id: 'restaurant', label: '🍽️ 맛집', desc: '맛집 리뷰' },
        { id: 'travel', label: '✈️ 여행', desc: '여행 후기' },
        { id: 'product', label: '📦 제품', desc: '제품 리뷰' },
        { id: 'tech', label: '💻 IT', desc: '테크/개발' },
        { id: 'daily', label: '📝 일상', desc: '에세이' },
        { id: 'beauty', label: '💄 뷰티', desc: '화장품/패션' },
        { id: 'recipe', label: '🍳 요리', desc: '레시피' },
        { id: 'parenting', label: '👶 육아', desc: '육아/교육' },
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
                if (age < 86400000) { // 24h
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
                    content = content.replace(placeholder, `<div style="text-align:center;margin:24px 0"><img src="${img.url}" alt="${img.memo || `이미지 ${i + 1}`}" style="max-width:100%;border-radius:12px"><p style="text-align:center;font-size:13px;color:#888;margin-top:8px">${img.memo || ''}</p></div>`);
                });
                setAiResult({ ...data.data, content, uploadedImages });
                showToast('✅ AI 편집 완료!');
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
                    seoScore: aiResult?.seoScore || 0,
                    scheduledAt: (scheduledDate && scheduledTime) ? `${scheduledDate}T${scheduledTime}:00` : null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPostId(data.post.id);
                showToast(`✅ "${data.post.title}" ${status === 'draft' ? '초안 저장' : status === 'scheduled' ? '예약 설정' : '저장'} 완료!`);
                localStorage.removeItem('blogflow_draft');
            }
        } catch (err) {
            showToast('❌ 저장 실패: ' + err.message);
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
            else showToast('❌ 키워드 분석 실패');
        } catch (err) {
            showToast('❌ ' + err.message);
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
            showToast(`✅ ${format === 'html' ? 'HTML' : '마크다운'} 복사 완료! 블로그에 붙여넣기 하세요`);
        } catch (e) {
            showToast('❌ 복사 실패');
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
        showToast('✅ 글 불러오기 완료');
    };

    // ── New post ──
    const handleNewPost = () => {
        setPostId(null); setTitle(''); setRawText(''); setCategory(''); setTone('friendly');
        setTemplateId(''); setImages([]); setManualTags([]); setAiResult(null);
        setCustomPrompt(''); setError('');
        localStorage.removeItem('blogflow_draft');
        showToast('✨ 새 글 시작');
    };

    const getSeoClass = (score) => score >= 80 ? 'seo-good' : score >= 50 ? 'seo-ok' : 'seo-bad';

    return (
        <div>
            {/* Toast */}
            {toastMessage && (
                <div className="toast-container">
                    <div className={`toast ${toastMessage.startsWith('✅') ? 'toast-success' : toastMessage.startsWith('❌') ? 'toast-error' : 'toast-info'}`}>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {showLoadModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLoadModal(false)}>
                    <div className="card" style={{ width: 500, maxHeight: '70vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 16 }}>📂 글 불러오기</h3>
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

            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>✏️ 글 작성하기</h2>
                        <p>러프한 초안 → AI 파워블로거 편집 · <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ctrl+S 저장 · Ctrl+Enter 생성 · 30초 자동저장</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={handleNewPost}>✨ 새 글</button>
                        <button className="btn btn-ghost btn-sm" onClick={loadExistingPosts}>📂 불러오기</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowKeywords(!showKeywords)}>🔍 키워드 리서치</button>
                    </div>
                </div>
            </div>

            {/* Keyword Research Panel */}
            {showKeywords && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>🔍 키워드 리서치</h3>
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
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 8 }}>📌 관련 키워드</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {(keywordResult.relatedKeywords || []).map((k, i) => (
                                        <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => { setManualTags(prev => [...new Set([...prev, k.keyword])]); showToast(`✅ "${k.keyword}" 태그 추가`); }}>
                                            {k.keyword} <span style={{ fontSize: 9, opacity: 0.6 }}>({k.searchVolume})</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 8 }}>💡 추천 제목</div>
                                {(keywordResult.suggestedTitle || []).map((t, i) => (
                                    <div key={i} style={{ fontSize: 13, marginBottom: 4, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }} className="post-card" onClick={() => { setTitle(t); showToast('✅ 제목 적용'); }}>
                                        {t}
                                    </div>
                                ))}
                            </div>
                            {keywordResult.contentStrategy && (
                                <div style={{ gridColumn: '1/-1', background: 'rgba(59,130,246,0.08)', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--info)' }}>📊 전략: </span>{keywordResult.contentStrategy}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="editor-layout">
                {/* ── Left: Input Panel ── */}
                <div className="editor-panel">
                    <div className="card" style={{ overflow: 'auto' }}>
                        <div className="editor-panel-header">
                            <h3>📝 초안 입력</h3>
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
                                <label className="form-label">제목</label>
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
                                <label className="form-label">본문 (대략적으로 써주세요)</label>
                                <textarea className="form-input form-textarea" placeholder="여기에 대략적인 내용을 적어주세요. 키워드, 메모, 핵심 내용 등 자유롭게 작성하면 AI가 파워블로거 스타일로 변환합니다." value={rawText} onChange={(e) => setRawText(e.target.value)} rows={8} />
                            </div>

                            {/* Custom Prompt */}
                            <div className="form-group">
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomPrompt(!showCustomPrompt)} style={{ alignSelf: 'flex-start' }}>
                                    {showCustomPrompt ? '🔽' : '▶️'} AI에게 추가 지시사항
                                </button>
                                {showCustomPrompt && (
                                    <textarea className="form-input" style={{ minHeight: 80, marginTop: 6 }} placeholder="예: 사진 설명을 더 자세히 해줘, 비교 표를 추가해줘, 가격 정보를 강조해줘..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
                                )}
                            </div>

                            {/* Image Upload */}
                            <div className="form-group">
                                <label className="form-label">사진 ({images.length}장) · 드래그로 순서 변경</label>
                                <div className={`image-uploader ${isDragging ? 'dragging' : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                                    <div className="upload-icon">📷</div>
                                    <div className="upload-text">클릭 또는 드래그앤드롭</div>
                                    <div className="upload-hint">JPG, PNG, WebP · 여러 장 한번에</div>
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
                            {error && <div style={{ color: 'var(--error)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>⚠️ {error}</div>}

                            {/* Generate Button */}
                            <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={isGenerating || !rawText.trim()} style={{ width: '100%' }}>
                                {isGenerating ? <><span className="spinner"></span> AI 편집 중...</> : '🤖 AI 편집 시작 (Ctrl+Enter)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right: Preview Panel ── */}
                <div className="editor-panel">
                    <div className="preview-panel">
                        <div className="preview-header">
                            <h3 style={{ fontSize: 15, fontWeight: 600 }}>👁️ 미리보기</h3>
                            {aiResult && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={isGenerating}>🔄</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(!showExport)}>📤</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowSchedule(!showSchedule)}>📅</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleSave('ready')} disabled={isSaving}>
                                        {isSaving ? '...' : '💾 저장'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Export Bar */}
                        {showExport && aiResult && (
                            <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard('html')}>📋 HTML 복사 (네이버/티스토리)</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard('markdown')}>📝 마크다운 복사 (벨로그)</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => { handleSave('draft'); showToast('✅ 초안 저장 완료'); }}>💾 초안 저장</button>
                            </div>
                        )}

                        {/* Schedule Bar */}
                        {showSchedule && aiResult && (
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>📅 예약:</span>
                                <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                                <input type="time" className="form-input" style={{ width: 'auto', padding: '6px 10px' }} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                                <button className="btn btn-primary btn-sm" onClick={() => handleSave('scheduled')} disabled={!scheduledDate || !scheduledTime}>
                                    예약 저장
                                </button>
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="ai-generating">
                                <div style={{ fontSize: 48 }}>🤖</div>
                                <p>파워블로거 스타일로 편집 중...</p>
                                <div className="dots"><span></span><span></span><span></span></div>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                    {templateId ? `🎯 ${templates.find(t => t.id === templateId)?.label} 템플릿 적용 중` : 'Gemini AI 작업 중'}
                                </p>
                            </div>
                        ) : aiResult ? (
                            <div style={{ padding: 24 }}>
                                {/* SEO Score */}
                                <div className="seo-score">
                                    <div className={`seo-score-circle ${getSeoClass(aiResult.seoScore)}`}>{aiResult.seoScore}</div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>SEO 점수</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{aiResult.seoScore >= 80 ? '훌륭합니다!' : aiResult.seoScore >= 50 ? '개선 여지 있음' : '최적화 필요'}</div>
                                    </div>
                                </div>

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
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--info)' }}>💡 SEO 개선</div>
                                        {aiResult.seoTips.map((tip, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>• {tip}</div>)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="preview-placeholder">
                                <div className="preview-placeholder-icon">✨</div>
                                <div>
                                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>AI 편집 결과가 여기에 표시됩니다</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>초안 입력 → AI 편집 시작 클릭</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
