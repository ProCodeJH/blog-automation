/**
 * 스케줄 자동 발행 관리자
 * ② 예약된 포스트를 시간에 맞춰 자동 발행
 */

import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'posts.json');

function readPosts() {
    if (!fs.existsSync(DATA_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch { return []; }
}
function writePosts(posts) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(posts, null, 2), 'utf8');
}

/**
 * 예약 발행 체크 & 실행
 * - status: 'scheduled'이고 scheduledAt이 현재 시각 이전인 포스트를 자동 발행
 */
export function processScheduledPosts() {
    const posts = readPosts();
    const now = new Date();
    let published = 0;

    posts.forEach(post => {
        if (post.status === 'scheduled' && post.scheduledAt) {
            const scheduledTime = new Date(post.scheduledAt);
            if (scheduledTime <= now) {
                post.status = 'published';
                post.publishedAt = now.toISOString();
                post.updatedAt = now.toISOString();
                published++;
                console.log(`📢 자동 발행: "${post.title}"`);
            }
        }
    });

    if (published > 0) {
        writePosts(posts);
        console.log(`✅ ${published}개 포스트 자동 발행 완료`);
    }

    return published;
}

/**
 * 스케줄러 시작 (인터벌 기반)
 * @param {number} intervalMs - 체크 간격 (기본: 60초)
 */
export function startScheduler(intervalMs = 60000) {
    console.log('⏰ 스케줄러 시작됨 (간격:', intervalMs / 1000, '초)');
    processScheduledPosts(); // 즉시 1회 실행
    return setInterval(processScheduledPosts, intervalMs);
}

/**
 * 발행 예약 설정
 */
export function schedulePost(postId, scheduledAt) {
    const posts = readPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    post.status = 'scheduled';
    post.scheduledAt = scheduledAt;
    post.updatedAt = new Date().toISOString();
    writePosts(posts);
    return post;
}

/**
 * 예약 취소
 */
export function cancelSchedule(postId) {
    const posts = readPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    post.status = 'draft';
    post.scheduledAt = null;
    post.updatedAt = new Date().toISOString();
    writePosts(posts);
    return post;
}
