import { publishToWordPress } from '../../../lib/platforms/wordpress';
import { publishToTistory } from '../../../lib/platforms/tistory';
import { generateNaverHTML, generateNaverSmartEditorHTML, publishToNaver } from '../../../lib/platforms/naver';
import { NextResponse } from 'next/server';

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
                // 쿠키가 있으면 자동 발행 시도
                if (credentials?.naverCookies) {
                    result = await publishToNaver(post, credentials.naverCookies, credentials.naverBlogId);

                    // 자동 발행 성공
                    if (result.success) break;

                    // 실패했지만 fallback 가능하면 HTML 모드로
                    if (!result.fallbackToHTML) break;
                }

                // HTML 복사 모드 (쿠키 없거나 자동 발행 실패)
                const naverHTML = generateNaverHTML(post);
                const smartEditorHTML = generateNaverSmartEditorHTML(post);
                result = {
                    success: true,
                    platform: 'naver',
                    method: 'clipboard',
                    message: credentials?.naverCookies
                        ? '⚠️ 자동 발행 실패. HTML을 클립보드에 복사하여 붙여넣기하세요.'
                        : '네이버 블로그용 HTML이 생성되었습니다. 클립보드에 복사하여 붙여넣기하세요.',
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
