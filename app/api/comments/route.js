import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

function readComments() {
    if (!fs.existsSync(COMMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
}

function writeComments(comments) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
}

// 감정 분석 (간단한 키워드 기반)
function analyzeSentiment(text) {
    const positive = ['감사', '좋아', '훌륭', '최고', '추천', '도움', '유용', '완벽', 'good', 'great', 'awesome', 'love', 'thanks', 'helpful', 'excellent', '대박', '짱'];
    const negative = ['별로', '나쁜', '실망', '최악', '불만', '싫', 'bad', 'terrible', 'worst', 'hate', 'poor', '짜증', '쓰레기', '후회'];
    const spam = ['광고', '홍보', '클릭', '무료', '당첨', '바로가기', 'click here', 'free', 'winner', 'http://', 'bit.ly'];

    const lower = text.toLowerCase();
    const posCount = positive.filter(w => lower.includes(w)).length;
    const negCount = negative.filter(w => lower.includes(w)).length;
    const spamCount = spam.filter(w => lower.includes(w)).length;

    if (spamCount >= 2) return { sentiment: 'spam', confidence: 0.9 };
    if (posCount > negCount) return { sentiment: 'positive', confidence: Math.min(1, posCount * 0.3) };
    if (negCount > posCount) return { sentiment: 'negative', confidence: Math.min(1, negCount * 0.3) };
    return { sentiment: 'neutral', confidence: 0.5 };
}

// GET: 댓글 조회
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');
        const filter = searchParams.get('filter'); // all, positive, negative, spam

        let comments = readComments();

        if (postId) comments = comments.filter(c => c.postId === postId);
        if (filter && filter !== 'all') comments = comments.filter(c => c.sentiment === filter);

        // 최신순 정렬
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const stats = {
            total: comments.length,
            positive: comments.filter(c => c.sentiment === 'positive').length,
            negative: comments.filter(c => c.sentiment === 'negative').length,
            neutral: comments.filter(c => c.sentiment === 'neutral').length,
            spam: comments.filter(c => c.sentiment === 'spam').length,
        };

        return NextResponse.json({ success: true, comments, stats });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: 댓글 추가 / 답글
export async function POST(request) {
    try {
        const body = await request.json();
        const { postId, author, content, parentId } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ success: false, error: '댓글 내용을 입력해주세요.' }, { status: 400 });
        }

        const comments = readComments();
        const analysis = analyzeSentiment(content);
        const comment = {
            id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            postId: postId || null,
            parentId: parentId || null,
            author: author || '익명',
            content: content.trim(),
            sentiment: analysis.sentiment,
            sentimentConfidence: analysis.confidence,
            isSpam: analysis.sentiment === 'spam',
            isApproved: analysis.sentiment !== 'spam',
            createdAt: new Date().toISOString(),
            replies: [],
        };

        if (parentId) {
            const parentIdx = comments.findIndex(c => c.id === parentId);
            if (parentIdx >= 0) {
                if (!comments[parentIdx].replies) comments[parentIdx].replies = [];
                comments[parentIdx].replies.push(comment);
            } else {
                comments.push(comment);
            }
        } else {
            comments.push(comment);
        }

        writeComments(comments);
        return NextResponse.json({ success: true, comment });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: 댓글 삭제
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get('id');

        if (!commentId) {
            return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });
        }

        let comments = readComments();

        // 루트 레벨 삭제
        const idx = comments.findIndex(c => c.id === commentId);
        if (idx >= 0) {
            comments.splice(idx, 1);
        } else {
            // 답글에서 삭제
            comments.forEach(c => {
                if (c.replies) {
                    c.replies = c.replies.filter(r => r.id !== commentId);
                }
            });
        }

        writeComments(comments);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
