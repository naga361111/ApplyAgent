const backendURL = 'https://applyagent.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitBtn');
    const runAgentBtn = document.getElementById('runAgentBtn');

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

        const response = await fetch(backendURL + '/submit-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })

        if (response.ok) {
            console.log("신청됨");
        } else {
            const errData = await response.json();
            console.error("신청 실패: ", errData);
        }
    });

    runAgentBtn.addEventListener('click', async () => {
        const data = {
            dummy: "dummy"
        }

        const response = await fetch(backendURL + '/api/call-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        if (response.ok) {
            console.log("에이전트 호출됨");
        } else {
            const errData = await response.json();
            console.error("에이전트 호출 실패: ", errData);
            alert("에이전트 호출 실패: ", errData);
        }
    })
});
