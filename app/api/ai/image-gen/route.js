import { NextResponse } from 'next/server';

// ⑤ AI 이미지 생성 API
// Gemini로 썸네일 프롬프트 생성 → CSS/SVG 기반 썸네일 생성
export async function POST(request) {
    try {
        const { title, category, tags = [], style = 'modern' } = await request.json();

        if (!title) {
            return NextResponse.json({ success: false, error: '제목을 입력해주세요.' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // 스타일별 색상 팔레트
        const palettes = {
            modern: { bg: '#1a1a2e', accent: '#7c3aed', text: '#f0f0ff', gradient: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)' },
            warm: { bg: '#2d1b0e', accent: '#f59e0b', text: '#fef3c7', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
            nature: { bg: '#0f2419', accent: '#22c55e', text: '#dcfce7', gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)' },
            ocean: { bg: '#0c1426', accent: '#3b82f6', text: '#dbeafe', gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' },
            minimal: { bg: '#ffffff', accent: '#111111', text: '#333333', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        };

        const palette = palettes[style] || palettes.modern;

        // 카테고리별 아이콘
        const icons = {
            '기술': '💻', 'IT': '💻', 'tech': '💻',
            '음식': '🍽️', '맛집': '🍽️', 'food': '🍽️',
            '여행': '✈️', 'travel': '✈️',
            '뷰티': '💄', 'beauty': '💄',
            '육아': '👶', 'parenting': '👶',
            '일상': '📝', 'daily': '📝',
            '요리': '🍳', 'recipe': '🍳',
        };
        const icon = icons[category?.toLowerCase()] || icons[category] || '📝';

        // SVG 썸네일 생성
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${palette.accent}22;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${palette.accent};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${palette.accent}88;stop-opacity:1" />
        </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)" rx="0"/>

    <!-- Decorative circles -->
    <circle cx="1050" cy="100" r="180" fill="${palette.accent}" opacity="0.08"/>
    <circle cx="150" cy="530" r="120" fill="${palette.accent}" opacity="0.06"/>
    <circle cx="900" cy="500" r="80" fill="${palette.accent}" opacity="0.05"/>

    <!-- Accent line -->
    <rect x="80" y="200" width="60" height="4" fill="${palette.accent}" rx="2"/>

    <!-- Icon -->
    <text x="80" y="180" font-size="56" fill="${palette.accent}">${icon}</text>

    <!-- Title -->
    <text x="80" y="280" font-family="'Noto Sans KR', sans-serif" font-size="42" font-weight="700" fill="${palette.text}">
        ${title.length > 25 ? title.slice(0, 25) : title}
    </text>
    ${title.length > 25 ? `<text x="80" y="335" font-family="'Noto Sans KR', sans-serif" font-size="42" font-weight="700" fill="${palette.text}">${title.slice(25, 50)}${title.length > 50 ? '...' : ''}</text>` : ''}

    <!-- Tags -->
    <text x="80" y="${title.length > 25 ? 400 : 340}" font-family="'Noto Sans KR', sans-serif" font-size="18" fill="${palette.accent}" opacity="0.8">
        ${tags.slice(0, 4).map(t => '#' + t).join('  ')}
    </text>

    <!-- Category badge -->
    ${category ? `
    <rect x="80" y="480" width="${category.length * 16 + 32}" height="36" fill="${palette.accent}" rx="18" opacity="0.2"/>
    <text x="96" y="504" font-family="'Noto Sans KR', sans-serif" font-size="14" fill="${palette.accent}" font-weight="600">${category}</text>
    ` : ''}

    <!-- Blog brand -->
    <text x="80" y="570" font-family="'Inter', sans-serif" font-size="14" fill="${palette.text}" opacity="0.4" font-weight="600">BlogFlow</text>

    <!-- Bottom accent bar -->
    <rect x="0" y="620" width="1200" height="10" fill="url(#accent)"/>
</svg>`;

        // AI 프롬프트 생성 (Gemini가 있으면 설명 텍스트도 생성)
        let aiDescription = '';
        if (apiKey) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `이 블로그 글의 썸네일 이미지에 대한 간단한 설명(alt text)을 한 줄로 작성해주세요.\n제목: ${title}\n카테고리: ${category || '일반'}\n태그: ${tags.join(', ')}` }] }],
                        generationConfig: { maxOutputTokens: 100 },
                    }),
                });
                const data = await res.json();
                aiDescription = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            } catch { }
        }

        return NextResponse.json({
            success: true,
            thumbnail: {
                svg,
                width: 1200,
                height: 630,
                style,
                palette,
                altText: aiDescription || `${title} - ${category || 'BlogFlow'} 썸네일`,
            },
            availableStyles: Object.keys(palettes),
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
