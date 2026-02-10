#!/usr/bin/env node
// ② SEO 자동 점검 리포트 스크립트
// GitHub Actions cron으로 주간 실행

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_FILE = path.join(__dirname, '..', 'data', 'posts.json');
const REPORTS_DIR = path.join(__dirname, '..', 'data', 'seo-reports');

function analyzeSEO(post) {
    let score = 0;
    const issues = [];
    const improvements = [];

    // 제목 길이 (10-60자 최적)
    const titleLen = (post.title || '').length;
    if (titleLen >= 10 && titleLen <= 60) { score += 15; }
    else if (titleLen > 0) { score += 8; issues.push(`제목 길이 ${titleLen}자 (10-60자 권장)`); }
    else { issues.push('제목 없음'); }

    // 메타 설명
    if (post.metaDescription && post.metaDescription.length >= 50) { score += 15; }
    else if (post.metaDescription) { score += 8; improvements.push('메타 설명을 50자 이상으로 작성'); }
    else { improvements.push('메타 설명 추가 필요'); }

    // 콘텐츠 길이
    const contentLen = (post.content || post.rawText || '').length;
    if (contentLen >= 1000) { score += 15; }
    else if (contentLen >= 300) { score += 8; improvements.push(`콘텐츠 ${contentLen}자 (1000자 이상 권장)`); }
    else { score += 3; issues.push('콘텐츠가 너무 짧음'); }

    // 태그 존재
    if (post.tags && post.tags.length >= 3) { score += 10; }
    else if (post.tags && post.tags.length > 0) { score += 5; improvements.push('태그 3개 이상 추가 권장'); }
    else { improvements.push('태그 추가 필요'); }

    // 이미지 존재
    if (post.images && post.images.length > 0) { score += 10; }
    else { improvements.push('이미지 추가하면 SEO 향상'); }

    // 카테고리 설정
    if (post.category) { score += 10; }
    else { improvements.push('카테고리 설정 필요'); }

    // H1-H6 태그 사용 (content에 heading 존재)
    const headingMatch = (post.content || '').match(/<h[1-6]/gi);
    if (headingMatch && headingMatch.length >= 2) { score += 10; }
    else if (headingMatch) { score += 5; improvements.push('소제목(H2/H3) 추가 권장'); }
    else { improvements.push('소제목 구조 추가 필요'); }

    // 내부 링크
    const linkMatch = (post.content || '').match(/<a\s/gi);
    if (linkMatch && linkMatch.length >= 1) { score += 5; }
    else { improvements.push('관련 링크 추가 권장'); }

    // 키워드 밀도 (제목 키워드가 본문에 등장)
    const titleWords = (post.title || '').split(/\s+/).filter(w => w.length > 2);
    const foundKw = titleWords.filter(w => (post.content || '').includes(w));
    if (foundKw.length >= 2) { score += 10; }
    else if (foundKw.length >= 1) { score += 5; improvements.push('제목 키워드를 본문에 더 활용'); }
    else { improvements.push('제목과 본문 키워드 일치도 개선'); }

    return { score: Math.min(100, score), issues, improvements };
}

async function generateReport() {
    console.log('📊 SEO 리포트 생성 시작...\n');

    if (!fs.existsSync(POSTS_FILE)) {
        console.log('❌ posts.json 파일 없음');
        process.exit(1);
    }

    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    if (!Array.isArray(posts) || posts.length === 0) {
        console.log('❌ 게시물 없음');
        process.exit(0);
    }

    const results = posts.map(p => ({
        id: p.id,
        title: p.title || '(제목 없음)',
        status: p.status || 'draft',
        existingScore: p.seoScore || 0,
        ...analyzeSEO(p),
    }));

    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const critical = results.filter(r => r.score < 50);
    const good = results.filter(r => r.score >= 80);

    const report = {
        generatedAt: new Date().toISOString(),
        totalPosts: posts.length,
        averageScore: avgScore,
        distribution: {
            excellent: results.filter(r => r.score >= 90).length,
            good: results.filter(r => r.score >= 80 && r.score < 90).length,
            average: results.filter(r => r.score >= 60 && r.score < 80).length,
            poor: results.filter(r => r.score < 60).length,
        },
        criticalPosts: critical.map(r => ({ id: r.id, title: r.title, score: r.score, issues: r.issues })),
        topPosts: good.sort((a, b) => b.score - a.score).slice(0, 5).map(r => ({ id: r.id, title: r.title, score: r.score })),
        allResults: results,
    };

    // 저장
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const filename = `seo-report-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(path.join(REPORTS_DIR, filename), JSON.stringify(report, null, 2));

    console.log(`✅ SEO 리포트 생성 완료: ${filename}`);
    console.log(`📊 평균 점수: ${avgScore}/100`);
    console.log(`🔴 개선 필요: ${critical.length}개`);
    console.log(`🟢 우수: ${good.length}개`);

    // posts.json에 SEO 점수 업데이트
    let updated = false;
    results.forEach(r => {
        const idx = posts.findIndex(p => p.id === r.id);
        if (idx >= 0 && posts[idx].seoScore !== r.score) {
            posts[idx].seoScore = r.score;
            updated = true;
        }
    });
    if (updated) {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
        console.log('📝 게시물 SEO 점수 업데이트 완료');
    }
}

generateReport().catch(console.error);
