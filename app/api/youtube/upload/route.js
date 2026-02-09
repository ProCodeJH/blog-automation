import { createOAuth2Client, exchangeCodeForTokens, uploadVideo } from '../../../../lib/platforms/youtube';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const formData = await request.formData();

        const videoFile = formData.get('video');
        const title = formData.get('title') || '제목 없음';
        const description = formData.get('description') || '';
        const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
        const privacyStatus = formData.get('privacyStatus') || 'private';
        const categoryId = formData.get('categoryId') || '22';
        const clientId = formData.get('clientId');
        const clientSecret = formData.get('clientSecret');
        const accessToken = formData.get('accessToken');
        const refreshToken = formData.get('refreshToken');

        if (!videoFile) {
            return NextResponse.json({ success: false, error: '동영상 파일이 필요합니다.' }, { status: 400 });
        }

        if (!clientId || !clientSecret || !accessToken) {
            return NextResponse.json({ success: false, error: 'YouTube 인증 정보가 필요합니다. 설정에서 연동해주세요.' }, { status: 400 });
        }

        // Save video temporarily
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        const tempPath = path.join(uploadsDir, `yt_${uuidv4()}.mp4`);
        await writeFile(tempPath, videoBuffer);

        // Create OAuth2 client with tokens
        const oauth2Client = createOAuth2Client({ clientId, clientSecret });
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        // Upload
        const result = await uploadVideo({
            auth: oauth2Client,
            videoBuffer,
            title,
            description,
            tags,
            privacyStatus,
            categoryId,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('YouTube Upload Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
