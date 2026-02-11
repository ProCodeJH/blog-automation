import { publishToWordPress } from '../../../lib/platforms/wordpress';
import { publishToTistory } from '../../../lib/platforms/tistory';
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

            case 'tistory':
                if (!credentials?.accessToken || !credentials?.blogName) {
                    return NextResponse.json({ success: false, error: '티스토리 Access Token과 블로그명을 설정에서 입력해주세요.' }, { status: 400 });
                }
                result = await publishToTistory({
                    accessToken: credentials.accessToken,
                    blogName: credentials.blogName,
                    post,
                    visibility: credentials.visibility || '3',
                });
                break;

            case 'naver': {
                // 세션에서 blogId 로드
                let blogId = credentials?.naverBlogId;
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

                // Puppeteer 기반 자동 발행
                try {
                    const { publishToNaverPuppeteer } = await import('../../../lib/platforms/naver-puppeteer.js');
                    // post.imagePaths: 로컬 파일 경로 배열 (업로드된 이미지)
                    const imagePaths = (post.imagePaths || []).map(p =>
                        p.startsWith('/') ? path.join(process.cwd(), 'public', p) : p
                    ).filter(p => fs.existsSync(p));

                    result = await publishToNaverPuppeteer({
                        blogId,
                        title: post.title,
                        content: post.content?.replace(/<[^>]+>/g, '') || '',
                        tags: post.tags || [],
                        images: imagePaths,
                        headless: true,
                        useProfile: true,
                    });

                    if (result.success) {
                        result.platform = 'naver';
                        result.method = 'puppeteer';
                        break;
                    }
                } catch (puppeteerError) {
                    console.error('[Naver Puppeteer]', puppeteerError.message);
                }

                // Puppeteer 실패 시 HTML 복사 모드 폴백
                const naverHTML = generateNaverHTML(post);
                const smartEditorHTML = generateNaverSmartEditorHTML(post);
                result = {
                    success: true,
                    platform: 'naver',
                    method: 'clipboard',
                    message: '⚠️ 자동 발행 실패. HTML을 클립보드에 복사하여 붙여넣기하세요.',
                    html: naverHTML.html,
                    smartEditorHTML: smartEditorHTML,
                    plainText: naverHTML.plainText,
                    tags: naverHTML.tags,
                };
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
