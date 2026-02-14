import { translateContent, getSupportedLanguages } from '../../../lib/translator';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(getSupportedLanguages());
}

export async function POST(request) {
    try {
        const { title, content, targetLang } = await request.json();
        if (!title || !content || !targetLang) {
            return NextResponse.json({ success: false, error: '제목, 내용, 대상 언어가 필요합니다.' }, { status: 400 });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        const result = await translateContent({ title, content, targetLang, apiKey });
        return NextResponse.json({ success: true, ...result });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
