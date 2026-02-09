/**
 * Real SEO Scoring Engine
 * 실제 알고리즘 기반 SEO 분석
 */

/**
 * 전체 SEO 점수 분석
 * @param {Object} params
 * @param {string} params.title - 게시물 제목
 * @param {string} params.content - HTML 콘텐츠
 * @param {string} params.metaDescription - 메타 설명
 * @param {string[]} params.tags - 태그 배열
 * @param {Object[]} params.images - 이미지 배열
 * @param {string} params.keyword - 주요 키워드
 * @returns {{ score: number, grade: string, checks: Object[] }}
 */
export function analyzeSEO({ title = '', content = '', metaDescription = '', tags = [], images = [], keyword = '' }) {
    const checks = [];
    let totalScore = 0;
    let maxScore = 0;

    // Strip HTML for text analysis
    const plainText = content.replace(/<[^>]+>/g, '').trim();
    const charCount = plainText.length;
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    // 1. 제목 분석 (15점)
    maxScore += 15;
    const titleLen = title.length;
    if (titleLen >= 15 && titleLen <= 60) {
        checks.push({ id: 'title_length', label: '제목 길이', score: 15, max: 15, status: 'good', detail: `${titleLen}자 (적정)` });
        totalScore += 15;
    } else if (titleLen > 0 && titleLen < 15) {
        checks.push({ id: 'title_length', label: '제목 길이', score: 5, max: 15, status: 'warn', detail: `${titleLen}자 (15자 이상 권장)` });
        totalScore += 5;
    } else if (titleLen > 60) {
        checks.push({ id: 'title_length', label: '제목 길이', score: 8, max: 15, status: 'warn', detail: `${titleLen}자 (60자 이하 권장)` });
        totalScore += 8;
    } else {
        checks.push({ id: 'title_length', label: '제목 길이', score: 0, max: 15, status: 'bad', detail: '제목 없음' });
    }

    // 2. 메타 설명 (10점)
    maxScore += 10;
    const metaLen = metaDescription.length;
    if (metaLen >= 80 && metaLen <= 160) {
        checks.push({ id: 'meta_desc', label: '메타 설명', score: 10, max: 10, status: 'good', detail: `${metaLen}자 (적정)` });
        totalScore += 10;
    } else if (metaLen > 0) {
        checks.push({ id: 'meta_desc', label: '메타 설명', score: 5, max: 10, status: 'warn', detail: `${metaLen}자 (80-160자 권장)` });
        totalScore += 5;
    } else {
        checks.push({ id: 'meta_desc', label: '메타 설명', score: 0, max: 10, status: 'bad', detail: '메타 설명 없음' });
    }

    // 3. 본문 길이 (15점)
    maxScore += 15;
    if (charCount >= 2000) {
        checks.push({ id: 'content_length', label: '본문 길이', score: 15, max: 15, status: 'good', detail: `${charCount}자` });
        totalScore += 15;
    } else if (charCount >= 1000) {
        checks.push({ id: 'content_length', label: '본문 길이', score: 10, max: 15, status: 'warn', detail: `${charCount}자 (2000자 이상 권장)` });
        totalScore += 10;
    } else if (charCount > 0) {
        checks.push({ id: 'content_length', label: '본문 길이', score: 5, max: 15, status: 'warn', detail: `${charCount}자 (짧음)` });
        totalScore += 5;
    } else {
        checks.push({ id: 'content_length', label: '본문 길이', score: 0, max: 15, status: 'bad', detail: '본문 없음' });
    }

    // 4. 이미지 (10점)
    maxScore += 10;
    const imgCount = images?.length || (content.match(/<img/gi) || []).length;
    if (imgCount >= 3) {
        checks.push({ id: 'images', label: '이미지', score: 10, max: 10, status: 'good', detail: `${imgCount}개` });
        totalScore += 10;
    } else if (imgCount >= 1) {
        checks.push({ id: 'images', label: '이미지', score: 6, max: 10, status: 'warn', detail: `${imgCount}개 (3개 이상 권장)` });
        totalScore += 6;
    } else {
        checks.push({ id: 'images', label: '이미지', score: 0, max: 10, status: 'bad', detail: '이미지 없음' });
    }

    // 5. 소제목 (H2/H3) (10점)
    maxScore += 10;
    const h2Count = (content.match(/<h2/gi) || []).length;
    const h3Count = (content.match(/<h3/gi) || []).length;
    const headingCount = h2Count + h3Count;
    if (headingCount >= 3) {
        checks.push({ id: 'headings', label: '소제목 (H2/H3)', score: 10, max: 10, status: 'good', detail: `${headingCount}개` });
        totalScore += 10;
    } else if (headingCount >= 1) {
        checks.push({ id: 'headings', label: '소제목 (H2/H3)', score: 5, max: 10, status: 'warn', detail: `${headingCount}개 (3개 이상 권장)` });
        totalScore += 5;
    } else {
        checks.push({ id: 'headings', label: '소제목 (H2/H3)', score: 0, max: 10, status: 'bad', detail: '소제목 없음' });
    }

    // 6. 태그 (10점)
    maxScore += 10;
    if (tags.length >= 5) {
        checks.push({ id: 'tags', label: '태그', score: 10, max: 10, status: 'good', detail: `${tags.length}개` });
        totalScore += 10;
    } else if (tags.length >= 2) {
        checks.push({ id: 'tags', label: '태그', score: 6, max: 10, status: 'warn', detail: `${tags.length}개 (5개 이상 권장)` });
        totalScore += 6;
    } else {
        checks.push({ id: 'tags', label: '태그', score: 0, max: 10, status: 'bad', detail: tags.length > 0 ? `${tags.length}개 (부족)` : '태그 없음' });
    }

    // 7. 키워드 밀도 (10점)
    maxScore += 10;
    if (keyword && plainText.length > 0) {
        const keywordCount = (plainText.match(new RegExp(keyword, 'gi')) || []).length;
        const density = ((keywordCount * keyword.length) / plainText.length * 100).toFixed(1);
        if (density >= 1 && density <= 3) {
            checks.push({ id: 'keyword_density', label: '키워드 밀도', score: 10, max: 10, status: 'good', detail: `"${keyword}" ${density}%` });
            totalScore += 10;
        } else if (density > 0) {
            checks.push({ id: 'keyword_density', label: '키워드 밀도', score: 5, max: 10, status: 'warn', detail: `"${keyword}" ${density}% (1-3% 권장)` });
            totalScore += 5;
        } else {
            checks.push({ id: 'keyword_density', label: '키워드 밀도', score: 0, max: 10, status: 'bad', detail: `"${keyword}" 미포함` });
        }
    } else {
        checks.push({ id: 'keyword_density', label: '키워드 밀도', score: 0, max: 10, status: 'warn', detail: '키워드 미설정' });
    }

    // 8. 가독성 (10점) - 문단/줄바꿈 분석
    maxScore += 10;
    const paragraphs = content.split(/<\/p>|<br\s*\/?>|\n\n/).filter(p => p.trim().length > 0).length;
    const avgParaLen = paragraphs > 0 ? Math.round(charCount / paragraphs) : charCount;
    if (paragraphs >= 5 && avgParaLen <= 300) {
        checks.push({ id: 'readability', label: '가독성', score: 10, max: 10, status: 'good', detail: `${paragraphs}문단, 평균 ${avgParaLen}자` });
        totalScore += 10;
    } else if (paragraphs >= 3) {
        checks.push({ id: 'readability', label: '가독성', score: 6, max: 10, status: 'warn', detail: `${paragraphs}문단 (더 나누기 권장)` });
        totalScore += 6;
    } else {
        checks.push({ id: 'readability', label: '가독성', score: 2, max: 10, status: 'bad', detail: '문단 구분 부족' });
        totalScore += 2;
    }

    // 9. 링크 (5점)
    maxScore += 5;
    const linkCount = (content.match(/<a\s/gi) || []).length;
    if (linkCount >= 2) {
        checks.push({ id: 'links', label: '링크', score: 5, max: 5, status: 'good', detail: `${linkCount}개` });
        totalScore += 5;
    } else if (linkCount >= 1) {
        checks.push({ id: 'links', label: '링크', score: 3, max: 5, status: 'warn', detail: `${linkCount}개 (2개 이상 권장)` });
        totalScore += 3;
    } else {
        checks.push({ id: 'links', label: '링크', score: 0, max: 5, status: 'warn', detail: '링크 없음' });
    }

    // 10. 제목에 키워드 포함 (5점)
    maxScore += 5;
    if (keyword && title.includes(keyword)) {
        checks.push({ id: 'title_keyword', label: '제목 키워드', score: 5, max: 5, status: 'good', detail: `"${keyword}" 포함` });
        totalScore += 5;
    } else if (keyword) {
        checks.push({ id: 'title_keyword', label: '제목 키워드', score: 0, max: 5, status: 'warn', detail: `제목에 "${keyword}" 미포함` });
    } else {
        checks.push({ id: 'title_keyword', label: '제목 키워드', score: 0, max: 5, status: 'warn', detail: '키워드 미설정' });
    }

    // Calculate final score
    const finalScore = Math.round((totalScore / maxScore) * 100);
    const grade = finalScore >= 90 ? 'A+' : finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 50 ? 'C' : 'D';

    return {
        score: finalScore,
        grade,
        checks,
        stats: {
            charCount,
            wordCount,
            readingTime: Math.max(1, Math.round(charCount / 500)), // ~500자/분
            paragraphs,
            headingCount,
            imgCount,
            linkCount,
            tagCount: tags.length,
        },
    };
}

/**
 * 콘텐츠 통계 계산 (에디터용)
 */
export function getContentStats(content = '', title = '') {
    const plainText = content.replace(/<[^>]+>/g, '').trim();
    const charCount = plainText.length;
    const charCountNoSpaces = plainText.replace(/\s/g, '').length;
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const sentenceCount = plainText.split(/[.!?。!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphCount = content.split(/<\/p>|<br\s*\/?>|\n\n/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.max(1, Math.round(charCount / 500));
    const imgCount = (content.match(/<img/gi) || []).length;
    const headingCount = (content.match(/<h[23]/gi) || []).length;
    const linkCount = (content.match(/<a\s/gi) || []).length;

    return {
        charCount,
        charCountNoSpaces,
        wordCount,
        sentenceCount,
        paragraphCount,
        readingTime,
        imgCount,
        headingCount,
        linkCount,
        titleLength: title.length,
    };
}
