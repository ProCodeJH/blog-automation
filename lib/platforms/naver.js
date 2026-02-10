// 네이버 블로그 자동 발행 모듈
// 내부 API 역공학 기반 — 쿠키 세션 인증

const NAVER_BLOG_BASE = 'https://blog.naver.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── 기존: 붙여넣기용 HTML 생성 ───

export function generateNaverHTML(post) {
    const { title, content, tags = [], images = [] } = post;

    const html = `
<div style="font-family: 'Noto Sans KR', sans-serif; max-width: 760px; margin: 0 auto; line-height: 1.8; color: #333;">
    <h2 style="font-size: 24px; font-weight: 700; color: #222; border-bottom: 3px solid #03c75a; padding-bottom: 12px; margin-bottom: 20px;">
        ${title}
    </h2>

    ${images.length > 0 ? `
    <div style="margin-bottom: 20px; text-align: center;">
        <img src="${images[0]}" alt="${title}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
    </div>
    ` : ''}

    <div style="font-size: 16px; line-height: 1.9; color: #333;">
        ${content}
    </div>

    ${tags.length > 0 ? `
    <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #888;">
            ${tags.map(t => `#${t}`).join(' ')}
        </p>
    </div>
    ` : ''}

    <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="font-size: 13px; color: #999; margin: 0;">
            이 글이 도움이 되셨다면 공감❤️ 부탁드려요!
        </p>
    </div>
</div>`.trim();

    return {
        html,
        plainText: content.replace(/<[^>]+>/g, ''),
        tags: tags.map(t => `#${t}`).join(' '),
    };
}

export function generateNaverSmartEditorHTML(post) {
    const { title, content, tags = [] } = post;
    return `<div class="se-main-container">
<div class="se-component se-text se-l-default">
<div class="se-component-content">
<div class="se-section se-section-text se-l-default">
<div class="se-module se-module-text">
<p class="se-text-paragraph se-text-paragraph-align-center" style=""><span style="font-size:24px;"><b>${title}</b></span></p>
</div>
</div>
</div>
</div>
<div class="se-component se-text se-l-default">
<div class="se-component-content">
<div class="se-section se-section-text se-l-default">
<div class="se-module se-module-text">
${content.split('\n').map(line => `<p class="se-text-paragraph" style="">${line || '<br>'}</p>`).join('\n')}
</div>
</div>
</div>
</div>
${tags.length > 0 ? `<div class="se-component se-text se-l-default"><div class="se-component-content"><div class="se-section se-section-text"><div class="se-module se-module-text"><p class="se-text-paragraph" style=""><span style="color:#03c75a;">${tags.map(t => '#' + t).join(' ')}</span></p></div></div></div></div>` : ''}
</div>`;
}

// ─── 신규: 내부 API 기반 자동 발행 ───

/**
 * 네이버 쿠키 파싱 — 사용자가 입력한 쿠키 문자열을 헤더용으로 변환
 */
export function parseCookieString(cookieStr) {
    if (!cookieStr || typeof cookieStr !== 'string') return null;
    // 기본 형식: "NID_AUT=xxx; NID_SES=yyy; ..."
    const cleaned = cookieStr.trim();
    // 필수 쿠키 확인
    const hasAuth = cleaned.includes('NID_AUT') || cleaned.includes('NID_SES') || cleaned.includes('nid_inf');
    if (!hasAuth) return null;
    return cleaned;
}

/**
 * 쿠키 유효성 검사 — 네이버 블로그에 실제 접근해서 로그인 상태 확인
 */
export async function validateNaverCookies(cookies) {
    try {
        const parsed = parseCookieString(cookies);
        if (!parsed) return { valid: false, error: '쿠키 형식이 올바르지 않습니다. NID_AUT, NID_SES 쿠키가 필요합니다.' };

        // 1차: section.blog.naver.com 으로 확인 (현재 유효한 URL)
        const res = await fetch('https://section.blog.naver.com/BlogHome.naver', {
            method: 'GET',
            headers: {
                'Cookie': parsed,
                'User-Agent': USER_AGENT,
                'Accept': 'text/html',
            },
            redirect: 'follow',
        });

        if (res.status !== 200) {
            return { valid: false, error: `네이버 접근 실패 (${res.status}). 쿠키를 다시 확인해주세요.` };
        }

        const html = await res.text();

        // 로그인 여부 확인 — 로그인 폼이 있거나 로그인 유도가 있으면 미인증
        if (html.includes('nid.naver.com/nidlogin') || html.includes('id="loginForm"')) {
            return { valid: false, error: '쿠키가 만료되었습니다. 브라우저에서 다시 추출해주세요.' };
        }

        // 블로그 아이디 추출 시도
        const blogIdMatch = html.match(/blogId['"]*\s*[:=]\s*['"]([a-zA-Z0-9_]+)['"]/) ||
            html.match(/"blogId"\s*:\s*"([^"]+)"/) ||
            html.match(/blog\.naver\.com\/([a-zA-Z0-9_]{3,30})(?:\/|"|'|\s)/) ||
            html.match(/userId['"]*\s*[:=]\s*['"]([a-zA-Z0-9_]+)['"]/);

        const blogId = blogIdMatch ? blogIdMatch[1] : null;

        return {
            valid: true,
            blogId,
            message: blogId
                ? `✅ 인증 성공 (${blogId})`
                : '✅ 인증 성공 (블로그 ID를 수동 입력해주세요)'
        };
    } catch (error) {
        return { valid: false, error: `검증 실패: ${error.message}` };
    }
}

/**
 * 이미지 업로드 — UploadImage.naver 엔드포인트
 */
export async function uploadImageToNaver(imageBuffer, fileName, cookies, blogId) {
    try {
        const parsed = parseCookieString(cookies);
        if (!parsed) throw new Error('쿠키가 없습니다.');

        // FormData 구성
        const { FormData, Blob } = await import('node-fetch');

        // Node.js 18+ 내장 FormData 사용
        const formData = new globalThis.FormData();
        const blob = new globalThis.Blob([imageBuffer]);
        formData.append('image', blob, fileName || 'image.jpg');

        const referer = blogId
            ? `${NAVER_BLOG_BASE}/${blogId}`
            : `${NAVER_BLOG_BASE}/PostWriteForm.naver`;

        const res = await fetch(`${NAVER_BLOG_BASE}/UploadImage.naver`, {
            method: 'POST',
            headers: {
                'Cookie': parsed,
                'User-Agent': USER_AGENT,
                'Referer': referer,
            },
            body: formData,
        });

        if (!res.ok) {
            throw new Error(`이미지 업로드 실패: ${res.status} ${res.statusText}`);
        }

        const data = await res.text();

        // 응답에서 이미지 URL 추출 (JSON 또는 HTML 응답)
        let imageUrl;
        try {
            const json = JSON.parse(data);
            imageUrl = json.imageUrl || json.url || json.fileUrl;
        } catch {
            // HTML 응답에서 URL 추출
            const urlMatch = data.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/i);
            if (urlMatch) imageUrl = urlMatch[0];
        }

        if (!imageUrl) {
            // 업로드 자체는 성공했지만 URL을 파싱 못한 경우
            return { success: true, imageUrl: null, rawResponse: data.substring(0, 500) };
        }

        return { success: true, imageUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * 본문 내 이미지를 네이버에 업로드하고 URL 치환
 */
async function replaceImagesWithNaverUrls(content, cookies, blogId) {
    // <img src="..."> 패턴 찾기
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const replacements = [];

    while ((match = imgRegex.exec(content)) !== null) {
        const fullTag = match[0];
        const originalUrl = match[1];

        // 이미 네이버 CDN URL이면 스킵
        if (originalUrl.includes('blogfiles.naver.net') || originalUrl.includes('pstatic.net')) {
            continue;
        }

        // 외부 이미지 다운로드
        try {
            const imgRes = await fetch(originalUrl);
            if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                const fileName = originalUrl.split('/').pop()?.split('?')[0] || 'image.jpg';
                const uploadResult = await uploadImageToNaver(buffer, fileName, cookies, blogId);

                if (uploadResult.success && uploadResult.imageUrl) {
                    replacements.push({ original: originalUrl, naver: uploadResult.imageUrl });
                }
            }
        } catch {
            // 이미지 다운로드 실패 시 원본 유지
        }
    }

    let updatedContent = content;
    for (const r of replacements) {
        updatedContent = updatedContent.replace(r.original, r.naver);
    }

    return { content: updatedContent, uploadedCount: replacements.length };
}

/**
 * 네이버 블로그 자동 발행 — RabbitWrite.naver
 */
export async function publishToNaver(post, cookies, blogId = null) {
    try {
        const parsed = parseCookieString(cookies);
        if (!parsed) {
            return { success: false, error: '네이버 쿠키가 설정되지 않았습니다. 설정에서 입력해주세요.', fallbackToHTML: true };
        }

        // 1) 쿠키 유효성 검사
        const validation = await validateNaverCookies(cookies);
        if (!validation.valid) {
            return { success: false, error: validation.error, fallbackToHTML: true };
        }
        const activeBlogId = blogId || validation.blogId;

        // 2) 이미지 업로드 및 URL 치환
        let processedContent = post.content || '';
        let uploadedImages = 0;
        if (processedContent.includes('<img')) {
            const imageResult = await replaceImagesWithNaverUrls(processedContent, cookies, activeBlogId);
            processedContent = imageResult.content;
            uploadedImages = imageResult.uploadedCount;
        }

        // 3) 스마트에디터 포맷으로 변환
        const editorContent = generateNaverSmartEditorHTML({
            ...post,
            content: processedContent,
        });

        // 4) 글 발행 요청
        const postData = new URLSearchParams();
        postData.append('blogId', activeBlogId || '');
        postData.append('title', post.title || '');
        postData.append('contentHtml', editorContent);
        postData.append('tags', (post.tags || []).join(','));
        postData.append('categoryNo', post.categoryNo || '0');
        postData.append('openType', '3'); // 공개
        postData.append('saveType', '0'); // 발행

        const referer = activeBlogId
            ? `${NAVER_BLOG_BASE}/${activeBlogId}/postwrite`
            : `${NAVER_BLOG_BASE}/PostWriteForm.naver`;

        const res = await fetch(`${NAVER_BLOG_BASE}/RabbitWrite.naver`, {
            method: 'POST',
            headers: {
                'Cookie': parsed,
                'User-Agent': USER_AGENT,
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: postData.toString(),
        });

        if (!res.ok) {
            // 발행 실패 시 HTML 폴백
            return {
                success: false,
                error: `발행 실패 (${res.status}). 쿠키가 만료되었거나 API 스펙이 변경되었을 수 있습니다.`,
                fallbackToHTML: true,
            };
        }

        const responseText = await res.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText.substring(0, 500) };
        }

        // 성공 여부 판단
        const postUrl = responseData.postUrl || responseData.url ||
            (responseData.logNo ? `${NAVER_BLOG_BASE}/${activeBlogId}/${responseData.logNo}` : null);

        return {
            success: true,
            platform: 'naver',
            method: 'auto',
            message: `✅ 네이버 블로그에 자동 발행되었습니다!`,
            postUrl,
            blogId: activeBlogId,
            uploadedImages,
            response: responseData,
        };
    } catch (error) {
        return {
            success: false,
            error: `자동 발행 실패: ${error.message}`,
            fallbackToHTML: true,
        };
    }
}
