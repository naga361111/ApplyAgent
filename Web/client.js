async function runAutomation() {
  const apiUrl = 'http://localhost:3000/api/automate';
  const targetUrl = 'http://localhost:8000/';

  // API 서버에 보낼 작업 목록 정의
  const payload = {
    url: targetUrl,
    actions: [
      {
        type: 'fill',
        selector: '#userName',
        value: 'Playwright 자동화 테스트'
      },
    ]
  };

  console.log('자동화 API 호출 시작...');
  console.log('보내는 데이터:', JSON.stringify(payload, null, 2));

  try {
    // Node.js 18 이상에서는 fetch가 내장되어 있습니다.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 응답 처리
    if (response.ok) {
      const result = await response.json();
      console.log('--- API 호출 성공 ---');
      console.log('  - 최종 페이지 제목:', result.title);
    } else {
      // 서버가 500 에러 등을 반환했을 때
      const errorResult = await response.json();
      console.error(`--- API 호출 실패 (HTTP ${response.status}) ---`);
      console.error('  - 에러 메시지:', errorResult.error);
    }
  } catch (error) {
    // fetch 자체에서 에러가 발생했을 때 (예: 서버가 꺼져있음)
    console.error('--- API 서버에 연결할 수 없습니다 ---');
    console.error('  - (server.js가 실행 중인지 확인하세요)');
    console.error('  - 에러:', error.message);
  }
}

// 스크립트 실행
runAutomation();