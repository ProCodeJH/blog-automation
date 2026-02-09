import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(POSTS_FILE)) writeFileSync(POSTS_FILE, '[]', 'utf-8');
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

// GET - 전체 게시물 조회
export async function GET() {
    try {
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
            status: body.status || 'draft', // draft | ready | published | scheduled
            platforms: body.platforms || [],
            seoScore: body.seoScore || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // 기존 포스트 업데이트 or 신규 추가
        const existingIndex = posts.findIndex((p) => p.id === newPost.id);
        if (existingIndex >= 0) {
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
        // Support both body { id } and query param ?id=xxx
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
