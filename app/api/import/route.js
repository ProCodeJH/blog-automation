import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_PATH = path.join(process.cwd(), 'data', 'posts.json');

function readPosts() {
    if (!fs.existsSync(DATA_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch { return []; }
}
function writePosts(posts) {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(posts, null, 2), 'utf8');
}

export async function POST(request) {
    try {
        const { data, format } = await request.json();
        if (!data) return NextResponse.json({ success: false, error: '데이터가 필요합니다' }, { status: 400 });

        let newPosts = [];

        if (format === 'csv') {
            // CSV 파싱: title,rawText,tags,category,tone
            const lines = data.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj = {};
                headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
                newPosts.push({
                    id: uuidv4(),
                    title: obj.title || '무제',
                    rawText: obj.rawtext || obj.content || '',
                    content: obj.content || obj.rawtext || '',
                    metaDescription: obj.description || obj.metadescription || '',
                    tags: (obj.tags || '').split(';').map(t => t.trim()).filter(Boolean),
                    images: [],
                    tone: obj.tone || 'friendly',
                    category: obj.category || '',
                    status: 'draft',
                    platforms: [],
                    seoScore: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        } else {
            // JSON 파싱
            const items = Array.isArray(data) ? data : JSON.parse(data);
            newPosts = items.map(item => ({
                id: item.id || uuidv4(),
                title: item.title || '무제',
                rawText: item.rawText || item.content || '',
                content: item.content || item.rawText || '',
                metaDescription: item.metaDescription || item.description || '',
                tags: item.tags || [],
                images: item.images || [],
                tone: item.tone || 'friendly',
                category: item.category || '',
                status: item.status || 'draft',
                platforms: item.platforms || [],
                seoScore: item.seoScore || 0,
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));
        }

        if (newPosts.length === 0) {
            return NextResponse.json({ success: false, error: '가져올 데이터가 없습니다' }, { status: 400 });
        }

        const posts = readPosts();
        posts.unshift(...newPosts);
        writePosts(posts);

        return NextResponse.json({ success: true, imported: newPosts.length });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
