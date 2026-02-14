import { generateThumbnail, generateTextThumbnail } from '../../../lib/thumbnail';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { title, tags, type = 'stock' } = await request.json();
        if (!title) {
            return NextResponse.json({ success: false, error: '제목이 필요합니다.' }, { status: 400 });
        }

        if (type === 'text') {
            const result = generateTextThumbnail({ title, subtitle: (tags || []).join(' · ') });
            return NextResponse.json({ success: true, type: 'text', ...result });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const result = await generateThumbnail({ title, tags, apiKey });
        return NextResponse.json({ success: true, type: 'stock', ...result });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
