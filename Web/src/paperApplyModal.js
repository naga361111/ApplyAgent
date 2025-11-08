document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('paperApplyModal');
    const openBtn = document.getElementById('paperApplyBtn');
    const closeBtn = document.getElementById('closeBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const closeSpan = document.querySelector('.close');

    // 모달 열기
    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // 모달 닫기 (닫기 버튼)
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 모달 닫기 (X 버튼)
    closeSpan.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 모달 닫기 (확인 버튼)
    confirmBtn.addEventListener('click', () => {
        alert('확인되었습니다!');
        modal.style.display = 'none';
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
