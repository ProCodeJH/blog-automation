import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
    try {
        const { title, content, platforms } = await request.json();
        if (!content) return NextResponse.json({ success: false, error: '콘텐츠가 필요합니다' }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 미설정' }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const plainText = content.replace(/<[^>]+>/g, '').slice(0, 3000);

        const prompt = `다음 블로그 글을 SNS용으로 리퍼포징해주세요.

제목: ${title || ''}
본문(일부): ${plainText}

아래 JSON 형식으로 응답 (반드시 JSON만):
{
  "instagram": "인스타그램용 (해시태그 포함, 300자 이내, 이모지 활용)",
  "twitter": "트위터/X용 (280자 이내, 핵심 요약)",
  "linkedin": "링크드인용 (전문적 톤, 500자 이내)",
  "thread": "쓰레드/블로그 요약 (3줄 핵심 요약)",
  "youtube_desc": "유튜브 설명란용 (타임스탬프 구조)"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return NextResponse.json({ success: false, error: '파싱 실패' }, { status: 500 });

        const repurposed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, repurposed });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
