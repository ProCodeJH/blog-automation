// 최종 검증: publishToNaverPuppeteer 함수 직접 호출
import { publishToNaverPuppeteer } from '../lib/platforms/naver-puppeteer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testImage = path.resolve(__dirname, 'test-image.png');

console.log('=== 최종 발행 검증 (이미지 포함) ===\n');

const result = await publishToNaverPuppeteer({
    blogId: 'louispetergu',
    title: `최종 검증 ${new Date().toLocaleTimeString('ko-KR')}`,
    content: '이미지 포함 자동 발행 테스트입니다.\n\nBlogFlow v2 이미지 업로드 검증 완료!',
    tags: ['BlogFlow', '자동발행'],
    images: [testImage],
    headless: true,
    useProfile: true,
});

console.log('\n=== 결과 ===');
console.log(JSON.stringify(result, null, 2));
