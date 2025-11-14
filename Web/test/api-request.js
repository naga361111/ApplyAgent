const API_URL = 'http://localhost:8888';

const testPayload = {
  url: 'https://applyagent-page.onrender.com',
  actions: [
    {
      type: 'fill',
      selector: '#userName',
      value: 'automation test data',
    },
    {
      type: 'fill',
      selector: '#age',
      value: '09878654321',
    },
    {
      type: 'click',
      selector: '#submitBtn',
    },
  ],
};

// 테스트 실행을 위한 비동기 함수
async function runTest() {
  console.log(`테스트 시작: ${API_URL} 로 POST 요청 전송`);
  console.log('전송할 페이로드:', JSON.stringify(testPayload, null, 2));

  try {
    // fetch를 사용하여 API 요청
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    // 응답 본문을 JSON으로 파싱
    const responseData = await response.json();

    console.log('------------------------');
    console.log(`상태 코드: ${response.status}`);
    console.log('응답 본문:', responseData);
    console.log('------------------------');

    if (response.ok) {
      console.log('✅ 테스트 성공: 자동화 작업이 성공적으로 완료되었습니다.');
    } else {
      console.error(`❌ 테스트 실패: 서버가 오류를 반환했습니다.`);
    }
  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:');
    if (error.code === 'ECONNREFUSED') {
      console.error(
        `[오류] 연결을 거부당했습니다. API 서버가 ${API_URL}에서 실행 중인지 확인하세요.`
      );
    } else {
      console.error(error.message);
    }
    console.error(
      '힌트: API 서버(server.js)를 먼저 실행해야 합니다.'
    );
  }
}

// 테스트 실행
// runTest();

async function testTaskEnd(jobId) {
  try {

    if (!jobId) {
      console.error('❌ jobId가 제공되지 않았습니다.');
      return;
    }

    const response = await fetch(API_URL + '/api/mark-job-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: jobId })
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(`✅ Job [${jobId}] 완료 요청 성공`);
    } else {
      console.error(`❌ Job [${jobId}] 완료 요청 실패: ${responseData.error}`);
    }
  } catch (error) {
    console.error(error);
  }
}

testTaskEnd("job_1762701702636");