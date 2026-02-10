import { validateNaverCookies } from '../../../../lib/platforms/naver';
import { NextResponse } from 'next/server';

// 네이버 쿠키 유효성 테스트
export async function POST(request) {
    try {
        const { cookies } = await request.json();

        if (!cookies) {
            return NextResponse.json({
                success: false,
                error: '쿠키 값을 입력해주세요.',
            }, { status: 400 });
        }

        const result = await validateNaverCookies(cookies);

        return NextResponse.json({
            success: result.valid,
            blogId: result.blogId || null,
            message: result.valid ? result.message : result.error,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: `테스트 실패: ${error.message}`,
        }, { status: 500 });
    }
}
