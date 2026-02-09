import { analyzeSEO } from '../../../lib/seo';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { title, content, metaDescription, tags, images, keyword } = body;

        const result = analyzeSEO({ title, content, metaDescription, tags, images, keyword });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
