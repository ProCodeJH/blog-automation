/**
 * Image Optimization Pipeline
 * Sharp 기반 이미지 자동 최적화
 */
import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir, stat } from 'fs/promises';

/**
 * 이미지 최적화 (리사이즈 + WebP 변환 + 압축)
 * @param {Buffer} inputBuffer - 원본 이미지 버퍼
 * @param {string} originalName - 원본 파일명
 * @param {Object} options
 * @param {number} [options.maxWidth=1200] - 최대 너비
 * @param {number} [options.quality=80] - 품질 (1-100)
 * @param {boolean} [options.toWebP=true] - WebP 변환 여부
 * @returns {{ buffer: Buffer, filename: string, originalSize: number, optimizedSize: number, savings: string }}
 */
export async function optimizeImage(inputBuffer, originalName, options = {}) {
    const { maxWidth = 1200, quality = 80, toWebP = true } = options;
    const originalSize = inputBuffer.length;

    let pipeline = sharp(inputBuffer);

    // Get metadata
    const metadata = await pipeline.metadata();

    // Resize if wider than maxWidth
    if (metadata.width && metadata.width > maxWidth) {
        pipeline = pipeline.resize(maxWidth, null, {
            withoutEnlargement: true,
            fit: 'inside',
        });
    }

    // Convert and compress
    let outputBuffer;
    let ext;

    if (toWebP) {
        outputBuffer = await pipeline.webp({ quality }).toBuffer();
        ext = '.webp';
    } else {
        // Keep original format with compression
        const isJpeg = /\.(jpe?g)$/i.test(originalName);
        const isPng = /\.png$/i.test(originalName);

        if (isJpeg) {
            outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
            ext = '.jpg';
        } else if (isPng) {
            outputBuffer = await pipeline.png({ quality: Math.min(quality, 100) }).toBuffer();
            ext = '.png';
        } else {
            outputBuffer = await pipeline.webp({ quality }).toBuffer();
            ext = '.webp';
        }
    }

    const optimizedSize = outputBuffer.length;
    const savings = originalSize > 0
        ? ((1 - optimizedSize / originalSize) * 100).toFixed(1) + '%'
        : '0%';

    // Generate filename
    const baseName = path.basename(originalName, path.extname(originalName));
    const filename = `${baseName}_opt${ext}`;

    return {
        buffer: outputBuffer,
        filename,
        originalSize,
        optimizedSize,
        savings,
        width: metadata.width > maxWidth ? maxWidth : metadata.width,
        height: metadata.height,
        format: toWebP ? 'webp' : ext.replace('.', ''),
    };
}

/**
 * 여러 이미지 일괄 최적화
 */
export async function optimizeImages(images, options = {}) {
    const results = [];
    for (const img of images) {
        try {
            const result = await optimizeImage(img.buffer, img.name, options);
            results.push({ ...result, originalName: img.name, success: true });
        } catch (error) {
            results.push({ originalName: img.name, success: false, error: error.message });
        }
    }
    return results;
}
