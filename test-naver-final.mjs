import fs from 'fs';
const COOKIES = 'NID_AUT=NRTCtQ0Qx1q5Rie2r69klYBwoF5+kBxrAChp4Y7pMyfgTwyqTuT/K1Y77H6GLhKM; NID_SES=AAABrhMP98OeLNIUfkDehEy62NsM7J6JoVF58eHo4qMq9dhzwQDH3Q+6aK1hYqIKRiuFAs2cO0wCvCYYi+GEWbtQhWrDiJgh+TikZ5jT++ZkRmyEjqj3mKcxDWpULZYr+h8NFjLnu+V3yByJSLbQP6tETtz8bhjc9RvDsQbyRMGHaAKk5EVrULoAj7RChXThDj5QIjr39DEVmYN82MgIgJtDsV7g1pQkIHm6T7vA88aeVT/goRuHXAp8Ntv5/pemIF+y+yS9WD0Tv5dVTS9FWqhfK+wnpznypWa77JBn1IDb0Zjl72Vkv3l/8Ke/RnWfU+gx0ZQFbC7WK4q8Zpyl+UKrtkLtdCwICocCKrjDa50/w/onxx44batZtsEdNXGqaNpIKO8pSSfACbgyVmGEEN9steF/PmTE53EkzE/DSDNPZIuyxM3F0kiVOL+3EOScWoMXm003HcXgMtQa6i+PciEdHz2AneKSQ4iefG3VVdRV1ixIVIsj674Z/YD2Pl7dSn+vJOahK39Ov8VK3N4reL9e3cV9zkl+c2F1HpLqafuYXTXkmJEa016Zs2yZmXfwwWBnFA==';
const LOG = 'naver_final2_log.txt';
fs.writeFileSync(LOG, '', 'utf8');
function log(m) { const l = typeof m === 'string' ? m : JSON.stringify(m, null, 2); fs.appendFileSync(LOG, l + '\n', 'utf8'); }

log('=== Test 2: with long content ===');
log('Time: ' + new Date().toISOString());

try {
    const { publishToNaver } = await import('./lib/platforms/naver.js');
    const result = await publishToNaver(
        {
            title: 'Long Content Test ' + Date.now(),
            content: '<h2>AI 테스트 글</h2><p>이것은 긴 블로그 글 자동 발행 테스트입니다.</p><p>여러 단락으로 구성된 본문입니다. 첫 번째 단락은 소개 부분입니다.</p><p>두 번째 단락은 본론 부분입니다. AI 기술은 빠르게 발전하고 있습니다.</p><p>세 번째 단락은 결론입니다. 앞으로 더 발전할 것입니다.</p>',
            tags: ['테스트', 'AI'],
        },
        COOKIES,
        'louispetergu'
    );
    log('\n=== RESULT ===');
    log(result);
    log(result.success && result.method !== 'clipboard' ? '\n>>> SUCCESS!' : '\n>>> FAILED: ' + (result.error || result.method));
} catch (e) { log('ERROR: ' + e.message); log(e.stack); }
log('=== Done ===');
