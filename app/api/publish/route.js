import { publishToWordPress } from '../../../lib/platforms/wordpress';
import { publishToTistory } from '../../../lib/platforms/tistory';
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

            case 'naver':
                return NextResponse.json({
                    success: false,
                    error: '네이버 블로그는 글 작성 API를 제공하지 않습니다. 에디터에서 HTML 복사 후 붙여넣기 해주세요.',
                }, { status: 501 });

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
