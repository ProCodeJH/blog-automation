// ① 네이버 블로그 최적화 HTML 생성기
// 네이버 블로그는 Open API를 제공하지 않으므로
// 붙여넣기용 최적화 HTML을 생성합니다

export function generateNaverHTML(post) {
    const { title, content, tags = [], images = [], category = '' } = post;

    // 네이버 에디터 호환 HTML
    const html = `
<div style="font-family: 'Noto Sans KR', sans-serif; max-width: 760px; margin: 0 auto; line-height: 1.8; color: #333;">
    <h2 style="font-size: 24px; font-weight: 700; color: #222; border-bottom: 3px solid #03c75a; padding-bottom: 12px; margin-bottom: 20px;">
        ${title}
    </h2>

    ${images.length > 0 ? `
    <div style="margin-bottom: 20px; text-align: center;">
        <img src="${images[0]}" alt="${title}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
    </div>
    ` : ''}

    <div style="font-size: 16px; line-height: 1.9; color: #333;">
        ${content}
    </div>

    ${tags.length > 0 ? `
    <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #888;">
            ${tags.map(t => `#${t}`).join(' ')}
        </p>
    </div>
    ` : ''}

    <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="font-size: 13px; color: #999; margin: 0;">
            이 글이 도움이 되셨다면 공감❤️ 부탁드려요!
        </p>
    </div>
</div>`.trim();

    return {
        html,
        plainText: content.replace(/<[^>]+>/g, ''),
        tags: tags.map(t => `#${t}`).join(' '),
    };
}

// 네이버 에디터용 클린 HTML (스마트에디터 호환)
export function generateNaverSmartEditorHTML(post) {
    const { title, content, tags = [] } = post;

    // 스마트에디터 3.0 호환 포맷
    return `<div class="se-main-container">
<div class="se-component se-text se-l-default">
<div class="se-component-content">
<div class="se-section se-section-text se-l-default">
<div class="se-module se-module-text">
<p class="se-text-paragraph se-text-paragraph-align-center" style=""><span style="font-size:24px;"><b>${title}</b></span></p>
</div>
</div>
</div>
</div>
<div class="se-component se-text se-l-default">
<div class="se-component-content">
<div class="se-section se-section-text se-l-default">
<div class="se-module se-module-text">
${content.split('\n').map(line => `<p class="se-text-paragraph" style="">${line || '<br>'}</p>`).join('\n')}
</div>
</div>
</div>
</div>
${tags.length > 0 ? `<div class="se-component se-text se-l-default"><div class="se-component-content"><div class="se-section se-section-text"><div class="se-module se-module-text"><p class="se-text-paragraph" style=""><span style="color:#03c75a;">${tags.map(t => '#' + t).join(' ')}</span></p></div></div></div></div>` : ''}
</div>`;
}
