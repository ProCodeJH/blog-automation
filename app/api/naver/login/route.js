/**
 * 네이버 로그인 API — Chrome 프로필 기반
 * POST: 브라우저를 열어 사용자가 직접 로그인 (최초 1회)
 */

export async function POST() {
    try {
        const { naverLogin } = await import('../../../lib/platforms/naver-puppeteer.js');
        const result = await naverLogin();

        if (result.success) {
            return Response.json({
                success: true,
                message: `✅ 네이버 로그인 완료! blogId: ${result.blogId}`,
                blogId: result.blogId,
            });
        }

        return Response.json({
            success: false,
            error: result.error || '로그인 실패',
        }, { status: 400 });
    } catch (error) {
        return Response.json({
            success: false,
            error: `로그인 에러: ${error.message}`,
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { getSessionStatus } = await import('../../../lib/platforms/naver-puppeteer.js');
        const status = getSessionStatus();
        return Response.json(status);
    } catch (error) {
        return Response.json({
            error: error.message,
        }, { status: 500 });
    }
}

