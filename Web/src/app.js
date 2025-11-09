const backendURL = 'https://applyagent.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitBtn');
    const runAgentBtn = document.getElementById('runAgentBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    let pollingInterval = null;

    loadingOverlay.style.display = 'none';

    async function checkJobStatus(jobId) {
        try {
            console.log(`Checking status for job: ${jobId}...`);

            const response = await fetch(backendURL + '/api/job-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId })
            });

            if (!response.ok) {
                console.error('상태 확인 실패:', response.status);
                return;
            }

            const data = await response.json();

            if (data.status === 'complete') {
                console.log("Job completed!", data.result);

                clearInterval(pollingInterval);
                pollingInterval = null;
                loadingOverlay.style.display = 'none';
                runAgentBtn.disabled = false;

                const resultMessage = data.result ? JSON.stringify(data.result, null, 2) : "AI Agent가 작업을 성공적으로 완수하였습니다.";
                alert("신청됨 by AI Agent\n\n" + resultMessage);
            } else {
                console.log("Job is still pending...");
            }

        } catch (error) {
            console.error('상태 확인 중 네트워크 오류:', error);
        }
    }

    submitButton.addEventListener('click', async () => {
        const userName = document.getElementById('userName').value;
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const nationalId = document.getElementById('nationalId').value;
        const residence = document.getElementById('residence').value;

        const formData = {
            name: userName,
            age: age,
            gender: gender,
            nationalId: nationalId,
            residence: residence,
        };

        loadingOverlay.style.display = 'flex';
        runAgentBtn.disabled = true;

        const response = await fetch(backendURL + '/submit-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })

        if (response.ok) {
            console.log("신청됨");
            alert('신청됨');
        } else {
            const errData = await response.json();
            console.error("신청 실패: ", errData);
            alert('신청 실패: ' + errData);
        }

        loadingOverlay.style.display = 'none';
        runAgentBtn.disabled = false;
    });

    runAgentBtn.addEventListener('click', async () => {
        loadingOverlay.style.display = 'flex';
        runAgentBtn.disabled = true;

        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        try {
            const startResponse = await fetch(backendURL + '/api/call-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!startResponse.ok) {
                const errData = await startResponse.json();
                throw new Error(errData.message || '잡 시작 요청 실패');
            }

            const startData = await startResponse.json();
            const jobId = startData.jobId;

            if (!jobId) {
                throw new Error('서버에서 jobId를 받지 못했습니다.');
            }

            pollingInterval = setInterval(() => checkJobStatus(jobId), 1000);

        } catch (error) {
            console.error("에이전트 시작 실패: ", error);
            alert("에이전트 시작 실패: " + error.message);

            loadingOverlay.style.display = 'none';
            runAgentBtn.disabled = false;
        }
    });
});
