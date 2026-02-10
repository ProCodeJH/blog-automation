import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(POSTS_FILE)) writeFileSync(POSTS_FILE, '[]', 'utf-8');
    if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
}

function readPosts() {
    ensureDataDir();
    const data = readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
}

function writePosts(posts) {
    ensureDataDir();
    writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// ⑧ 버전 히스토리 저장
function saveHistory(post) {
    try {
        ensureDataDir();
        const histFile = path.join(HISTORY_DIR, `${post.id}.json`);
        let versions = [];
        if (existsSync(histFile)) {
            try { versions = JSON.parse(readFileSync(histFile, 'utf8')); } catch { versions = []; }
        }
        versions.push({
            version: versions.length + 1,
            savedAt: new Date().toISOString(),
            title: post.title,
            rawText: post.rawText,
            content: post.content,
            metaDescription: post.metaDescription,
            tags: post.tags,
            seoScore: post.seoScore,
        });
        // 최대 20개 버전만 보관
        if (versions.length > 20) versions = versions.slice(-20);
        writeFileSync(histFile, JSON.stringify(versions, null, 2), 'utf8');
    } catch (e) {
        console.error('History save error:', e.message);
    }
}

// GET - 전체 게시물 조회
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const historyId = searchParams.get('history');

        // ⑧ 히스토리 조회
        if (historyId) {
            ensureDataDir();
            const histFile = path.join(HISTORY_DIR, `${historyId}.json`);
            if (!existsSync(histFile)) return NextResponse.json({ success: true, versions: [] });
            const versions = JSON.parse(readFileSync(histFile, 'utf8'));
            return NextResponse.json({ success: true, versions });
        }

        const posts = readPosts();
        return NextResponse.json({ success: true, posts });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST - 게시물 저장
export async function POST(request) {
    try {
        const body = await request.json();
        const posts = readPosts();

        const newPost = {
            id: body.id || uuidv4(),
            title: body.title || '제목 없음',
            rawText: body.rawText || '',
            content: body.content || '',
            metaDescription: body.metaDescription || '',
            tags: body.tags || [],
            images: body.images || [],
            tone: body.tone || 'friendly',
            category: body.category || '',
            status: body.status || 'draft',
            platforms: body.platforms || [],
            seoScore: body.seoScore || 0,
            scheduledAt: body.scheduledAt || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const existingIndex = posts.findIndex((p) => p.id === newPost.id);
        if (existingIndex >= 0) {
            // ⑧ 업데이트 시 이전 버전 저장
            saveHistory(posts[existingIndex]);
            newPost.createdAt = posts[existingIndex].createdAt;
            posts[existingIndex] = newPost;
        } else {
            posts.unshift(newPost);
        }

        writePosts(posts);
        return NextResponse.json({ success: true, post: newPost });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - 게시물 삭제
export async function DELETE(request) {
    try {
        let id = null;
        try {
            const body = await request.json();
            id = body.id;
        } catch {
            const { searchParams } = new URL(request.url);
            id = searchParams.get('id');
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        const posts = readPosts();
        const filtered = posts.filter((p) => p.id !== id);
        writePosts(filtered);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
