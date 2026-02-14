/**
 * BlogFlow - AI 썸네일 생성 (F2)
 * — Gemini로 키워드 기반 프롬프트 생성 → 무료 이미지 API
 */

export async function generateThumbnail({ title, tags = [], apiKey }) {
    // 1) Gemini로 이미지 검색 키워드 생성
    let searchQuery = title;
    if (apiKey) {
        try {
            const prompt = `Given a blog post title "${title}" with tags [${tags.join(', ')}], generate a single short English search query (2-4 words) for finding a relevant, professional stock photo for the thumbnail. Respond with ONLY the search query, nothing else.`;
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 50 },
                    }),
                }
            );
            const data = await res.json();
            searchQuery = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || title;
        } catch { /* fallback to title */ }
    }

    // 2) 무료 이미지 API (Unsplash/Picsum)
    const encodedQuery = encodeURIComponent(searchQuery);
    const width = 1200;
    const height = 630; // OG image ratio

    // Unsplash Source (무료, API키 불필요)
    const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${encodedQuery}`;

    // Lorem Picsum (더 안정적인 대안)
    const picsumUrl = `https://picsum.photos/${width}/${height}`;

    return {
        url: unsplashUrl,
        fallbackUrl: picsumUrl,
        searchQuery,
        width,
        height,
        ratio: '1200x630 (OG)',
    };
}

// ─── 텍스트 오버레이 썸네일 (Canvas 없이 SVG) ───

export function generateTextThumbnail({ title, subtitle = '', bgColor = '#667eea', textColor = '#ffffff' }) {
    const truncTitle = title.length > 30 ? title.substring(0, 28) + '...' : title;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="16"/>
  <text x="600" y="280" text-anchor="middle" fill="${textColor}" font-family="sans-serif" font-size="48" font-weight="bold">${escapeXml(truncTitle)}</text>
  <text x="600" y="340" text-anchor="middle" fill="${textColor}" font-family="sans-serif" font-size="24" opacity="0.8">${escapeXml(subtitle)}</text>
  <text x="600" y="550" text-anchor="middle" fill="${textColor}" font-family="sans-serif" font-size="18" opacity="0.5">BlogFlow</text>
</svg>`;

    const base64 = Buffer.from(svg).toString('base64');
    return {
        svg,
        dataUrl: `data:image/svg+xml;base64,${base64}`,
        width: 1200,
        height: 630,
    };
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
