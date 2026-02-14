import { getHistory, getStats, clearHistory } from '../../../lib/publish-history';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'stats') {
        return NextResponse.json(getStats());
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const platform = searchParams.get('platform') || null;
    const status = searchParams.get('status') || null;

    return NextResponse.json(getHistory({ limit, platform, status }));
}

export async function DELETE() {
    return NextResponse.json(clearHistory());
}
