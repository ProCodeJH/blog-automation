import { testWordPressConnection } from '../../../lib/platforms/wordpress';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { siteUrl, username, appPassword } = await request.json();
        const result = await testWordPressConnection({ siteUrl, username, appPassword });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
