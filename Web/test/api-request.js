// test-api.js
async function testGetElements() {
  const testUrl = 'https://applyagent-page.onrender.com/'; // target page url

  try {
    console.log(`테스트 URL: ${testUrl}`);
    console.log('요청 전송 중...\n');

    const response = await fetch('http://localhost:8888/api/get-elements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✓ API 응답 성공\n');
      console.log('수집된 요소 개수:', data.elements.length);
      console.log('\n상세 결과:');
      console.log(JSON.stringify(data.elements, null, 2));
    } else {
      console.error('✗ API 오류:', data.error);
    }
  } catch (error) {
    console.error('✗ 요청 실패:', error.message);
  }
}

// testGetElements();

async function callWebhook() {
  try {
    const response = await fetch('https://port-0-applyagent-mhr1tpgu9de17e42.sel3.cloudtype.app/webhook-test/11390934-49d0-4d27-be67-727cfc3e1ec3', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('웹훅 호출 성공');
    } else {
      console.error('오류 상태 코드:', response.status);
    }
  } catch (error) {
    console.error('요청 실패:', error);
  }
}

callWebhook();

