// 네이버 블로그 자동 발행 모듈
// 내부 API 역공학 기반 — 쿠키 세션 인증
import path from 'path';
import fs from 'fs';

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
    // 줄바꿈, 탭 등을 세미콜론 구분자로 치환
    let cleaned = cookieStr
        .replace(/[\r\n\t]+/g, ' ')   // 줄바꿈/탭 → 공백
        .replace(/\s+/g, ' ')          // 연속 공백 → 단일 공백
        .trim();
    // "NID_AUT=xxx NID_SES=yyy" 형태(세미콜론 없이 공백만)를 "NID_AUT=xxx; NID_SES=yyy"로 변환
    cleaned = cleaned.replace(/([a-zA-Z0-9+/=])\s+(NID_|nid_)/g, '$1; $2');
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
 * 네이버 블로그 자동 발행 — 3단계 전략
 * 1차: Puppeteer + Chrome 프로필 (쿠키 자동 유지)
 * 2차: Puppeteer + 수동 쿠키
 * 3차: HTML 복사 폴백
 */
export async function publishToNaver(post, cookies, blogId = null) {
    // 디버그 파일 로깅
    const _dbg = path.resolve(process.cwd(), 'naver_publish_debug.txt');
    const _dl = (m) => { try { fs.appendFileSync(_dbg, `[${new Date().toISOString()}] ${m}\n`, 'utf8'); } catch (e) { console.log('[_dl error]', e.message); } };
    try { fs.writeFileSync(_dbg, '', 'utf8'); } catch (e) { console.log('[_dbg init error]', e.message); }


    try {
        // .env.local 에서 쿠키/블로그ID 폴백
        const activeCookies = cookies || process.env.NAVER_COOKIES || '';
        let activeBlogId = blogId || process.env.NAVER_BLOG_ID || null;
        _dl(`START: cookies=${activeCookies.length}, blogId=${activeBlogId}`);

        // ===== 1차: Chrome 프로필 기반 자동 발행 =====
        try {
            _dl('1차: dynamic import...');
            const mod = await import('./naver-puppeteer.js');
            _dl(`import result keys: ${Object.keys(mod).join(', ')}`);
            const publishToNaverPuppeteer = mod.publishToNaverPuppeteer || mod.default?.publishToNaverPuppeteer;
            const getSessionStatus = mod.getSessionStatus || mod.default?.getSessionStatus;
            _dl(`publishToNaverPuppeteer: ${typeof publishToNaverPuppeteer}, getSessionStatus: ${typeof getSessionStatus}`);

            if (!publishToNaverPuppeteer) {
                _dl('ERROR: publishToNaverPuppeteer is undefined!');
                throw new Error('publishToNaverPuppeteer not found in module');
            }

            const session = getSessionStatus();
            _dl(`session: profileExists=${session.profileExists}, blogId=${session.blogId}`);

            if (session.profileExists || activeCookies) {
                console.log(`[Naver] Puppeteer 모드로 발행 시도... (프로필: ${session.profileExists}, 쿠키: ${!!activeCookies})`);

                if (!activeBlogId && session.blogId) {
                    activeBlogId = session.blogId;
                }

                if (!activeBlogId) {
                    _dl('blogId 감지 시도...');
                    const parsed = parseCookieString(activeCookies);
                    if (parsed) {
                        const validation = await validateNaverCookies(activeCookies);
                        _dl(`validation: valid=${validation.valid}, blogId=${validation.blogId}`);
                        if (validation.valid) activeBlogId = validation.blogId;
                    }
                }

                if (activeBlogId) {
                    const plainContent = (post.content || '')
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/p>/gi, '\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();

                    _dl(`Puppeteer call: blogId=${activeBlogId}, title=${(post.title || '').substring(0, 30)}, content=${plainContent.length}chars`);

                    const result = await publishToNaverPuppeteer({
                        cookies: activeCookies,
                        blogId: activeBlogId,
                        title: post.title || '',
                        content: plainContent,
                        tags: post.tags || [],
                        images: post.localImages || [],
                        headless: true,
                        useProfile: false,
                    });

                    _dl(`Puppeteer result: ${JSON.stringify(result).substring(0, 300)}`);

                    if (result.success) {
                        return {
                            success: true,
                            platform: 'naver',
                            method: 'puppeteer-profile',
                            message: `✅ 네이버 블로그에 자동 발행되었습니다!`,
                            postUrl: result.postUrl,
                            blogId: activeBlogId,
                            response: result,
                        };
                    }
                    console.log(`[Naver] 프로필 모드 실패: ${result.error}`);
                    _dl(`1차 실패: ${result.error}`);
                } else {
                    _dl('1차 스킵: blogId 없음');
                }
            } else {
                _dl('1차 스킵: profileExists=false, activeCookies=empty');
            }
        } catch (profileError) {
            console.log(`[Naver] 프로필 모드 에러: ${profileError.message}`);
            _dl(`1차 EXCEPTION: ${profileError.message}\n${profileError.stack}`);
        }

        // ===== 2차: 수동 쿠키 + Puppeteer =====
        const parsed = parseCookieString(activeCookies);
        if (!parsed) {
            return {
                success: false,
                error: '네이버 로그인이 필요합니다. 설정에서 "네이버 로그인" 버튼을 클릭해주세요.',
                fallbackToHTML: true,
                needLogin: true,
            };
        }

        if (!activeBlogId) {
            const validation = await validateNaverCookies(activeCookies);
            if (!validation.valid) {
                return { success: false, error: validation.error, fallbackToHTML: true };
            }
            activeBlogId = validation.blogId;
        }

        // ===== 1차: Puppeteer 자동 발행 시도 =====
        try {
            const { publishToNaverPuppeteer } = await import('./naver-puppeteer.js');
            console.log('[Naver] Puppeteer 자동 발행 시도...');

            // 본문에서 HTML 태그 제거 (Puppeteer는 plain text 입력)
            const plainContent = (post.content || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            const puppeteerResult = await publishToNaverPuppeteer({
                cookies: activeCookies,
                blogId: activeBlogId,
                title: post.title || '',
                content: plainContent,
                tags: post.tags || [],
                images: post.localImages || [], // 로컬 이미지 파일 경로
                headless: true,
            });

            if (puppeteerResult.success) {
                return {
                    success: true,
                    platform: 'naver',
                    method: 'puppeteer',
                    message: `✅ 네이버 블로그에 자동 발행되었습니다! (Puppeteer)`,
                    postUrl: puppeteerResult.postUrl,
                    blogId: activeBlogId,
                    response: puppeteerResult,
                };
            }

            console.log(`[Naver] Puppeteer 실패: ${puppeteerResult.error}. HTTP API 폴백...`);
        } catch (puppeteerError) {
            console.log(`[Naver] Puppeteer 모듈 로드 실패: ${puppeteerError.message}. HTTP API 폴백...`);
        }

        // ===== 2차: HTTP API (RabbitWrite.naver) =====
        try {
            // 이미지 업로드 및 URL 치환
            let processedContent = post.content || '';
            let uploadedImages = 0;
            if (processedContent.includes('<img')) {
                const imageResult = await replaceImagesWithNaverUrls(processedContent, activeCookies, activeBlogId);
                processedContent = imageResult.content;
                uploadedImages = imageResult.uploadedCount;
            }

            const editorContent = generateNaverSmartEditorHTML({
                ...post,
                content: processedContent,
            });

            const postData = new URLSearchParams();
            postData.append('blogId', activeBlogId || '');
            postData.append('title', post.title || '');
            postData.append('contentHtml', editorContent);
            postData.append('tags', (post.tags || []).join(','));
            postData.append('categoryNo', post.categoryNo || '0');
            postData.append('openType', '3');
            postData.append('saveType', '0');

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

            if (res.ok) {
                const responseText = await res.text();
                console.log(`[Naver] HTTP API 응답 (${res.status}):`, responseText.substring(0, 500));

                let responseData;
                try { responseData = JSON.parse(responseText); }
                catch { responseData = { raw: responseText.substring(0, 500) }; }

                console.log('[Naver] HTTP API 파싱 결과:', JSON.stringify(responseData).substring(0, 300));

                const postUrl = responseData.postUrl || responseData.url ||
                    (responseData.logNo ? `${NAVER_BLOG_BASE}/${activeBlogId}/${responseData.logNo}` : null);

                // 실제로 글이 생성되었는지 확인
                if (postUrl || responseData.logNo || responseData.postNo) {
                    return {
                        success: true,
                        platform: 'naver',
                        method: 'http-api',
                        message: `✅ 네이버 블로그에 자동 발행되었습니다! (HTTP API)`,
                        postUrl,
                        blogId: activeBlogId,
                        uploadedImages,
                        response: responseData,
                    };
                }

                // 200이지만 실제 포스팅이 안 된 경우
                console.log('[Naver] HTTP API 200이지만 postUrl/logNo 없음. 폴백...');
            }

            console.log(`[Naver] HTTP API 실패 (${res.status}). HTML 폴백...`);
        } catch (httpError) {
            console.log(`[Naver] HTTP API 에러: ${httpError.message}. HTML 폴백...`);
        }

        // ===== 3차: HTML 복사 폴백 =====
        return {
            success: false,
            error: '자동 발행에 실패했습니다. 아래 HTML을 블로그 에디터에 붙여넣기 해주세요.',
            fallbackToHTML: true,
            blogId: activeBlogId,
        };
    } catch (error) {
        return {
            success: false,
            error: `자동 발행 실패: ${error.message}`,
            fallbackToHTML: true,
        };
    }
}
