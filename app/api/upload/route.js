import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request) {
    try {
        await mkdir(UPLOAD_DIR, { recursive: true });

        const formData = await request.formData();
        const files = formData.getAll('images');

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: '이미지를 선택해주세요.' },
                { status: 400 }
            );
        }

        const uploaded = [];

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const ext = path.extname(file.name) || '.jpg';
            const filename = `${uuidv4()}${ext}`;
            const filepath = path.join(UPLOAD_DIR, filename);

            await writeFile(filepath, buffer);

            uploaded.push({
                id: uuidv4(),
                filename,
                originalName: file.name,
                url: `/uploads/${filename}`,
                size: file.size,
                type: file.type,
            });
        }

        return NextResponse.json({ success: true, images: uploaded });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json(
            { success: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
