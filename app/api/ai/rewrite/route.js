import { rewriteContent } from '../../../../lib/gemini';
import { getTemplatePromptAddition } from '../../../../lib/templates';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { rawText, imageInfos = [], imageData = [], tone = 'friendly', category = '', templateId = '', customPromptAddition = '' } = body;

        if (!rawText || rawText.trim().length === 0) {
            return NextResponse.json({ success: false, error: '글 내용을 입력해주세요.' }, { status: 400 });
        }

        // Build combined prompt with template + custom additions
        let promptAddition = '';
        if (templateId) {
            promptAddition += getTemplatePromptAddition(templateId) + '\n\n';
        }
        if (customPromptAddition) {
            promptAddition += `【사용자 커스텀 지시사항】\n${customPromptAddition}\n\n`;
        }

        const result = await rewriteContent({
            rawText: promptAddition ? `${promptAddition}\n${rawText}` : rawText,
            imageInfos,
            imageData,
            tone,
            category,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('AI Rewrite Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'AI 편집 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
