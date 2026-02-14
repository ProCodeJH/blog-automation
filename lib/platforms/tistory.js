/**
 * 티스토리 발행 통합 래퍼
 * — Open API 종료 대응: Puppeteer 기반 자동 발행
 * — 쿠키 인증 → Puppeteer 발행 → clipboard 폴백
 */
import path from 'path';
import fs from 'fs';

/**
 * 티스토리에 글 발행 (Puppeteer)
 * 네이버와 동일한 패턴: 쿠키 주입 → 에디터 제어 → 발행
 */
export async function publishToTistory(post, cookies = '', blogId = '') {
    const debugLog = path.resolve(process.cwd(), 'tistory_publish_debug.txt');
    const _dl = (msg) => {
        const line = `[${new Date().toISOString()}] ${typeof msg === 'string' ? msg : JSON.stringify(msg).substring(0, 500)}`;
        fs.appendFileSync(debugLog, line + '\n', 'utf8');
    };
    fs.writeFileSync(debugLog, '', 'utf8');

    _dl(`START: cookies=${cookies.length}, blogId=${blogId}`);

    if (!blogId) {
        // sesson 파일에서 blogId 로드
        try {
            const sessionPath = path.resolve(process.cwd(), '.tistory-session.json');
            if (fs.existsSync(sessionPath)) {
                const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                blogId = session.blogId;
                _dl(`session blogId: ${blogId}`);
            }
        } catch { /* ignore */ }
    }

    if (!blogId) {
        return {
            success: false,
            platform: 'tistory',
            method: 'error',
            error: '티스토리 blogId가 설정되지 않았습니다.',
        };
    }

    // HTML → 평문 변환
    const plainContent = (post.content || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

    try {
        // Puppeteer 모듈 동적 로드
        _dl('dynamic import tistory-puppeteer...');
        const tistoryMod = await import('./tistory-puppeteer.js');
        const { publishToTistoryPuppeteer, getSessionStatus } = tistoryMod;
        _dl(`publishToTistoryPuppeteer: ${typeof publishToTistoryPuppeteer}`);

        const session = getSessionStatus();
        _dl(`session: profileExists=${session.profileExists}, blogId=${session.blogId}`);

        const result = await publishToTistoryPuppeteer({
            cookies,
            blogId,
            title: post.title || '',
            content: plainContent,
            tags: post.tags || [],
            images: post.localImages || [],
            headless: false,
            useProfile: true,  // Chrome 프로필 기반 세션 유지
        });

        _dl(`Puppeteer result: ${JSON.stringify(result).substring(0, 300)}`);

        if (result.success) {
            return {
                success: true,
                platform: 'tistory',
                method: 'puppeteer',
                message: result.message || '✅ 티스토리 블로그에 자동 발행되었습니다!',
                postUrl: result.postUrl || 'N/A',
            };
        } else {
            _dl(`Puppeteer failed: ${result.error}`);
            throw new Error(result.error || '발행 실패');
        }
    } catch (err) {
        _dl(`EXCEPTION: ${err.message}`);

        // clipboard 폴백
        return {
            success: true,
            platform: 'tistory',
            method: 'clipboard',
            message: `⚠️ 자동 발행 실패: ${err.message}. HTML을 복사하여 붙여넣기하세요.`,
            html: post.content || '',
            plainText: plainContent,
            tags: post.tags || [],
        };
    }
}

/**
 * 티스토리 HTML 생성 (clipboard 폴백용)
 */
export function generateTistoryHTML(post) {
    return {
        html: post.content || '',
        plainText: (post.content || '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim(),
        tags: post.tags || [],
    };
}
