'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import './editor.css';

// ── SVG Icon System (replaces emojis for consistent rendering) ──
const I = {
    filePlus: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
    folderOpen: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" /></svg>,
    search: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
    tag: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>,
    target: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
    command: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" /></svg>,
    save: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></svg>,
    rocket: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
    sparkles: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" /></svg>,
};

export default function EditorPage() {
    // ── State ──
    const [postId, setPostId] = useState(null);
    // v7: Soft UI layout state
    const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
    const [sideOpen, setSideOpen] = useState(true);
    const [focusMode, setFocusMode] = useState(false);
    const [showCmdPalette, setShowCmdPalette] = useState(false);
    const [cmdSearch, setCmdSearch] = useState('');
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
    const [publishPlatforms, setPublishPlatforms] = useState({ naver: false, wordpress: false, tistory: false, velog: false });
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
                handleSave();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isGenerating && rawText.trim()) handleGenerate();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowCmdPalette(prev => !prev);
                setCmdSearch('');
            }
            if (e.key === 'Escape') {
                setShowCmdPalette(false);
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
                } else if (platform === 'velog') {
                    credentials = {}; // 쿠키 파일 기반 인증
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

            // Convert images to Base64 for AI visual analysis (resized to max 1024px for payload size)
            const imageDataArr = [];
            for (const img of images) {
                if (img.file) {
                    try {
                        const base64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                // Resize image to max 1024px to keep payload small
                                const imgEl = new Image();
                                imgEl.onload = () => {
                                    const MAX = 1024;
                                    let w = imgEl.width, h = imgEl.height;
                                    if (w > MAX || h > MAX) {
                                        const ratio = Math.min(MAX / w, MAX / h);
                                        w = Math.round(w * ratio);
                                        h = Math.round(h * ratio);
                                    }
                                    const canvas = document.createElement('canvas');
                                    canvas.width = w; canvas.height = h;
                                    canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
                                    resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                                };
                                imgEl.onerror = reject;
                                imgEl.src = reader.result;
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(img.file);
                        });
                        imageDataArr.push({ base64, mimeType: 'image/jpeg', memo: img.memo || '' });
                    } catch (e) {
                        console.error('Image conversion error:', e);
                        imageDataArr.push({ base64: null, mimeType: null, memo: img.memo || '' });
                    }
                }
            }

            const res = await fetch('/api/ai/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: `제목: ${title}\n\n${rawText}`,
                    imageInfos: images.map((img, i) => ({ index: i + 1, memo: img.memo || '' })),
                    imageData: imageDataArr,
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
        setTranslateResult(null); setThumbnailData(null);
        localStorage.removeItem('blogflow_draft');
        showToast('새 글 시작');
    };

    // ── F8: SNS Repurpose ──
    // State already declared above

    const handleRepurpose = async () => {
        if (!aiResult?.content) { showToast('변환할 콘텐츠가 없습니다', 'error'); return; }
        setIsRepurposing(true);
        try {
            const res = await fetch('/api/ai/repurpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: aiResult.title,
                    content: aiResult.content,
                    platforms: ['instagram', 'twitter', 'linkedin', 'thread']
                })
            });
            const data = await res.json();
            if (data.success) { setRepurposeResult(data.repurposed); }
            else showToast('변환 실패: ' + data.error, 'error');
        } catch (e) { showToast('변환 에러: ' + e.message, 'error'); }
        setIsRepurposing(false);
    };

    useEffect(() => {
        if (showRepurpose && !repurposeResult && aiResult) {
            handleRepurpose();
        }
    }, [showRepurpose, aiResult]);

    // ── F10: 번역 ──
    const [translateResult, setTranslateResult] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateLang, setTranslateLang] = useState('en');
    const handleTranslate = async () => {
        if (!aiResult) { showToast('먼저 AI 생성을 해주세요'); return; }
        setIsTranslating(true);
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: aiResult.title, content: aiResult.content, targetLang: translateLang }),
            });
            const data = await res.json();
            if (data.success) { setTranslateResult(data); showToast(`${data.flag} 번역 완료`); }
            else showToast('번역 실패: ' + data.error, 'error');
        } catch (e) { showToast('번역 에러: ' + e.message, 'error'); }
        setIsTranslating(false);
    };

    // ── F7: Enhanced Batch Publish (duplicate check) ──
    const handleBatchPublishV2 = async () => {
        const platforms = Object.entries(publishPlatforms).filter(([, v]) => v).map(([k]) => k);
        if (platforms.length === 0) { showToast('플랫폼을 선택하세요'); return; }

        const publishTitle = aiResult?.title || title || '제목 없음';
        const publishContent = aiResult?.content || rawText || '';
        const publishTags = aiResult?.tags || manualTags || [];
        if (!publishContent.trim()) { showToast('발행할 내용이 없습니다'); return; }

        setIsPublishing(true);
        const settings = JSON.parse(localStorage.getItem('blogflow_settings') || '{}');
        const results = {};
        const imagePaths = (aiResult?.uploadedImages || []).map(img => img.originalUrl || img.url).filter(Boolean);

        for (const platform of platforms) {
            try {
                setPublishStatus(prev => ({ ...prev, [platform]: 'publishing' }));

                let credentials = {};
                if (platform === 'wordpress') credentials = { siteUrl: settings.wpUrl, username: settings.wpUser, appPassword: settings.wpPass };
                else if (platform === 'tistory') credentials = { accessToken: settings.tsToken, blogName: settings.tsBlogName };
                else if (platform === 'naver') credentials = { naverBlogId: settings.naverBlogId };

                const res = await fetch('/api/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform,
                        credentials,
                        post: { title: publishTitle, content: publishContent, tags: publishTags, imagePaths },
                    }),
                });
                const data = await res.json();

                // F7: 중복 발행 감지
                if (data.isDuplicate) {
                    if (!confirm(`"${publishTitle}"은(는) ${platform}에 이미 발행되었습니다. 다시 발행하시겠습니까?`)) {
                        results[platform] = 'skipped';
                        setPublishStatus(prev => ({ ...prev, [platform]: 'skipped' }));
                        continue;
                    }
                    // 중복 확인 후 재발행
                    const res2 = await fetch('/api/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platform, credentials, skipDuplicateCheck: true,
                            post: { title: publishTitle, content: publishContent, tags: publishTags, imagePaths },
                        }),
                    });
                    const data2 = await res2.json();
                    results[platform] = data2.success ? 'success' : 'error';
                    setPublishStatus(prev => ({ ...prev, [platform]: data2.success ? 'success' : 'error' }));
                    if (data2.success && data2.postUrl) showToast(`${platform}: ${data2.postUrl}`);
                    continue;
                }

                results[platform] = data.success ? 'success' : 'error';
                setPublishStatus(prev => ({ ...prev, [platform]: data.success ? 'success' : 'error' }));
                if (data.success && data.postUrl) showToast(`${platform}: ${data.postUrl}`);
                else if (!data.success) showToast(`${platform} 실패: ${data.error || '오류'}`, 'error');
            } catch (e) {
                results[platform] = 'error';
                setPublishStatus(prev => ({ ...prev, [platform]: 'error' }));
                showToast(`${platform} 에러: ${e.message}`, 'error');
            }
        }

        const successCount = Object.values(results).filter(r => r === 'success').length;
        showToast(`${successCount}/${platforms.length} 플랫폼 발행 완료`);
        setIsPublishing(false);
    };

    const getSeoClass = (score) => score >= 80 ? 'seo-good' : score >= 50 ? 'seo-ok' : 'seo-bad';
    const getSeoIcon = (status) => status === 'good' ? 'good' : status === 'warn' ? 'warn' : 'bad';

    // v7: Command palette commands
    const commands = [
        { icon: '✨', label: 'AI 편집 시작', shortcut: 'Ctrl+Enter', action: () => { if (rawText.trim()) handleGenerate(); setShowCmdPalette(false); } },
        { icon: '💾', label: '초안 저장', shortcut: 'Ctrl+S', action: () => { handleSave('draft'); setShowCmdPalette(false); } },
        { icon: '📝', label: '새 글 시작', action: () => { handleNewPost(); setShowCmdPalette(false); } },
        { icon: '📂', label: '글 불러오기', action: () => { loadExistingPosts(); setShowCmdPalette(false); } },
        { icon: '🔍', label: '키워드 분석', action: () => { setShowKeywords(true); setShowCmdPalette(false); } },
        { icon: '🏷️', label: '제목 A/B 테스트', action: () => { handleTitleAB(); setShowCmdPalette(false); } },
        { icon: '📊', label: 'SEO 분석', action: () => { runSeoAnalysis(); setShowCmdPalette(false); } },
        { icon: '🌐', label: '번역 발행', action: () => { setSideOpen(true); setShowCmdPalette(false); } },
        { icon: '🚀', label: '플랫폼 발행', action: () => { setShowPublish(true); setShowCmdPalette(false); } },
        { icon: '🖼️', label: '썸네일 생성', action: () => { setShowThumbnail(true); setShowCmdPalette(false); } },
        { icon: '📱', label: 'SNS 변환', action: () => { if (aiResult) { setShowRepurpose(true); } setShowCmdPalette(false); } },
        { icon: '👁️', label: '플랫폼 미리보기', action: () => { setShowPreview(true); setShowCmdPalette(false); } },
        { icon: '🎯', label: '포커스 모드', action: () => { setFocusMode(f => !f); setSideOpen(false); setShowCmdPalette(false); } },
        { icon: '📋', label: 'HTML 복사', action: () => { copyToClipboard('html'); setShowCmdPalette(false); } },
        { icon: '📋', label: 'MD 복사', action: () => { copyToClipboard('markdown'); setShowCmdPalette(false); } },
    ].filter(c => !cmdSearch || c.label.toLowerCase().includes(cmdSearch.toLowerCase()));

    return (
        <div className="editor-v7">
            {/* Toast */}
            {toastMessage && (
                <div className="soft-toast-container">
                    <div className={`soft-toast ${toastMessage.includes('실패') || toastMessage.includes('오류') ? 'soft-toast-error' : toastMessage.includes('완료') || toastMessage.includes('적용') ? 'soft-toast-success' : 'soft-toast-info'}`}>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Command Palette (Ctrl+K) */}
            {showCmdPalette && (
                <div className="command-palette-overlay" onClick={() => setShowCmdPalette(false)}>
                    <div className="command-palette" onClick={e => e.stopPropagation()}>
                        <input className="command-palette-input" placeholder="명령어 검색... (AI 생성, 발행, SEO 등)" value={cmdSearch} onChange={e => setCmdSearch(e.target.value)} autoFocus />
                        <div className="command-palette-list">
                            {commands.map((c, i) => (
                                <div key={i} className="command-item" onClick={c.action}>
                                    <span className="command-item-icon">{c.icon}</span>
                                    <span className="command-item-label">{c.label}</span>
                                    {c.shortcut && <span className="command-item-shortcut">{c.shortcut}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {showLoadModal && (
                <div className="soft-modal-overlay" onClick={() => setShowLoadModal(false)}>
                    <div className="soft-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>글 불러오기</h3>
                            <button className="soft-modal-close" onClick={() => setShowLoadModal(false)}>×</button>
                        </div>
                        {existingPosts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>저장된 글이 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {existingPosts.map((p) => (
                                    <div key={p.id} className="soft-card-flat" style={{ cursor: 'pointer' }} onClick={() => loadPost(p)}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString('ko-KR')} · {p.status}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Title A/B Modal */}
            {showTitleAB && titleCandidates.length > 0 && (
                <div className="soft-modal-overlay" onClick={() => setShowTitleAB(false)}>
                    <div className="soft-modal" style={{ width: 550 }} onClick={(e) => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <div>
                                <h3>제목 A/B 테스트</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>클릭하여 제목 적용</p>
                            </div>
                            <button className="soft-modal-close" onClick={() => setShowTitleAB(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {titleCandidates.map((t, i) => (
                                <div key={i} className="soft-card-flat" style={{ cursor: 'pointer' }} onClick={() => { setTitle(t.title); if (aiResult) setAiResult({ ...aiResult, title: t.title }); setShowTitleAB(false); showToast('제목 적용 완료'); }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.title}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                        <span className="soft-tag">CTR {t.estimatedCTR || '?'}%</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.style}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.reason}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Mini Action Header ─── */}
            <div className="editor-header">
                <div className="editor-header-left">
                    <span className="editor-header-title">BlogFlow</span>
                    <div className="editor-tabs">
                        <button className={`editor-tab ${activeTab === 'write' ? 'active' : ''}`} onClick={() => setActiveTab('write')}>작성</button>
                        <button className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>미리보기</button>
                    </div>
                </div>
                <div className="editor-header-right">
                    {/* File group */}
                    <button className="soft-icon-btn" title="새 글" onClick={handleNewPost}>{I.filePlus}</button>
                    <button className="soft-icon-btn" title="불러오기" onClick={loadExistingPosts}>{I.folderOpen}</button>
                    <span className="soft-icon-divider" />
                    {/* AI group */}
                    <button className="soft-icon-btn" title="키워드 분석" onClick={() => setShowKeywords(!showKeywords)}>{I.search}</button>
                    <button className="soft-icon-btn" title="제목 A/B" onClick={handleTitleAB} disabled={isGeneratingTitles}>{isGeneratingTitles ? '···' : I.tag}</button>
                    <span className="soft-icon-divider" />
                    {/* View group */}
                    <button className={`soft-icon-btn ${focusMode ? 'active' : ''}`} title="포커스 모드" onClick={() => { setFocusMode(f => !f); if (!focusMode) setSideOpen(false); else setSideOpen(true); }}>{I.target}</button>
                    <button className={`soft-icon-btn ${sideOpen ? 'active' : ''}`} title="사이드 패널" onClick={() => setSideOpen(o => !o)}>{I.settings}</button>
                    <button className="soft-icon-btn" title="Ctrl+K" onClick={() => { setShowCmdPalette(true); setCmdSearch(''); }}>{I.command}</button>
                    <span className="soft-icon-divider" />
                    {/* Actions */}
                    <button className="soft-btn soft-btn-sm" onClick={() => handleSave('draft')} disabled={isSaving} style={{ gap: 4 }}>{isSaving ? <span className="soft-spinner" /> : I.save} 저장</button>
                    {aiResult && <button className="soft-btn soft-btn-primary soft-btn-sm" onClick={() => setShowPublish(true)} style={{ gap: 4 }}>{I.rocket} 발행</button>}
                </div>
            </div>

            {/* ─── Main Body ─── */}
            <div className="editor-body">
                {showKeywords && (
                    <div className="soft-card" style={{ margin: '16px 24px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span className="side-panel-title" style={{ marginBottom: 0 }}>키워드 리서치</span>
                            <button className="soft-btn-ghost soft-btn soft-btn-sm" onClick={() => setShowKeywords(false)}>닫기</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input type="text" className="soft-input soft-input-sm" placeholder="주제를 입력하세요 (예: 강남 맛집)" value={keywordTopic} onChange={(e) => setKeywordTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleKeywordResearch()} style={{ flex: 1 }} />
                            <button className="soft-btn soft-btn-primary soft-btn-sm" onClick={handleKeywordResearch} disabled={isAnalyzingKeywords}>
                                {isAnalyzingKeywords ? '분석 중...' : '분석'}
                            </button>
                        </div>
                        {keywordResult && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="soft-card-flat">
                                    <div className="side-panel-title">관련 키워드</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {(keywordResult.relatedKeywords || []).map((k, i) => (
                                            <span key={i} className="soft-chip" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setManualTags(prev => [...new Set([...prev, k.keyword])]); showToast(`"${k.keyword}" 태그 추가`); }}>
                                                {k.keyword} <span style={{ opacity: 0.5 }}>{k.searchVolume}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="soft-card-flat">
                                    <div className="side-panel-title">추천 제목</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(keywordResult.suggestedTitle || []).map((t, i) => (
                                            <div key={i} className="soft-chip" style={{ fontSize: 11, padding: '4px 10px', textAlign: 'left' }} onClick={() => { setTitle(t); showToast('제목 적용'); }}>
                                                {t}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* ─── Editor Main Area ─── */}
                <div className={`editor-main ${focusMode ? 'focus-mode' : ''}`}>

                    {/* === WRITE TAB === */}
                    {activeTab === 'write' && (
                        <>
                            {error && <div className="soft-error">{error}</div>}

                            <input type="text" className="soft-input soft-title-input" placeholder="제목을 입력하세요" value={title} onChange={e => setTitle(e.target.value)} />

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="soft-form-group" style={{ flex: 1 }}>
                                    <label className="soft-form-label">템플릿</label>
                                    <select className="soft-input soft-input-sm" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                                        <option value="">기본</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="soft-form-group" style={{ flex: 1 }}>
                                    <label className="soft-form-label">카테고리</label>
                                    <input type="text" className="soft-input soft-input-sm" placeholder="맛집, IT, 여행..." value={category} onChange={e => setCategory(e.target.value)} />
                                </div>
                            </div>

                            <div className="soft-form-group">
                                <label className="soft-form-label">톤 &amp; 스타일</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {tones.map(t => (
                                        <button key={t.key} className={`soft-chip ${tone === t.key ? 'active' : ''}`} onClick={() => setTone(t.key)}>{t.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="soft-form-group">
                                <label className="soft-form-label">본문 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{stats.charCount}자 · {stats.readingTime}분</span></label>
                                <div className="soft-textarea-wrap">
                                    <textarea className="soft-input soft-textarea" placeholder={`대략적인 내용을 작성하세요.\n\n예시:\n- 주제의 핵심 포인트\n- 포함하고 싶은 정보\n- 참고할 경험이나 데이터\n\nAI가 파워블로거 스타일로 변환합니다.`} value={rawText} onChange={e => { setRawText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} rows={8} />
                                    <span className="soft-textarea-counter">{rawText.length}자</span>
                                </div>
                            </div>

                            <button className="soft-btn soft-btn-ghost soft-btn-sm" onClick={() => setShowCustomPrompt(!showCustomPrompt)} style={{ alignSelf: 'flex-start' }}>
                                {showCustomPrompt ? '−' : '+'} 추가 지시사항
                            </button>
                            {showCustomPrompt && (
                                <textarea className="soft-input" style={{ minHeight: 80 }} placeholder="예: 비교 표를 추가해줘, 사진 설명을 자세히..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                            )}

                            <div className="soft-form-group">
                                <label className="soft-form-label">사진 ({images.length}장)</label>
                                <div className={`soft-uploader ${isDragging ? 'dragging' : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                                    <div className="soft-uploader-icon">↑</div>
                                    <div className="soft-uploader-text">클릭 또는 드래그앤드롭</div>
                                    <div className="soft-uploader-hint">JPG, PNG, WebP · 자동 압축</div>
                                    <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(Array.from(e.target.files))} />
                                </div>
                                {images.length > 0 && (
                                    <div className="soft-image-grid">
                                        {images.map((img, index) => (
                                            <div key={img.id} className={`soft-image-item ${draggedIndex === index ? 'dragging' : ''}`} draggable onDragStart={() => handleImageDragStart(index)} onDragOver={e => handleImageDragOver(e, index)} onDragEnd={handleImageDragEnd}>
                                                <img src={img.url} alt={img.name} />
                                                <div className="soft-image-number">{index + 1}</div>
                                                <button className="soft-image-remove" onClick={e => { e.stopPropagation(); removeImage(img.id); }}>×</button>
                                                <div className="soft-image-memo">
                                                    <input type="text" placeholder="메모..." value={img.memo} onChange={e => updateImageMemo(img.id, e.target.value)} onClick={e => e.stopPropagation()} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="soft-form-group">
                                <label className="soft-form-label">태그</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                    {manualTags.map(tag => (
                                        <span key={tag} className="soft-tag">#{tag}<span className="soft-tag-remove" onClick={() => setManualTags(prev => prev.filter(t => t !== tag))}>×</span></span>
                                    ))}
                                    <input className="soft-input soft-input-sm" style={{ flex: 1, minWidth: 120, boxShadow: 'none' }} placeholder="Enter로 추가..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
                                </div>
                            </div>

                            <button className="soft-btn soft-btn-primary soft-btn-lg" onClick={handleGenerate} disabled={isGenerating || !rawText.trim()} style={{ width: '100%' }}>
                                {isGenerating ? <><span className="soft-spinner" /> AI 편집 중...</> : <>{I.sparkles} AI 편집 시작</>}
                            </button>
                        </>
                    )}

                    {/* === PREVIEW TAB === */}
                    {activeTab === 'preview' && (
                        <div className="soft-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span className="side-panel-title" style={{ marginBottom: 0 }}>미리보기</span>
                                {aiResult && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="soft-btn soft-btn-sm" onClick={handleGenerate} disabled={isGenerating}>재생성</button>
                                        <button className="soft-btn soft-btn-sm" onClick={() => copyToClipboard('html')}>HTML</button>
                                        <button className="soft-btn soft-btn-sm" onClick={() => copyToClipboard('markdown')}>MD</button>
                                    </div>
                                )}
                            </div>
                            {isGenerating ? (
                                <div className="soft-generating">
                                    <div className="soft-generating-shimmer" />
                                    <div className="soft-generating-shimmer" />
                                    <div className="soft-generating-shimmer" />
                                    <div className="soft-generating-dots"><span /><span /><span /></div>
                                    <p style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 13 }}>AI 편집 중...</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>{templateId ? `${templates.find(t => t.id === templateId)?.label} 템플릿 적용 중` : '잠시만 기다려주세요'}</p>
                                </div>
                            ) : aiResult ? (
                                <div>
                                    {seoResult && (
                                        <div className="soft-card-flat" style={{ marginBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <div className={`seo-ring ${getSeoClass(seoResult.score)}`}>{seoResult.score}</div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700 }}>SEO: {seoResult.grade}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seoResult.stats?.charCount}자 · {seoResult.stats?.readingTime}분 · {seoResult.stats?.imgCount}이미지</div>
                                                </div>
                                                <div style={{ flex: 1 }} />
                                                <input type="text" className="soft-input soft-input-sm" style={{ width: 120 }} placeholder="SEO 키워드" value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} />
                                                <button className="soft-btn soft-btn-sm" onClick={runSeoAnalysis}>분석</button>
                                            </div>
                                            {seoResult.checks && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                                    {seoResult.checks.map((c, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                                            <span className={`status-dot-indicator dot-${getSeoIcon(c.status)}`} />
                                                            <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>{c.detail}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {aiResult.metaDescription && (
                                        <div className="soft-card-flat" style={{ marginBottom: 12, padding: 10, fontSize: 12 }}>
                                            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.5 }}>META </span>{aiResult.metaDescription}
                                        </div>
                                    )}
                                    <h1
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={e => setAiResult(prev => ({ ...prev, title: e.target.innerText.trim() }))}
                                        style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 12px', lineHeight: 1.4, outline: 'none', borderBottom: '1px dashed transparent', cursor: 'text' }}
                                        onFocus={e => e.target.style.borderBottom = '1px dashed var(--accent)'}
                                        onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = '1px dashed transparent'; }}
                                        dangerouslySetInnerHTML={{ __html: aiResult.title }}
                                    />
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                                        클릭하여 직접 편집 가능
                                    </div>
                                    <div
                                        className="preview-content"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={e => setAiResult(prev => ({ ...prev, content: e.target.innerHTML }))}
                                        style={{ outline: 'none', minHeight: 200, cursor: 'text' }}
                                        dangerouslySetInnerHTML={{ __html: aiResult.content }}
                                    />
                                    {aiResult.tags?.length > 0 && (
                                        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--neu-bg-light)' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                {aiResult.tags.map(tag => <span key={tag} className="soft-tag">#{tag}</span>)}
                                            </div>
                                        </div>
                                    )}
                                    {aiResult.seoTips?.length > 0 && (
                                        <div className="soft-card-flat" style={{ marginTop: 12, padding: 12 }}>
                                            <div className="side-panel-title">SEO 개선 제안</div>
                                            {aiResult.seoTips.map((tip, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>• {tip}</div>)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12 }}>···</div>
                                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>AI 편집 결과가 여기에 표시됩니다</p>
                                    <p style={{ fontSize: 12 }}>작성 탭에서 초안 입력 → AI 편집 시작</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>{/* end editor-main */}

                {/* ─── Side Panel ─── */}
                {sideOpen && !focusMode && (
                    <div className="editor-side-panel">
                        <div className="side-panel-title">도구</div>

                        {/* Quick Actions */}
                        {aiResult && (
                            <div className="soft-form-group">
                                <button className="soft-btn soft-btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={async () => {
                                    setIsRepurposing(true); setShowRepurpose(true);
                                    try { const res = await fetch('/api/ai/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: aiResult.title, content: aiResult.content }) }); const d = await res.json(); if (d.success) setRepurposeResult(d.repurposed); } catch { }
                                    setIsRepurposing(false);
                                }}>📱 SNS 변환</button>
                                <button className="soft-btn soft-btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => setShowPreview(true)}>👁️ 플랫폼 미리보기</button>
                                <button className="soft-btn soft-btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => setShowThumbnail(true)}>🖼️ 썸네일 생성</button>
                                {postId && <button className="soft-btn soft-btn-sm" style={{ width: '100%' }} onClick={async () => { const res = await fetch(`/api/posts?history=${postId}`); const d = await res.json(); if (d.success) { setHistoryVersions(d.versions || []); setShowHistory(true); } }}>📋 히스토리</button>}
                            </div>
                        )}

                        {/* Translate */}
                        {aiResult && (
                            <div className="soft-form-group">
                                <div className="side-panel-title">번역</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select className="soft-input soft-input-sm" value={translateLang} onChange={e => setTranslateLang(e.target.value)} style={{ flex: 1 }}>
                                        <option value="en">🇺🇸 English</option>
                                        <option value="ja">🇯🇵 日本語</option>
                                        <option value="zh">🇨🇳 中文</option>
                                        <option value="es">🇪🇸 Español</option>
                                    </select>
                                    <button className="soft-btn soft-btn-sm" onClick={handleTranslate} disabled={isTranslating}>{isTranslating ? '...' : '번역'}</button>
                                </div>
                                {translateResult && <div className="soft-card-flat" style={{ marginTop: 6, fontSize: 11 }}>{translateResult.flag} {translateResult.title}</div>}
                            </div>
                        )}

                        {/* Schedule */}
                        <div className="soft-form-group">
                            <div className="side-panel-title">예약</div>
                            <input type="date" className="soft-input soft-input-sm" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={{ marginBottom: 6 }} />
                            <input type="time" className="soft-input soft-input-sm" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                            {scheduledDate && scheduledTime && <button className="soft-btn soft-btn-primary soft-btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => handleSave('scheduled')}>예약 저장</button>}
                        </div>

                        {/* Publish */}
                        {aiResult && (
                            <div className="soft-form-group">
                                <div className="side-panel-title">발행</div>
                                {[
                                    { key: 'naver', label: '네이버', color: '#03c75a' },
                                    { key: 'wordpress', label: 'WordPress', color: '#21759b' },
                                    { key: 'tistory', label: '티스토리', color: '#f36f21' },
                                    { key: 'velog', label: 'Velog', color: '#20c997' },
                                ].map(p => (
                                    <label key={p.key} className={`soft-platform-item ${publishPlatforms[p.key] ? 'active' : ''}`} style={{ '--platform-color': p.color }}>
                                        <input type="checkbox" checked={publishPlatforms[p.key]} onChange={e => setPublishPlatforms(prev => ({ ...prev, [p.key]: e.target.checked }))} style={{ display: 'none' }} />
                                        <span style={{ fontWeight: 700, color: p.color }}>{p.label}</span>
                                        {publishStatus[p.key] && <span style={{ fontSize: 10, marginLeft: 'auto' }}>{publishStatus[p.key] === 'publishing' ? '...' : publishStatus[p.key] === 'success' ? '✓' : '✗'}</span>}
                                    </label>
                                ))}
                                <button className="soft-btn soft-btn-primary soft-btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={handleBatchPublishV2} disabled={isPublishing}>{isPublishing ? '발행 중...' : '🚀 발행하기'}</button>
                            </div>
                        )}
                    </div>
                )}
            </div>{/* end editor-body */}

            {/* ─── Footer Stats Bar ─── */}
            <div className="editor-footer">
                <div className="editor-footer-stats">
                    <span className="editor-footer-stat"><b>{stats.charCount}</b>자</span>
                    <span className="editor-footer-stat"><b>{stats.readingTime}</b>분 읽기</span>
                    <span className="editor-footer-stat"><b>{images.length}</b>장</span>
                    <span className="editor-footer-stat"><b>{manualTags.length}</b>태그</span>
                    {seoResult && <span className="editor-footer-stat" style={{ color: seoResult.score >= 80 ? 'var(--success)' : seoResult.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>SEO <b>{seoResult.score}</b></span>}
                </div>
                <div className="editor-footer-right">
                    {postId && <span>ID: {postId.slice(0, 8)}</span>}
                    <span>{activeTab === 'write' ? '작성 모드' : '미리보기'}{focusMode ? ' · 포커스' : ''}</span>
                </div>
            </div>

            {/* ═══ Modals ═══ */}

            {/* Publish Modal */}
            {showPublish && (
                <div className="soft-modal-overlay" onClick={() => setShowPublish(false)}>
                    <div className="soft-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>플랫폼 발행</h3>
                            <button className="soft-modal-close" onClick={() => setShowPublish(false)}>×</button>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>발행할 플랫폼을 선택하세요.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[{ key: 'naver', name: '네이버', color: '#03c75a' }, { key: 'wordpress', name: 'WordPress', color: '#21759b' }, { key: 'tistory', name: '티스토리', color: '#f36f21' }, { key: 'velog', name: 'Velog', color: '#20c997' }].map(p => (
                                <div key={p.key} className={`soft-card-flat ${publishPlatforms[p.key] ? 'active' : ''}`} style={{ cursor: 'pointer', textAlign: 'center', padding: 16 }} onClick={() => setPublishPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}>
                                    <div style={{ fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{publishStatus[p.key] === 'success' ? '✓ 완료' : publishStatus[p.key] === 'error' ? '✗ 실패' : publishPlatforms[p.key] ? '선택됨' : '선택'}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="soft-btn soft-btn-sm" onClick={() => setShowPublish(false)}>취소</button>
                            <button className="soft-btn soft-btn-primary soft-btn-sm" onClick={handleBatchPublish} disabled={isPublishing}>{isPublishing ? '발행 중...' : '발행하기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform Preview Modal */}
            {showPreview && aiResult && (
                <div className="soft-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="soft-modal" style={{ width: '90%', maxWidth: 800 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>플랫폼별 미리보기</h3>
                            <button className="soft-modal-close" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {[{ k: 'naver', l: '네이버' }, { k: 'tistory', l: '티스토리' }, { k: 'velog', l: 'Velog' }, { k: 'wordpress', l: 'WordPress' }].map(p => (
                                <button key={p.k} className={`soft-chip ${previewPlatform === p.k ? 'active' : ''}`} onClick={() => setPreviewPlatform(p.k)}>{p.l}</button>
                            ))}
                        </div>
                        <div style={{ background: previewPlatform === 'velog' ? '#1e1e1e' : '#fff', color: previewPlatform === 'velog' ? '#d9d9d9' : '#333', padding: 24, borderRadius: 12, border: '1px solid var(--neu-bg-light)' }}>
                            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{aiResult.title}</h1>
                            <div style={{ fontSize: 14, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: aiResult.content?.slice(0, 1500) }} />
                            {aiResult.tags?.length > 0 && <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{aiResult.tags.map(t => <span key={t} className="soft-tag">#{t}</span>)}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Repurpose Modal */}
            {showRepurpose && (
                <div className="soft-modal-overlay" onClick={() => setShowRepurpose(false)}>
                    <div className="soft-modal" style={{ width: '90%', maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>SNS 변환</h3>
                            <button className="soft-modal-close" onClick={() => setShowRepurpose(false)}>×</button>
                        </div>
                        {isRepurposing ? (
                            <div style={{ textAlign: 'center', padding: 40 }}><div className="soft-spinner" style={{ margin: '0 auto 16px' }} />변환 중...</div>
                        ) : repurposeResult ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {Object.entries(repurposeResult).map(([platform, text]) => (
                                    <div key={platform} className="soft-card-flat">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{platform === 'instagram' ? '인스타그램' : platform === 'twitter' ? 'X' : platform === 'linkedin' ? '링크드인' : platform}</span>
                                            <button className="soft-btn soft-btn-sm" onClick={() => navigator.clipboard.writeText(text)}>복사</button>
                                        </div>
                                        <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{text}</div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {showLoadModal && (
                <div className="soft-modal-overlay" onClick={() => setShowLoadModal(false)}>
                    <div className="soft-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>불러오기</h3>
                            <button className="soft-modal-close" onClick={() => setShowLoadModal(false)}>×</button>
                        </div>
                        {existingPosts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>저장된 글이 없습니다</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {existingPosts.map(p => (
                                    <div key={p.id} className="soft-card-flat" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => loadPost(p)}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title || '제목 없음'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.updatedAt).toLocaleString()} · {p.status}</div>
                                        </div>
                                        <button className="soft-btn soft-btn-sm soft-btn-ghost">선택</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="soft-modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="soft-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>버전 히스토리</h3>
                            <button className="soft-modal-close" onClick={() => setShowHistory(false)}>×</button>
                        </div>
                        {historyVersions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>이전 버전이 없습니다</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {historyVersions.slice().reverse().map((v, i) => (
                                    <div key={i} className="soft-card-flat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>v{v.version} — {v.title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(v.savedAt).toLocaleString('ko-KR')}</div>
                                        </div>
                                        <button className="soft-btn soft-btn-sm" onClick={() => { setRawText(v.rawText || ''); setTitle(v.title || ''); setShowHistory(false); }}>복원</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Thumbnail Modal */}
            {showThumbnail && (
                <div className="soft-modal-overlay" onClick={() => setShowThumbnail(false)}>
                    <div className="soft-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div className="soft-modal-header">
                            <h3>썸네일 생성</h3>
                            <button className="soft-modal-close" onClick={() => setShowThumbnail(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {['modern', 'warm', 'nature', 'ocean', 'minimal'].map(s => (
                                <button key={s} className={`soft-chip ${thumbnailStyle === s ? 'active' : ''}`} onClick={async () => {
                                    setThumbnailStyle(s); setIsGenThumbnail(true);
                                    try { const res = await fetch('/api/ai/image-gen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: aiResult?.title || title, category, tags: aiResult?.tags || manualTags, style: s }) }); const d = await res.json(); if (d.success) setThumbnailData(d.thumbnail); } catch { }
                                    setIsGenThumbnail(false);
                                }}>{s}</button>
                            ))}
                        </div>
                        {isGenThumbnail ? (
                            <div style={{ textAlign: 'center', padding: 60 }}><div className="soft-spinner" style={{ margin: '0 auto 12px' }} />생성 중...</div>
                        ) : thumbnailData ? (
                            <div>
                                {thumbnailData.svg && <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--neu-bg-light)', marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: thumbnailData.svg }} />}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="soft-btn soft-btn-primary soft-btn-sm" onClick={() => { const blob = new Blob([thumbnailData.svg], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'thumbnail.svg'; a.click(); }}>SVG 다운로드</button>
                                    <button className="soft-btn soft-btn-sm" onClick={() => navigator.clipboard.writeText(thumbnailData.svg)}>SVG 복사</button>
                                    {thumbnailData.width && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{thumbnailData.width}x{thumbnailData.height}</span>}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
