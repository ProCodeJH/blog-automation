/**
 * BlogFlow - WordPress REST API 발행 모듈
 * — Application Password 인증
 * — 태그 자동 생성/매핑
 * — 연결 테스트
 */

// ─── 연결 테스트 ───

export async function testWordPressConnection({ siteUrl, username, appPassword }) {
    if (!siteUrl || !username || !appPassword) {
        return { success: false, error: '사이트 URL, 사용자명, Application Password가 모두 필요합니다.' };
    }

    const baseUrl = siteUrl.replace(/\/$/, '');
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    try {
        // 1차: REST API 접근 확인
        const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
            headers: { Authorization: `Basic ${auth}` },
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401) {
            return {
                success: false,
                error: '인증 실패. Application Password를 확인해주세요.\n' +
                    '※ WordPress 관리자 → 사용자 → 프로필 → Application Passwords에서 발급',
            };
        }
        if (res.status === 403) {
            return { success: false, error: '권한이 부족합니다. 관리자 또는 편집자 권한이 필요합니다.' };
        }
        if (res.status === 404) {
            return {
                success: false,
                error: 'REST API를 찾을 수 없습니다. WordPress에서 REST API가 활성화되어 있는지 확인해주세요.\n' +
                    '※ 일부 보안 플러그인이 REST API를 차단할 수 있습니다.',
            };
        }
        if (!res.ok) {
            return { success: false, error: `WordPress API 오류: ${res.status} ${res.statusText}` };
        }

        const user = await res.json();

        // 2차: 사이트 정보
        let siteName = siteUrl;
        try {
            const siteRes = await fetch(`${baseUrl}/wp-json`, { signal: AbortSignal.timeout(5000) });
            if (siteRes.ok) {
                const siteInfo = await siteRes.json();
                siteName = siteInfo.name || siteUrl;
            }
        } catch { /* ignore */ }

        return {
            success: true,
            siteName,
            userName: user.name || user.slug || username,
            userRole: user.roles?.[0] || 'unknown',
            canPublish: ['administrator', 'editor', 'author'].includes(user.roles?.[0]),
        };
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return { success: false, error: '연결 시간 초과. 사이트 URL을 확인해주세요.' };
        }
        return { success: false, error: `연결 실패: ${err.message}` };
    }
}

// ─── 태그 이름 → ID 변환 (없으면 자동 생성) ───

async function resolveTagIds(baseUrl, auth, tagNames) {
    if (!tagNames || tagNames.length === 0) return [];

    const tagIds = [];

    for (const name of tagNames) {
        const trimmed = name.trim();
        if (!trimmed) continue;

        try {
            // 기존 태그 검색
            const searchRes = await fetch(
                `${baseUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(trimmed)}&per_page=5`,
                { headers: { Authorization: `Basic ${auth}` } }
            );

            if (searchRes.ok) {
                const tags = await searchRes.json();
                const exact = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
                if (exact) {
                    tagIds.push(exact.id);
                    continue;
                }
            }

            // 태그 없으면 새로 생성
            const createRes = await fetch(`${baseUrl}/wp-json/wp/v2/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify({ name: trimmed }),
            });

            if (createRes.ok) {
                const newTag = await createRes.json();
                tagIds.push(newTag.id);
                console.log(`[WordPress] 태그 생성: "${trimmed}" → ID ${newTag.id}`);
            }
        } catch (e) {
            console.log(`[WordPress] 태그 처리 실패 (${trimmed}): ${e.message}`);
        }
    }

    return tagIds;
}

// ─── 자동 발행 ───

export async function publishToWordPress({ siteUrl, username, appPassword, post }) {
    if (!siteUrl || !username || !appPassword) {
        return { success: false, error: 'WordPress 연동 정보를 설정에서 입력해주세요.' };
    }

    const baseUrl = siteUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // 이미지 업로드
    const mediaIds = [];
    if (post.images && post.images.length > 0) {
        for (const img of post.images) {
            try {
                const mediaId = await uploadMediaToWordPress(baseUrl, auth, img);
                if (mediaId) mediaIds.push(mediaId);
            } catch (e) {
                console.error('[WordPress] 미디어 업로드 실패:', e.message);
            }
        }
    }

    // 태그 ID 변환
    const tagIds = await resolveTagIds(baseUrl, auth, post.tags || []);

    const wpPost = {
        title: post.title,
        content: post.content,
        status: post.scheduledAt ? 'future' : 'publish',
        excerpt: post.metaDescription || '',
        tags: tagIds,
        featured_media: mediaIds[0] || 0,
    };

    if (post.scheduledAt) {
        wpPost.date = new Date(post.scheduledAt).toISOString();
    }

    console.log(`[WordPress] 발행 시작: "${post.title?.substring(0, 30)}" → ${baseUrl}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(wpPost),
            signal: AbortSignal.timeout(30000),
        });

        if (response.status === 401) {
            return {
                success: false,
                error: '인증 실패. Application Password를 확인해주세요.\n' +
                    '※ WordPress 관리자 → 사용자 → 프로필 → Application Passwords',
            };
        }
        if (response.status === 403) {
            return { success: false, error: '발행 권한이 없습니다. 관리자/편집자/작성자 역할이 필요합니다.' };
        }
        if (response.status === 404) {
            return {
                success: false,
                error: 'REST API를 찾을 수 없습니다. WordPress REST API가 활성화되어 있는지 확인해주세요.',
            };
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return {
                success: false,
                error: error.message || `WordPress API 오류: ${response.status}`,
            };
        }

        const result = await response.json();
        console.log(`[WordPress] 발행 성공: ${result.link}`);

        return {
            success: true,
            postId: result.id,
            postUrl: result.link,
            platform: 'wordpress',
            method: 'rest-api',
            message: `✅ WordPress에 발행되었습니다!`,
            tagCount: tagIds.length,
        };
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return { success: false, error: '발행 타임아웃. 사이트 응답이 느립니다.' };
        }
        return { success: false, error: `발행 실패: ${err.message}` };
    }
}

// ─── 미디어 업로드 ───

async function uploadMediaToWordPress(baseUrl, auth, image) {
    if (!image.url) return null;

    const mediaUrl = `${baseUrl}/wp-json/wp/v2/media`;

    const imgResponse = await fetch(
        image.url.startsWith('http') ? image.url : `http://localhost:3000${image.url}`,
        { signal: AbortSignal.timeout(15000) }
    );
    const blob = await imgResponse.blob();

    const formData = new FormData();
    formData.append('file', blob, image.originalName || 'image.jpg');

    const response = await fetch(mediaUrl, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}` },
        body: formData,
        signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
        const media = await response.json();
        console.log(`[WordPress] 미디어 업로드: ${media.source_url}`);
        return media.id;
    }
    return null;
}
