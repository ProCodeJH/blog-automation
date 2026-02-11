/**
 * AI 블로그 글 자동 생성 스크립트
 * Blog_auto에서 포팅 + 확장
 *
 * 사용법: node scripts/generate-post.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── AI 도구 DB (20개) ──
const AI_TOOLS = [
    { name: 'ChatGPT', category: '챗봇 AI', tags: ['ChatGPT', 'OpenAI', '대화형 AI'] },
    { name: 'Claude', category: '챗봇 AI', tags: ['Claude', 'Anthropic', '대화형 AI'] },
    { name: 'Gemini', category: '챗봇 AI', tags: ['Gemini', 'Google', '대화형 AI'] },
    { name: 'Midjourney', category: '이미지 생성', tags: ['Midjourney', 'AI 이미지', '생성형 AI'] },
    { name: 'DALL-E 3', category: '이미지 생성', tags: ['DALL-E', 'OpenAI', 'AI 이미지'] },
    { name: 'Stable Diffusion', category: '이미지 생성', tags: ['Stable Diffusion', '오픈소스', 'AI 이미지'] },
    { name: 'Runway', category: '영상 편집', tags: ['Runway', 'AI 영상', '편집 도구'] },
    { name: 'Pika', category: '영상 편집', tags: ['Pika', 'AI 영상', '생성형 AI'] },
    { name: 'Notion AI', category: '생산성', tags: ['Notion', '생산성', 'AI 도구'] },
    { name: 'Grammarly', category: '글쓰기 도구', tags: ['Grammarly', '문법 검사', 'AI 글쓰기'] },
    { name: 'Jasper', category: '글쓰기 도구', tags: ['Jasper', 'AI 카피라이팅', '마케팅'] },
    { name: 'Copy.ai', category: '글쓰기 도구', tags: ['Copy.ai', 'AI 카피라이팅', '마케팅'] },
    { name: 'GitHub Copilot', category: '코딩 도우미', tags: ['GitHub Copilot', 'AI 코딩', '개발 도구'] },
    { name: 'Cursor', category: '코딩 도우미', tags: ['Cursor', 'AI 코딩', 'IDE'] },
    { name: 'Replit', category: '코딩 도우미', tags: ['Replit', 'AI 코딩', '클라우드 IDE'] },
    { name: 'Perplexity', category: '검색 AI', tags: ['Perplexity', 'AI 검색', '리서치'] },
    { name: 'You.com', category: '검색 AI', tags: ['You.com', 'AI 검색', '생산성'] },
    { name: 'Otter.ai', category: '생산성', tags: ['Otter.ai', '회의록', '음성 인식'] },
    { name: 'Descript', category: '영상 편집', tags: ['Descript', '팟캐스트', '영상 편집'] },
    { name: 'ElevenLabs', category: '음성 AI', tags: ['ElevenLabs', 'TTS', '음성 합성'] },
];

const POST_TYPES = ['review', 'comparison', 'guide', 'tips', 'news'];

// ── Gemini API ──
async function generateWithGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('⚠️ GEMINI_API_KEY 없음 → 샘플 콘텐츠 생성');
        return generateSample();
    }
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
                }),
            }
        );
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || generateSample();
    } catch (e) {
        console.error('Gemini API 오류:', e.message);
        return generateSample();
    }
}

function generateSample() {
    return `## 이 AI 도구가 특별한 이유\n\n최근 AI 기술의 발전으로 다양한 도구들이 등장했습니다.\n\n## 주요 기능\n\n1. **사용하기 쉬운 인터페이스**\n2. **강력한 AI 엔진**\n3. **다양한 활용**\n\n## 장단점\n\n### 장점 ✅\n- 직관적 UI\n- 빠른 처리\n- 합리적 가격\n\n### 단점 ❌\n- 한국어 지원 미흡\n- 모바일 앱 부재\n\n## 마무리\n\n확실히 사용해볼 가치가 있는 도구입니다!`;
}

// ── 글 생성 ──
async function generatePost() {
    const tool = AI_TOOLS[Math.floor(Math.random() * AI_TOOLS.length)];
    const type = POST_TYPES[Math.floor(Math.random() * POST_TYPES.length)];

    let title, prompt;
    const sameCat = AI_TOOLS.filter(t => t.category === tool.category && t.name !== tool.name);
    const tool2 = sameCat[0] || AI_TOOLS[0];

    switch (type) {
        case 'comparison':
            title = `${tool.name} vs ${tool2.name} 완벽 비교 분석`;
            prompt = `${tool.name}와 ${tool2.name}를 비교하는 한국어 블로그 글. 장단점, 가격 비교, 추천 대상. 마크다운 2000자 이상.`;
            break;
        case 'guide':
            title = `${tool.name} 완벽 가이드 - 초보자부터 고급까지`;
            prompt = `${tool.name} 사용 가이드. 기본 사용법, 고급 기능, 실전 팁, FAQ. 마크다운 2000자 이상.`;
            break;
        case 'tips':
            title = `${tool.name} 꿀팁 10가지 - 숨은 기능 대공개`;
            prompt = `${tool.name}의 숨겨진 팁과 트릭 10가지. 상세 설명과 활용 예시. 마크다운 2000자 이상.`;
            break;
        case 'news':
            title = `${tool.name} 최신 업데이트 소식 - 새 기능 총정리`;
            prompt = `${tool.name}의 최신 업데이트 소식 한국어 글. 새 기능, 변경점, 영향. 마크다운 2000자 이상.`;
            break;
        default:
            title = `${tool.name} 솔직 리뷰 - 한 달 사용 후기`;
            prompt = `${tool.name}에 대한 솔직한 리뷰 한국어 글. 주요 기능, 장단점, 가격, 추천 대상, 총평. 마크다운 2000자 이상.`;
    }

    const content = await generateWithGemini(prompt);
    const date = new Date().toISOString().split('T')[0];
    const slug = `${tool.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${type}-${date}`;
    const desc = `${tool.name}의 모든 것을 알려드립니다. 실제 사용 경험을 바탕으로 한 솔직한 분석!`;

    return { title, description: desc, content, tags: tool.tags, category: tool.category, slug, date };
}

// ── 저장 (JSON + Markdown) ──
function savePost(post) {
    const rootDir = path.resolve(__dirname, '..');

    // 1. Markdown (auto-posts/)
    const mdDir = path.join(rootDir, 'data', 'auto-posts');
    if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
    const mdContent = `---\ntitle: "${post.title}"\ndescription: "${post.description}"\ndate: "${post.date}"\ntags: ${JSON.stringify(post.tags)}\ncategory: "${post.category}"\n---\n\n${post.content}`;
    fs.writeFileSync(path.join(mdDir, `${post.slug}.md`), mdContent, 'utf8');

    // 2. JSON (posts.json에 추가)
    const jsonPath = path.join(rootDir, 'data', 'posts.json');
    let posts = [];
    if (fs.existsSync(jsonPath)) {
        try { posts = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch { posts = []; }
    }
    const id = `auto-${Date.now()}`;
    posts.unshift({
        id,
        title: post.title,
        rawText: post.content,
        content: post.content,
        metaDescription: post.description,
        tags: post.tags,
        images: [],
        tone: 'professional',
        category: post.category,
        status: 'ready',
        platforms: [],
        seoScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(jsonPath, JSON.stringify(posts, null, 2), 'utf8');

    console.log(`✅ Markdown: data/auto-posts/${post.slug}.md`);
    console.log(`✅ JSON: posts.json에 추가 (id: ${id})`);
}

// ── Main ──
async function main() {
    console.log('🤖 AI 블로그 글 자동 생성 시작...\n');
    const post = await generatePost();
    savePost(post);
    console.log(`\n📝 제목: ${post.title}`);
    console.log(`📂 카테고리: ${post.category}`);
    console.log(`🏷️ 태그: ${post.tags.join(', ')}`);
    console.log('\n✨ 완료!');
}

main().catch(console.error);
