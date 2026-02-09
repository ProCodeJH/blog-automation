// YouTube Data API v3 - 동영상 업로드 모듈
import { google } from 'googleapis';
import { Readable } from 'stream';

const YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

/**
 * OAuth2 클라이언트 생성
 */
export function createOAuth2Client({ clientId, clientSecret, redirectUri = 'http://localhost:3000/api/youtube/callback' }) {
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * 인증 URL 생성
 */
export function getAuthUrl(oauth2Client) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: YOUTUBE_SCOPES,
    });
}

/**
 * 인증 코드로 토큰 교환
 */
export async function exchangeCodeForTokens(oauth2Client, code) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
}

/**
 * YouTube에 동영상 업로드
 * @param {Object} params
 * @param {Object} params.auth - OAuth2 클라이언트 (인증 완료된)
 * @param {Buffer} params.videoBuffer - 동영상 파일 버퍼
 * @param {string} params.title - 동영상 제목
 * @param {string} params.description - 동영상 설명
 * @param {string[]} params.tags - 태그 배열
 * @param {string} [params.privacyStatus='private'] - public, unlisted, private
 * @param {string} [params.categoryId='22'] - YouTube 카테고리 ID (22 = People & Blogs)
 */
export async function uploadVideo({
    auth,
    videoBuffer,
    title,
    description = '',
    tags = [],
    privacyStatus = 'private',
    categoryId = '22',
}) {
    const youtube = google.youtube({ version: 'v3', auth });

    const videoStream = new Readable();
    videoStream.push(videoBuffer);
    videoStream.push(null);

    const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
            snippet: {
                title,
                description,
                tags,
                categoryId,
                defaultLanguage: 'ko',
                defaultAudioLanguage: 'ko',
            },
            status: {
                privacyStatus,
                selfDeclaredMadeForKids: false,
            },
        },
        media: {
            body: videoStream,
        },
    });

    return {
        success: true,
        videoId: response.data.id,
        url: `https://www.youtube.com/watch?v=${response.data.id}`,
        title: response.data.snippet?.title,
    };
}

/**
 * 동영상 썸네일 설정
 */
export async function setThumbnail({ auth, videoId, thumbnailBuffer }) {
    const youtube = google.youtube({ version: 'v3', auth });

    const stream = new Readable();
    stream.push(thumbnailBuffer);
    stream.push(null);

    await youtube.thumbnails.set({
        videoId,
        media: { body: stream },
    });

    return { success: true };
}

/**
 * YouTube 카테고리 목록
 */
export const YOUTUBE_CATEGORIES = [
    { id: '1', name: 'Film & Animation' },
    { id: '2', name: 'Autos & Vehicles' },
    { id: '10', name: 'Music' },
    { id: '15', name: 'Pets & Animals' },
    { id: '17', name: 'Sports' },
    { id: '20', name: 'Gaming' },
    { id: '22', name: 'People & Blogs' },
    { id: '23', name: 'Comedy' },
    { id: '24', name: 'Entertainment' },
    { id: '25', name: 'News & Politics' },
    { id: '26', name: 'Howto & Style' },
    { id: '27', name: 'Education' },
    { id: '28', name: 'Science & Technology' },
];
