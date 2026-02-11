import { publishToWordPress } from '../../../lib/platforms/wordpress';
// tistory: 동적 import (case 블록 내에서 처리)
import { generateNaverHTML, generateNaverSmartEditorHTML, publishToNaver } from '../../../lib/platforms/naver';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const body = await request.json();
        const { platform, credentials, post } = body;

        if (!platform || !post) {
            return NextResponse.json({ success: false, error: '플랫폼과 게시물 정보가 필요합니다.' }, { status: 400 });
        }

        let result;

        switch (platform) {
            case 'wordpress':
                if (!credentials?.siteUrl || !credentials?.username || !credentials?.appPassword) {
                    return NextResponse.json({ success: false, error: 'WordPress 연동 정보를 설정에서 입력해주세요.' }, { status: 400 });
                }
                result = await publishToWordPress({
                    siteUrl: credentials.siteUrl,
                    username: credentials.username,
                    appPassword: credentials.appPassword,
                    post,
                });
                break;

            case 'tistory': {
                let tsBlogId = credentials?.tsBlogName || process.env.TISTORY_BLOG_ID;
                if (!tsBlogId) {
                    try {
                        const sessionPath = path.resolve(process.cwd(), '.tistory-session.json');
                        if (fs.existsSync(sessionPath)) {
                            const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                            tsBlogId = session.blogId;
                        }
                    } catch { /* ignore */ }
                }

                if (!tsBlogId) {
                    return NextResponse.json({
                        success: false,
                        error: '티스토리 blogId가 없습니다. 설정에서 티스토리 블로그명을 입력해주세요.',
                    }, { status: 400 });
                }

                const tsCookies = credentials?.tistoryCookies || process.env.TISTORY_COOKIES || '';

                try {
                    const { publishToTistory: publishTS } = await import('../../../lib/platforms/tistory.js');
                    result = await publishTS(
                        { ...post, localImages: (post.imagePaths || []) },
                        tsCookies,
                        tsBlogId,
                    );
                } catch (tsErr) {
                    result = { success: false, error: tsErr.message };
                }

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
                // 세션에서 blogId 로드 (env 폴백)
                let blogId = credentials?.naverBlogId || process.env.NAVER_BLOG_ID;
                if (!blogId) {
                    try {
                        const sessionPath = path.resolve(process.cwd(), '.naver-session.json');
                        if (fs.existsSync(sessionPath)) {
                            const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                            blogId = session.blogId;
                        }
                    } catch { /* ignore */ }
                }

                if (!blogId) {
                    return NextResponse.json({
                        success: false,
                        error: '네이버 blogId가 없습니다. 설정에서 네이버 로그인을 해주세요.',
                    }, { status: 400 });
                }

                // 디버그 로깅
                const debugLog = path.resolve(process.cwd(), 'naver_route_debug.txt');
                const dlog = (msg) => {
                    const line = `[${new Date().toISOString()}] ${typeof msg === 'string' ? msg : JSON.stringify(msg).substring(0, 500)}`;
                    fs.appendFileSync(debugLog, line + '\n', 'utf8');
                };
                fs.writeFileSync(debugLog, '', 'utf8');

                // publishToNaver: 1차 Chrome프로필 → 2차 쿠키+Puppeteer → 3차 HTTP API → 폴백
                const naverCookies = credentials?.naverCookies || process.env.NAVER_COOKIES || '';
                dlog(`blogId: ${blogId}`);
                dlog(`cookies length: ${naverCookies.length}`);
                dlog(`cookies start: ${naverCookies.substring(0, 30)}`);
                dlog(`post.title: ${post.title?.substring(0, 50)}`);
                dlog(`post.content length: ${post.content?.length}`);

                try {
                    result = await publishToNaver(
                        { ...post, localImages: (post.imagePaths || []) },
                        naverCookies,
                        blogId,
                    );
                    dlog(`publishToNaver result: ${JSON.stringify(result).substring(0, 500)}`);
                } catch (naverErr) {
                    dlog(`publishToNaver EXCEPTION: ${naverErr.message}`);
                    dlog(naverErr.stack);
                    result = { success: false, error: naverErr.message };
                }

                // 자동 발행 실패 시 clipboard 폴백
                if (!result.success) {
                    dlog(`FALLBACK to clipboard: ${result.error}`);
                    console.log('[Naver] 자동 발행 실패, clipboard 폴백:', result.error);
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
                return NextResponse.json({ success: false, error: '벨로그는 마크다운 복사 후 붙여넣기 해주세요.' }, { status: 501 });

            default:
                return NextResponse.json({ success: false, error: '지원하지 않는 플랫폼입니다.' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Publish Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
