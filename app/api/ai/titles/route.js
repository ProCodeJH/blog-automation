import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
    try {
        const body = await request.json();
        const { topic, category = '', tone = 'friendly', count = 5 } = body;

        if (!topic) return NextResponse.json({ success: false, error: '주제를 입력해주세요.' }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ success: false, error: 'GEMINI_API_KEY 필요' }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `당신은 한국 블로그 SEO 전문가입니다.

주제: "${topic}"
${category ? `카테고리: ${category}` : ''}
톤: ${tone}

이 주제로 클릭률이 높은 블로그 제목 ${count}개를 생성해주세요.

JSON 형식으로 응답:
{
    "titles": [
        {
            "title": "제안 제목",
            "style": "궁금증 유발 | 숫자 기반 | 비교형 | 경험 공유 | 꿀팁형",
            "estimatedCTR": 85,
            "reason": "이 제목이 효과적인 이유 1줄"
        }
    ]
}

한국 블로그 독자의 클릭을 유도하는 패턴을 사용하세요:
- ✅ 숫자 활용 ("Top 7", "3가지")
- ✅ 감성 단어 ("솔직후기", "찐맛집", "꿀팁")
- ✅ 의문형 ("~할 수 있을까?")
- ✅ 긴급성 ("2025 최신", "지금 당장")`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        });

        const parsed = JSON.parse(result.response.text());
        return NextResponse.json({ success: true, ...parsed });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
