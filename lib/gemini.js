import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildEditPrompt } from './prompts';

let genAI = null;

function getClient() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 API 키를 추가하세요.');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * 러프 텍스트를 파워블로거 스타일로 리라이팅
 */
export async function rewriteContent({ rawText, imageInfos, tone, category }) {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const { systemPrompt, userPrompt } = buildEditPrompt({
        rawText,
        imageInfos,
        tone,
        category,
    });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
        },
    });

    const response = result.response;
    const text = response.text();

    try {
        const parsed = JSON.parse(text);
        return {
            success: true,
            data: {
                title: parsed.title || '',
                metaDescription: parsed.metaDescription || '',
                content: parsed.content || '',
                tags: parsed.tags || [],
                seoScore: parsed.seoScore || 0,
                seoTips: parsed.seoTips || [],
            },
        };
    } catch (e) {
        return {
            success: false,
            error: 'AI 응답을 파싱할 수 없습니다.',
            raw: text,
        };
    }
}

/**
 * 이미지 분석 및 캡션 생성 (Gemini Vision)
 */
export async function generateImageCaption(imageBase64, mimeType) {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: '이 이미지를 블로그 글에 사용할 캡션을 한국어로 작성해주세요. 짧고 감성적으로 15자 이내.' },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
        },
    });

    return result.response.text().trim();
}
