import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { optimizeImage } from '../../../lib/image-optimizer';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('images');

        if (!files || files.length === 0) {
            return NextResponse.json({ success: false, error: '이미지를 선택해주세요.' }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });

        const results = [];

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const ext = path.extname(file.name);
            const id = uuidv4();

            // Save original
            const origFilename = `${id}${ext}`;
            const origPath = path.join(uploadsDir, origFilename);
            await writeFile(origPath, buffer);

            // Optimize (WebP + resize + compress)
            let optimized = null;
            try {
                optimized = await optimizeImage(buffer, file.name, { maxWidth: 1200, quality: 80, toWebP: true });
                const optPath = path.join(uploadsDir, `${id}_opt.webp`);
                await writeFile(optPath, optimized.buffer);
            } catch (optError) {
                // Optimization failed, use original
                console.warn('Image optimization failed:', optError.message);
            }

            results.push({
                id,
                originalUrl: `/uploads/${origFilename}`,
                optimizedUrl: optimized ? `/uploads/${id}_opt.webp` : `/uploads/${origFilename}`,
                filename: file.name,
                size: buffer.length,
                optimizedSize: optimized?.optimizedSize || buffer.length,
                savings: optimized?.savings || '0%',
                width: optimized?.width || null,
                format: optimized?.format || ext.replace('.', ''),
            });
        }

        return NextResponse.json({
            success: true,
            images: results,
            totalOriginal: results.reduce((s, r) => s + r.size, 0),
            totalOptimized: results.reduce((s, r) => s + r.optimizedSize, 0),
        });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
