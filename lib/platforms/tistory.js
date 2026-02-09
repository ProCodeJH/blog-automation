// 티스토리 Open API 발행 모듈
// API 문서: https://tistory.github.io/document-tistory-apis/

/**
 * 티스토리에 글 발행
 * @param {Object} params
 * @param {string} params.accessToken - 티스토리 Access Token
 * @param {string} params.blogName - 블로그명 (xxx.tistory.com의 xxx)
 * @param {Object} params.post - 게시물 데이터
 * @param {string} [params.visibility='3'] - 0: 비공개, 3: 공개
 */
export async function publishToTistory({ accessToken, blogName, post, visibility = '3' }) {
    const apiUrl = 'https://www.tistory.com/apis/post/write';

    const formData = new URLSearchParams();
    formData.append('access_token', accessToken);
    formData.append('output', 'json');
    formData.append('blogName', blogName);
    formData.append('title', post.title || '제목 없음');
    formData.append('content', post.content || '');
    formData.append('visibility', visibility);
    formData.append('category', '0'); // 기본 카테고리

    // 태그 추가
    if (post.tags && post.tags.length > 0) {
        formData.append('tag', post.tags.join(','));
    }

    // 예약 발행
    if (post.scheduledAt) {
        formData.append('published', post.scheduledAt);
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });

    const data = await response.json();

    if (data.tistory?.status === '200') {
        return {
            success: true,
            postId: data.tistory.postId,
            url: data.tistory.url || `https://${blogName}.tistory.com/${data.tistory.postId}`,
        };
    } else {
        throw new Error(data.tistory?.error_message || '티스토리 발행 실패');
    }
}

/**
 * 티스토리에 이미지 업로드 후 URL 반환
 */
export async function uploadImageToTistory({ accessToken, blogName, imageBuffer, filename }) {
    const apiUrl = 'https://www.tistory.com/apis/post/attach';

    const formData = new FormData();
    formData.append('access_token', accessToken);
    formData.append('blogName', blogName);
    formData.append('output', 'json');
    formData.append('uploadedfile', new Blob([imageBuffer]), filename);

    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (data.tistory?.status === '200') {
        return { success: true, url: data.tistory.url, replacer: data.tistory.replacer };
    } else {
        throw new Error(data.tistory?.error_message || '이미지 업로드 실패');
    }
}
