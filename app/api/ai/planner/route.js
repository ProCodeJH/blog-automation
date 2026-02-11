import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
    try {
        const body = await request.json();
        const { category = '', niche = '', count = 7 } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 필요' }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `당신은 한국 파워블로거 콘텐츠 전략가입니다.
${category ? `카테고리: ${category}` : ''}
${niche ? `세부 분야: ${niche}` : '일반 라이프스타일'}

다음 ${count}일간의 블로그 콘텐츠 캘린더를 JSON으로 생성해주세요.

각 항목은 다음 형식:
{
    "plans": [
        {
            "day": 1,
            "topic": "주제",
            "title": "제안 제목",
            "keywords": ["키워드1", "키워드2"],
            "outline": ["소제목1", "소제목2", "소제목3"],
            "estimatedReadTime": 5,
            "difficulty": "easy|medium|hard",
            "targetAudience": "대상 독자"
        }
    ]
}

최신 트렌드와 검색량을 고려해 전략적으로 구성하세요.`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            },
        });

        const parsed = JSON.parse(result.response.text());
        return NextResponse.json({ success: true, ...parsed });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
