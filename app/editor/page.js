'use client';
import { useState, useRef, useCallback } from 'react';

export default function EditorPage() {
    // ── State ──
    const [title, setTitle] = useState('');
    const [rawText, setRawText] = useState('');
    const [category, setCategory] = useState('');
    const [tone, setTone] = useState('friendly');
    const [images, setImages] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [manualTags, setManualTags] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    // AI Results
    const [aiResult, setAiResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const fileInputRef = useRef(null);

    const tones = [
        { key: 'friendly', label: '😊 친근한', desc: '친한 언니/오빠 톤' },
        { key: 'professional', label: '💼 전문적', desc: '신뢰감 있는 정보 전달' },
        { key: 'humorous', label: '😂 유머러스', desc: '재미있고 가벼운' },
        { key: 'emotional', label: '💕 감성적', desc: '감정을 자극하는 서정적' },
    ];

    // ── Image Handlers ──
    const handleFileSelect = useCallback(async (files) => {
        const newImages = [];
        for (const file of files) {
            const url = URL.createObjectURL(file);
            newImages.push({
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                file,
                url,
                memo: '',
                name: file.name,
            });
        }
        setImages((prev) => [...prev, ...newImages]);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length > 0) handleFileSelect(files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const removeImage = useCallback((id) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
    }, []);

    const updateImageMemo = useCallback((id, memo) => {
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, memo } : img)));
    }, []);

    // ── Image Reorder (Drag & Drop) ──
    const handleImageDragStart = (index) => setDraggedIndex(index);

    const handleImageDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setImages((prev) => {
            const newImages = [...prev];
            const [dragged] = newImages.splice(draggedIndex, 1);
            newImages.splice(index, 0, dragged);
            return newImages;
        });
        setDraggedIndex(index);
    };

    const handleImageDragEnd = () => setDraggedIndex(null);

    // ── Tags ──
    const handleTagKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().replace(/^#/, '');
            if (newTag && !manualTags.includes(newTag)) {
                setManualTags((prev) => [...prev, newTag]);
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && manualTags.length > 0) {
            setManualTags((prev) => prev.slice(0, -1));
        }
    };

    // ── AI Generate ──
    const handleGenerate = async () => {
        if (!rawText.trim()) {
            setError('글 내용을 입력해주세요.');
            return;
        }
        setError('');
        setIsGenerating(true);
        setAiResult(null);

        try {
            // 1. Upload images first
            let uploadedImages = [];
            if (images.length > 0) {
                const formData = new FormData();
                for (const img of images) {
                    formData.append('images', img.file);
                }
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    uploadedImages = uploadData.images.map((u, i) => ({
                        ...u,
                        memo: images[i]?.memo || '',
                    }));
                }
            }

            // 2. AI rewrite
            const res = await fetch('/api/ai/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: `제목: ${title}\n\n${rawText}`,
                    imageInfos: images.map((img, i) => ({
                        index: i + 1,
                        memo: img.memo || '',
                    })),
                    tone,
                    category,
                }),
            });

            const data = await res.json();
            if (data.success) {
                // Replace [IMAGE_N] with actual image URLs
                let content = data.data.content;
                uploadedImages.forEach((img, i) => {
                    const placeholder = new RegExp(`\\[IMAGE_${i + 1}\\]|<div class="blog-image" data-index="${i + 1}"></div>`, 'g');
                    content = content.replace(
                        placeholder,
                        `<div style="text-align:center;margin:24px 0"><img src="${img.url}" alt="${img.memo || `이미지 ${i + 1}`}" style="max-width:100%;border-radius:12px"><p class="image-caption">${img.memo || ''}</p></div>`
                    );
                });
                setAiResult({ ...data.data, content, uploadedImages });
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
        setSaveMessage('');
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: aiResult?.title || title || '제목 없음',
                    rawText,
                    content: aiResult?.content || '',
                    metaDescription: aiResult?.metaDescription || '',
                    tags: aiResult?.tags || manualTags,
                    images: aiResult?.uploadedImages || [],
                    tone,
                    category,
                    status,
                    seoScore: aiResult?.seoScore || 0,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSaveMessage(`✅ "${data.post.title}" 저장 완료!`);
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (err) {
            setSaveMessage('❌ 저장 실패: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── SEO Score Color ──
    const getSeoClass = (score) => {
        if (score >= 80) return 'seo-good';
        if (score >= 50) return 'seo-ok';
        return 'seo-bad';
    };

    return (
        <div>
            <div className="page-header">
                <h2>✏️ 글 작성하기</h2>
                <p>러프한 초안과 사진을 올리면 AI가 파워블로거 스타일로 편집합니다</p>
            </div>

            <div className="editor-layout">
                {/* ── Left: Input Panel ── */}
                <div className="editor-panel">
                    <div className="card">
                        <div className="editor-panel-header">
                            <h3>📝 초안 입력</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">제목 (대략적으로)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="예: 서울 맛집 투어, 신혼여행 후기..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label className="form-label">카테고리</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="맛집, 여행, IT, 일상, 리뷰..."
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                />
                            </div>

                            {/* Tone */}
                            <div className="form-group">
                                <label className="form-label">글 톤 & 스타일</label>
                                <div className="tone-selector">
                                    {tones.map((t) => (
                                        <button
                                            key={t.key}
                                            className={`tone-chip ${tone === t.key ? 'active' : ''}`}
                                            onClick={() => setTone(t.key)}
                                            title={t.desc}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="form-group">
                                <label className="form-label">본문 (대략적으로 써주세요)</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="여기에 대략적인 내용을 적어주세요. 키워드, 메모, 핵심 내용 등 자유롭게 작성하면 AI가 파워블로거 스타일로 변환합니다."
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    rows={10}
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="form-group">
                                <label className="form-label">사진 업로드 (드래그로 순서 변경 가능)</label>
                                <div
                                    className={`image-uploader ${isDragging ? 'dragging' : ''}`}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="upload-icon">📷</div>
                                    <div className="upload-text">
                                        클릭하거나 이미지를 드래그해서 올려주세요
                                    </div>
                                    <div className="upload-hint">
                                        JPG, PNG, WebP / 여러 장 한번에 가능
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileSelect(Array.from(e.target.files))}
                                    />
                                </div>

                                {images.length > 0 && (
                                    <div className="image-grid">
                                        {images.map((img, index) => (
                                            <div
                                                key={img.id}
                                                className={`image-item ${draggedIndex === index ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={() => handleImageDragStart(index)}
                                                onDragOver={(e) => handleImageDragOver(e, index)}
                                                onDragEnd={handleImageDragEnd}
                                            >
                                                <img src={img.url} alt={img.name} />
                                                <div className="image-number">{index + 1}</div>
                                                <button
                                                    className="image-remove"
                                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                                >
                                                    ×
                                                </button>
                                                <div className="image-memo">
                                                    <input
                                                        type="text"
                                                        placeholder="이미지 메모..."
                                                        value={img.memo}
                                                        onChange={(e) => updateImageMemo(img.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="form-group">
                                <label className="form-label">추가 태그 (선택, AI가 자동 생성도 합니다)</label>
                                <div className="tags-container">
                                    {manualTags.map((tag) => (
                                        <span key={tag} className="tag">
                                            #{tag}
                                            <span
                                                className="tag-remove"
                                                onClick={() => setManualTags((prev) => prev.filter((t) => t !== tag))}
                                            >
                                                ×
                                            </span>
                                        </span>
                                    ))}
                                    <input
                                        className="tags-input"
                                        placeholder="태그 입력 후 Enter..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                    />
                                </div>
                            </div>

                            {/* Generate Button */}
                            {error && (
                                <div style={{ color: 'var(--error)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleGenerate}
                                disabled={isGenerating || !rawText.trim()}
                                style={{ width: '100%' }}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner"></span>
                                        AI 편집 중...
                                    </>
                                ) : (
                                    '🤖 AI 편집 시작'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right: Preview Panel ── */}
                <div className="editor-panel">
                    <div className="preview-panel">
                        <div className="preview-header">
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>👁️ 미리보기</h3>
                            {aiResult && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={isGenerating}>
                                        🔄 다시 생성
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleSave('ready')}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? '저장 중...' : '💾 저장'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {saveMessage && (
                            <div style={{ padding: '10px 24px', fontSize: 13, color: saveMessage.startsWith('✅') ? 'var(--success)' : 'var(--error)' }}>
                                {saveMessage}
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="ai-generating">
                                <div style={{ fontSize: 48 }}>🤖</div>
                                <p>파워블로거 스타일로 편집 중...</p>
                                <div className="dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        ) : aiResult ? (
                            <div style={{ padding: 24 }}>
                                {/* SEO Score */}
                                <div className="seo-score">
                                    <div className={`seo-score-circle ${getSeoClass(aiResult.seoScore)}`}>
                                        {aiResult.seoScore}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>SEO 점수</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {aiResult.seoScore >= 80 ? '훌륭합니다!' : aiResult.seoScore >= 50 ? '개선 여지 있음' : '최적화 필요'}
                                        </div>
                                    </div>
                                </div>

                                {/* Meta Description */}
                                {aiResult.metaDescription && (
                                    <div style={{ margin: '16px 0', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>META DESCRIPTION</div>
                                        {aiResult.metaDescription}
                                    </div>
                                )}

                                {/* Title */}
                                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '20px 0 16px', lineHeight: 1.4 }}>
                                    {aiResult.title}
                                </h1>

                                {/* Content */}
                                <div
                                    className="preview-content"
                                    dangerouslySetInnerHTML={{ __html: aiResult.content }}
                                />

                                {/* Tags */}
                                {aiResult.tags && aiResult.tags.length > 0 && (
                                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {aiResult.tags.map((tag) => (
                                                <span key={tag} className="tag">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SEO Tips */}
                                {aiResult.seoTips && aiResult.seoTips.length > 0 && (
                                    <div style={{ marginTop: 16, padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--info)' }}>💡 SEO 개선 제안</div>
                                        {aiResult.seoTips.map((tip, i) => (
                                            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                • {tip}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="preview-placeholder">
                                <div className="preview-placeholder-icon">✨</div>
                                <div>
                                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI 편집 결과가 여기에 표시됩니다</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        왼쪽에 초안을 입력하고 &quot;AI 편집 시작&quot; 버튼을 클릭하세요
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
