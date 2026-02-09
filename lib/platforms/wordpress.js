/**
 * BlogFlow - WordPress REST API 발행 모듈
 */

export async function publishToWordPress({ siteUrl, username, appPassword, post }) {
    const apiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // Upload images first and get media IDs
    const mediaIds = [];
    if (post.images && post.images.length > 0) {
        for (const img of post.images) {
            try {
                const mediaId = await uploadMediaToWordPress(siteUrl, auth, img);
                if (mediaId) mediaIds.push(mediaId);
            } catch (e) {
                console.error('Media upload failed:', e.message);
            }
        }
    }

    const wpPost = {
        title: post.title,
        content: post.content,
        status: post.scheduledAt ? 'future' : 'publish',
        excerpt: post.metaDescription || '',
        tags: [], // WP needs tag IDs, skip for now
        featured_media: mediaIds[0] || 0,
    };

    if (post.scheduledAt) {
        wpPost.date = new Date(post.scheduledAt).toISOString();
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(wpPost),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `WordPress API 오류: ${response.status}`);
    }

    const result = await response.json();
    return {
        success: true,
        postId: result.id,
        postUrl: result.link,
        platform: 'wordpress',
    };
}

async function uploadMediaToWordPress(siteUrl, auth, image) {
    if (!image.url) return null;

    const mediaUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;

    // Fetch image from local server
    const imgResponse = await fetch(image.url.startsWith('http') ? image.url : `http://localhost:3000${image.url}`);
    const blob = await imgResponse.blob();

    const formData = new FormData();
    formData.append('file', blob, image.originalName || 'image.jpg');

    const response = await fetch(mediaUrl, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
        },
        body: formData,
    });

    if (response.ok) {
        const media = await response.json();
        return media.id;
    }
    return null;
}
