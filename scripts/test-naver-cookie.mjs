const cookie = 'NID_AUT=GmlkRu9PRjFof0KZksj2YFyEYQ7vzMDgOkPgs2U0fyDOw6P8h0tXYsKbbsdmZsT1; NID_SES=AAABqV12tVhJspzlrdESr5j8sQNy/eG6i45u7yALR8YguWzfkTFJf1S0TKEUjiohTCIW6Yz2hFXlPiVXJ+yfQx2AXzYHKw9YaonYn8qS5jSNawU3tf55kGe3eigxiLRMQBbK8rY7lNkv50pjMZOWJJp1UlQ0qf+6JXqkwr2kzXOmYVxWzHMXK5py522O7xuT4DH3serFyMtNybEIW9TpuTatgoYUm4nLHUWlAFNcUTAL98278q3NNEKbLZHFdn6PkaqlScTHaGsoQ8W+TSLcpa+h7JAffeCKiJIXtt0IPIWf1+0jdOQkd54EF2JAYeJ2noeYHtNu4S5YYtXNEgnyJRD1TkGpYstNO1KTwFQAMLFpaOAFbZZB3QuQ5zSVlvttRFUeELfM34VCiWk0752ssjU9Sl9fuMQ7aijatk5eBxnudYZGzw0pJfFAnSafdM2F1mNnfgAnAmeiLpQC+Qp1g4hX9Z/ZLXA2XSG87gZv3X7zwzmj1IYfO9cbNegsQ2MyqpwNfk5Pv/9IszjOI6DwFAlzOZZnf1665IW9bcDgy8Aq/cp1XrPnRBd4qllGfjLlrwmyAw==';

const h = { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };

async function test() {
    // Test 1: section blog home (no redirect needed)
    const r1 = await fetch('https://section.blog.naver.com/BlogHome.naver', { headers: h, redirect: 'follow' });
    const t1 = await r1.text();
    const bid = t1.match(/blogId[^a-z]*?[=:]["']([^"']+)["']/i) || t1.match(/blog\.naver\.com\/([a-zA-Z0-9_]{3,30})/);
    console.log('1) section/BlogHome status:', r1.status, 'blogId:', bid ? bid[1] : 'NOT FOUND');
    console.log('   logged in?', t1.includes('로그아웃') || t1.includes('GNB_LOGOUT'));

    // Test 2: naver.com profile check
    const r2 = await fetch('https://nid.naver.com/nidlogin.login?svctype=262144', { headers: h, redirect: 'manual' });
    console.log('2) nid status:', r2.status, 'location:', (r2.headers.get('location') || '').substring(0, 80));

    // Test 3: blog.naver.com main  
    const r3 = await fetch('https://blog.naver.com/', { headers: h, redirect: 'follow' });
    const t3 = await r3.text();
    const bid3 = t3.match(/blog\.naver\.com\/([a-zA-Z0-9_]{3,30})/);
    console.log('3) blog.naver.com status:', r3.status, 'blogId:', bid3 ? bid3[1] : 'NOT FOUND');
    console.log('   has login form?', t3.includes('id="loginForm"') || t3.includes('nid.naver.com/nidlogin'));
}
test().catch(e => console.error('ERROR:', e.message));
