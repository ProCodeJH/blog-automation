import { schedulePost, cancelSchedule, processScheduledPosts } from '../../../lib/scheduler';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'posts.json');

export async function GET() {
    if (!fs.existsSync(DATA_PATH)) return NextResponse.json([]);
    try {
        const posts = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        const scheduled = posts.filter(p => p.status === 'scheduled');
        return NextResponse.json(scheduled);
    } catch {
        return NextResponse.json([]);
    }
}

export async function POST(request) {
    try {
        const { postId, scheduledAt, platforms } = await request.json();
        if (!postId || !scheduledAt) {
            return NextResponse.json({ success: false, error: 'postId와 scheduledAt 필요' }, { status: 400 });
        }
        const result = schedulePost(postId, scheduledAt);
        if (!result) {
            return NextResponse.json({ success: false, error: '포스트를 찾을 수 없습니다.' }, { status: 404 });
        }
        // 플랫폼 정보 저장
        if (platforms) {
            result.scheduledPlatforms = platforms;
            const posts = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
            const idx = posts.findIndex(p => p.id === postId);
            if (idx >= 0) {
                posts[idx].scheduledPlatforms = platforms;
                fs.writeFileSync(DATA_PATH, JSON.stringify(posts, null, 2), 'utf8');
            }
        }
        return NextResponse.json({ success: true, post: result });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { postId } = await request.json();
        const result = cancelSchedule(postId);
        return NextResponse.json({ success: !!result, post: result });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
