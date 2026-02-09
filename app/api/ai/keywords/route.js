import { analyzeKeywords } from '../../../../lib/keywords';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { topic } = body;

        if (!topic || topic.trim().length === 0) {
            return NextResponse.json({ success: false, error: '주제를 입력해주세요.' }, { status: 400 });
        }

        const result = await analyzeKeywords(topic);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Keyword Analysis Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
