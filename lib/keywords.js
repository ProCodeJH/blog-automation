/**
 * BlogFlow - 키워드 리서치 도구
 * Gemini AI 기반 관련 키워드 추천 및 분석
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function analyzeKeywords(topic) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `당신은 한국 블로그 SEO 전문가입니다. 다음 주제에 대해 키워드 분석을 해주세요.

주제: "${topic}"

다음 JSON 형식으로만 응답하세요:
{
  "mainKeyword": "핵심 키워드",
  "relatedKeywords": [
    { "keyword": "관련 키워드", "searchVolume": "높음|보통|낮음", "competition": "높음|보통|낮음", "recommendation": "추천도 1~10" }
  ],
  "longTailKeywords": ["롱테일 키워드1", "롱테일 키워드2", ...],
  "trendingTopics": ["트렌딩 관련 주제1", "트렌딩 주제2", ...],
  "suggestedTitle": ["제목 후보1", "제목 후보2", "제목 후보3"],
  "contentStrategy": "이 키워드로 상위 노출되기 위한 전략 (2~3줄)"
}

관련 키워드 최소 10개, 롱테일 키워드 최소 5개, 제목 후보 3개를 제시해주세요.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
    });

    const text = result.response.text();
    try {
        return { success: true, data: JSON.parse(text) };
    } catch (e) {
        return { success: false, error: 'Failed to parse keyword analysis', raw: text };
    }
}
