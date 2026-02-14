/**
 * BlogFlow - 플랫폼별 콘텐츠 최적화 (F4)
 * — 각 플랫폼에 맞게 콘텐츠 형식 변환
 */

export function optimizeForPlatform(content, platform, { title = '', tags = [] } = {}) {
    if (!content) return content;

    switch (platform) {
        case 'naver':
            return optimizeForNaver(content, title);
        case 'tistory':
            return optimizeForTistory(content, tags);
        case 'velog':
            return optimizeForVelog(content);
        case 'wordpress':
            return optimizeForWordPress(content);
        default:
            return content;
    }
}

// ─── 네이버: HTML + SmartEditor 호환 ───
function optimizeForNaver(content, title) {
    let html = content;
    // 마크다운 → HTML (네이버는 HTML만)
    if (!html.includes('<')) {
        html = markdownToHTML(html);
    }
    // 네이버 스타일 최적화
    html = html
        .replace(/<h1>/gi, '<h2 style="font-size:24px;font-weight:bold;margin:20px 0 10px;">')
        .replace(/<\/h1>/gi, '</h2>')
        .replace(/<h2>/gi, '<h3 style="font-size:20px;font-weight:bold;margin:16px 0 8px;">')
        .replace(/<\/h2>/gi, '</h3>')
        .replace(/<blockquote>/gi, '<blockquote style="border-left:4px solid #03c75a;padding:12px 16px;margin:16px 0;background:#f8f9fa;">')
        .replace(/<code>/gi, '<code style="background:#f1f3f5;padding:2px 6px;border-radius:4px;font-family:monospace;">')
        .replace(/<pre>/gi, '<pre style="background:#2d2d2d;color:#f8f8f2;padding:16px;border-radius:8px;overflow-x:auto;">');
    return html;
}

// ─── 티스토리: HTML + 태그 최적화 ───
function optimizeForTistory(content, tags) {
    let html = content;
    if (!html.includes('<')) {
        html = markdownToHTML(html);
    }
    // 티스토리 전용 태그 스타일
    html = html
        .replace(/<pre><code/gi, '<pre class="lang-javascript"><code')
        .replace(/<blockquote>/gi, '<blockquote class="tx-quote-tistory">');
    // 태그 메타 추가
    if (tags.length > 0) {
        html += `\n<p class="tags">${tags.map(t => `#${t}`).join(' ')}</p>`;
    }
    return html;
}

// ─── 벨로그: 마크다운 최적화 ───
function optimizeForVelog(content) {
    let md = content;
    // HTML → 마크다운 변환 (벨로그는 마크다운)
    if (md.includes('<') && md.includes('>')) {
        md = htmlToMarkdown(md);
    }
    return md;
}

// ─── 워드프레스: Gutenberg 블록 ───
function optimizeForWordPress(content) {
    let html = content;
    if (!html.includes('<')) {
        html = markdownToHTML(html);
    }
    // Gutenberg 블록 포맷
    html = html
        .replace(/<h2>/gi, '<!-- wp:heading -->\n<h2>')
        .replace(/<\/h2>/gi, '</h2>\n<!-- /wp:heading -->')
        .replace(/<p>/gi, '<!-- wp:paragraph -->\n<p>')
        .replace(/<\/p>/gi, '</p>\n<!-- /wp:paragraph -->')
        .replace(/<pre>/gi, '<!-- wp:code -->\n<pre class="wp-block-code"><code>')
        .replace(/<\/pre>/gi, '</code></pre>\n<!-- /wp:code -->');
    return html;
}

// ─── 유틸 ───

function markdownToHTML(md) {
    return md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[huplo])/gm, '<p>')
        .replace(/(?<![>])$/gm, '</p>');
}

function htmlToMarkdown(html) {
    return html
        .replace(/<h([1-4])[^>]*>(.*?)<\/h\1>/gi, (_, n, t) => '#'.repeat(+n) + ' ' + t + '\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
