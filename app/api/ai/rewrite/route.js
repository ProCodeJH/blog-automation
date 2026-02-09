import { rewriteContent } from '../../../lib/gemini';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { rawText, imageInfos = [], tone = 'friendly', category = '' } = body;

        if (!rawText || rawText.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: '글 내용을 입력해주세요.' },
                { status: 400 }
            );
        }

        const result = await rewriteContent({ rawText, imageInfos, tone, category });

        return NextResponse.json(result);
    } catch (error) {
        console.error('AI Rewrite Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'AI 편집 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
