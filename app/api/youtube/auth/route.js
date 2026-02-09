import { createOAuth2Client, getAuthUrl } from '../../../../lib/platforms/youtube';
import { NextResponse } from 'next/server';

// YouTube OAuth 인증 URL 생성
export async function POST(request) {
    try {
        const { clientId, clientSecret } = await request.json();

        if (!clientId || !clientSecret) {
            return NextResponse.json({ success: false, error: 'YouTube API Client ID와 Secret이 필요합니다.' }, { status: 400 });
        }

        const oauth2Client = createOAuth2Client({ clientId, clientSecret });
        const authUrl = getAuthUrl(oauth2Client);

        return NextResponse.json({ success: true, authUrl });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
