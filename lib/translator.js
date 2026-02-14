/**
 * BlogFlow - 멀티 언어 번역 (F10)
 * — Gemini API 기반 한→영/일/중 번역
 */

const LANG_MAP = {
    en: { name: 'English', flag: '🇺🇸' },
    ja: { name: 'Japanese', flag: '🇯🇵' },
    zh: { name: 'Chinese (Simplified)', flag: '🇨🇳' },
    ko: { name: 'Korean', flag: '🇰🇷' },
    es: { name: 'Spanish', flag: '🇪🇸' },
    fr: { name: 'French', flag: '🇫🇷' },
};

export function getSupportedLanguages() {
    return LANG_MAP;
}

export async function translateContent({ title, content, targetLang, apiKey }) {
    if (!apiKey) throw new Error('Gemini API 키가 필요합니다.');
    if (!LANG_MAP[targetLang]) throw new Error(`지원하지 않는 언어: ${targetLang}`);

    const langName = LANG_MAP[targetLang].name;

    const prompt = `You are a professional blog content translator. Translate the following Korean blog post into ${langName}. 

Rules:
- Maintain the original formatting (markdown, headings, lists, code blocks)
- Keep technical terms in English
- Preserve URLs and links
- Make it natural and fluent, not literal translation
- Keep the tone professional but friendly

---
Title: ${title}

Content:
${content}
---

Respond in this exact JSON format:
{"translatedTitle": "...", "translatedContent": "...", "summary": "brief 1-line summary in ${langName}"}`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
            }),
        }
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('번역 결과 파싱 실패');

    const result = JSON.parse(jsonMatch[0]);
    return {
        title: result.translatedTitle,
        content: result.translatedContent,
        summary: result.summary,
        targetLang,
        langName,
        flag: LANG_MAP[targetLang].flag,
    };
}
