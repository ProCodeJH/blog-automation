import { publishToWordPress } from '../../../lib/platforms/wordpress';
import { publishToVelog } from '../../../lib/platforms/velog-puppeteer';
import { generateNaverHTML, generateNaverSmartEditorHTML, publishToNaver } from '../../../lib/platforms/naver';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { recordPublish, isDuplicate } from '../../../lib/publish-history';
import { sendNotification } from '../../../lib/notifications';
import { optimizeForPlatform } from '../../../lib/content-optimizer';

// ★ API 타임아웃 확장 (Puppeteer 작업은 30초+ 소요)
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// ─── 자동 재시도 래퍼 (F6) ───
async function retryPublish(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (result.success) {
                if (attempt > 1) result.retried = attempt;
                return result;
            }
            lastError = result.error || 'Unknown error';
            // 네트워크/타임아웃 에러만 재시도
            if (!isRetryable(lastError)) return result;
        } catch (e) {
            lastError = e.message;
            if (!isRetryable(lastError)) throw e;
        }
        // 지수 백오프: 2초, 4초, 8초
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
            console.log(`[Retry] ${attempt}/${maxRetries} 재시도...`);
        }
    }
    return { success: false, error: `${maxRetries}회 시도 후 실패: ${lastError}`, retried: maxRetries };
}

function isRetryable(error) {
    const retryablePatterns = ['timeout', 'ECONNRESET', 'ECONNREFUSED', 'network', 'fetch failed', 'navigation'];
    return retryablePatterns.some(p => error?.toLowerCase().includes(p.toLowerCase()));
}

export async function POST(request) {
    const startTime = Date.now();
    try {
        const body = await request.json();
        const { platform, credentials, post, skipDuplicateCheck = false } = body;

        if (!platform || !post) {
            return NextResponse.json({ success: false, error: '플랫폼과 게시물 정보가 필요합니다.' }, { status: 400 });
        }

        // ─── F7: 중복 발행 방지 ───
        if (!skipDuplicateCheck && isDuplicate(post.title, platform)) {
            return NextResponse.json({
                success: false,
                error: `"${post.title}"은(는) 이미 ${platform}에 최근 24시간 내 발행되었습니다.`,
                isDuplicate: true,
            }, { status: 409 });
        }

        // ─── F4: 플랫폼별 콘텐츠 최적화 ───
        const optimizedPost = {
            ...post,
            content: optimizeForPlatform(post.content, platform, { title: post.title, tags: post.tags }),
        };

        let result;

        switch (platform) {
            case 'wordpress':
                result = await retryPublish(() => publishToWordPress({
                    siteUrl: credentials?.siteUrl,
                    username: credentials?.username,
                    appPassword: credentials?.appPassword,
                    post: optimizedPost,
                }));
                break;

            case 'tistory': {
                let tsBlogId = credentials?.tsBlogName || process.env.TISTORY_BLOG_ID;
                let tsCookies = credentials?.tistoryCookies || process.env.TISTORY_COOKIES || '';

                // 세션 파일에서 blogId + 쿠키 로드 (폴백)
                try {
                    const sessionPath = path.resolve(process.cwd(), '.tistory-session.json');
                    if (fs.existsSync(sessionPath)) {
                        const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                        if (!tsBlogId) tsBlogId = session.blogId;
                    }
                    // CDP 쿠키 JSON에서 쿠키 로드 (가장 정확)
                    if (!tsCookies) {
                        const cookieJsonPath = path.resolve(process.cwd(), '.tistory-cookies.json');
                        if (fs.existsSync(cookieJsonPath)) {
                            const cdpCookies = JSON.parse(fs.readFileSync(cookieJsonPath, 'utf-8'));
                            tsCookies = JSON.stringify(cdpCookies); // JSON 배열로 전달
                        }
                    }
                } catch { /* ignore */ }

                if (!tsBlogId) {
                    return NextResponse.json({
                        success: false,
                        error: '티스토리 blogId가 없습니다. 설정에서 티스토리 블로그명을 입력해주세요.',
                    }, { status: 400 });
                }

                result = await retryPublish(async () => {
                    try {
                        const { publishToTistory: publishTS } = await import('../../../lib/platforms/tistory.js');
                        return await publishTS(
                            { ...optimizedPost, localImages: (post.imagePaths || []) },
                            tsCookies,
                            tsBlogId,
                        );
                    } catch (tsErr) {
                        return { success: false, error: tsErr.message };
                    }
                });

                // 자동 발행 실패 시 clipboard 폴백
                if (!result.success) {
                    const { generateTistoryHTML } = await import('../../../lib/platforms/tistory.js');
                    const tsHTML = generateTistoryHTML(post);
                    result = {
                        success: true,
                        platform: 'tistory',
                        method: 'clipboard',
                        message: `⚠️ 자동 발행 실패 (${result.error || '알 수 없음'}). HTML을 클립보드에 복사하여 붙여넣기하세요.`,
                        html: tsHTML.html,
                        plainText: tsHTML.plainText,
                        tags: tsHTML.tags,
                    };
                }
                break;
            }

            case 'naver': {
                let blogId = credentials?.naverBlogId || process.env.NAVER_BLOG_ID;
                let naverCookies = credentials?.naverCookies || process.env.NAVER_COOKIES || '';

                // 세션 파일에서 blogId + 쿠키 로드 (폴백)
                try {
                    const sessionPath = path.resolve(process.cwd(), '.naver-session.json');
                    if (fs.existsSync(sessionPath)) {
                        const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                        if (!blogId) blogId = session.blogId;
                        if (!naverCookies && session.cookies) naverCookies = session.cookies;
                    }
                    // CDP 쿠키 JSON에서 쿠키 로드 (가장 정확)
                    if (!naverCookies) {
                        const cookieJsonPath = path.resolve(process.cwd(), '.naver-cookies.json');
                        if (fs.existsSync(cookieJsonPath)) {
                            const cdpCookies = JSON.parse(fs.readFileSync(cookieJsonPath, 'utf-8'));
                            naverCookies = cdpCookies.map(c => `${c.name}=${c.value}`).join('; ');
                        }
                    }
                } catch { /* ignore */ }

                if (!blogId) {
                    return NextResponse.json({
                        success: false,
                        error: '네이버 blogId가 없습니다. 설정에서 네이버 로그인을 해주세요.',
                    }, { status: 400 });
                }

                result = await retryPublish(async () => {
                    try {
                        return await publishToNaver(
                            { ...optimizedPost, localImages: (post.imagePaths || []) },
                            naverCookies,
                            blogId,
                        );
                    } catch (naverErr) {
                        return { success: false, error: naverErr.message };
                    }
                });

                // 자동 발행 실패 시 clipboard 폴백
                if (!result.success) {
                    const naverHTML = generateNaverHTML(post);
                    result = {
                        success: true,
                        platform: 'naver',
                        method: 'clipboard',
                        message: `⚠️ 자동 발행 실패 (${result.error || '알 수 없음'}). HTML을 클립보드에 복사하여 붙여넣기하세요.`,
                        html: naverHTML.html,
                        plainText: naverHTML.plainText,
                        tags: naverHTML.tags,
                    };
                }
                break;
            }

            case 'velog':
                result = await retryPublish(() => publishToVelog({ post: optimizedPost }));
                break;

            default:
                return NextResponse.json({ success: false, error: '지원하지 않는 플랫폼입니다.' }, { status: 400 });
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

        // ─── F3: 발행 이력 기록 ───
        recordPublish({
            platform,
            title: post.title,
            postUrl: result.postUrl || '',
            method: result.method || 'unknown',
            elapsed,
            status: result.success ? 'success' : 'failed',
            error: result.error || null,
        });

        // ─── F8: 알림 전송 (비동기, 실패해도 결과에 영향 없음) ───
        sendNotification({
            type: result.success ? 'success' : 'fail',
            platform,
            title: post.title,
            postUrl: result.postUrl,
            error: result.error,
            elapsed,
        }).catch(() => { }); // fire-and-forget

        return NextResponse.json(result);
    } catch (error) {
        console.error('Publish Error:', error);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

        // 에러도 이력 기록
        recordPublish({
            platform: 'unknown',
            title: '',
            postUrl: '',
            method: 'error',
            elapsed,
            status: 'failed',
            error: error.message,
        });

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
