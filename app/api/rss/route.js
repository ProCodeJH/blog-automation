import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'posts.json');

function readPosts() {
    if (!fs.existsSync(DATA_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch { return []; }
}

export async function GET() {
    try {
        const posts = readPosts().filter(p => p.status === 'published' || p.status === 'ready');
        const items = posts.slice(0, 20).map(p => {
            const pubDate = new Date(p.createdAt || Date.now()).toUTCString();
            const desc = (p.metaDescription || p.rawText || '').replace(/<[^>]+>/g, '').slice(0, 300);
            return `    <item>
      <title><![CDATA[${p.title || '무제'}]]></title>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid>${p.id}</guid>
      ${(p.tags || []).map(t => `<category>${t}</category>`).join('\n      ')}
    </item>`;
        }).join('\n');

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BlogFlow - AI 파워블로거</title>
    <description>AI 기반 블로그 자동화 시스템</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

        return new NextResponse(rss, {
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
