// ============================================================
// HackSync - Main Application Script
// ============================================================

// Initialize Lucide Icons
lucide.createIcons();


// =============================================================
// 0. 접근성 기반 설정
// =============================================================

// aria-live 영역 생성 (동적 콘텐츠 알림용)
(function createAriaLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
})();

function announceToScreenReader(message) {
    const region = document.getElementById('aria-live-region');
    if (region) {
        region.textContent = '';
        setTimeout(() => { region.textContent = message; }, 100);
    }
}

// 모달 포커스 트랩 및 Escape 키 닫기
let previouslyFocusedElement = null;

function trapFocusInModal(modalEl) {
    const focusableSelectors = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modalEl.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            modalEl.classList.remove('show');
            restoreModalFocus();
        }
    }

    modalEl._trapHandlers = { tab: handleTabKey, escape: handleEscapeKey };
    modalEl.addEventListener('keydown', handleTabKey);
    modalEl.addEventListener('keydown', handleEscapeKey);

    // 첫 포커스 요소에 포커스
    setTimeout(() => firstFocusable.focus(), 50);
}

function removeTrapFocus(modalEl) {
    if (modalEl._trapHandlers) {
        modalEl.removeEventListener('keydown', modalEl._trapHandlers.tab);
        modalEl.removeEventListener('keydown', modalEl._trapHandlers.escape);
        delete modalEl._trapHandlers;
    }
}

function restoreModalFocus() {
    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
    }
}


// =============================================================
// 1. SPA Routing Logic (Hash-based)
// =============================================================
const sections = document.querySelectorAll('.page-section');
const navLinks = document.querySelectorAll('.nav-links a');

// =============================================================
// Toast Notification
// =============================================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    
    let icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';
    else if (type === 'info') icon = 'info';

    toast.innerHTML = `
        <i data-lucide="${icon}" size="18" aria-hidden="true"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    // 스크린리더 알림
    announceToScreenReader(message);

    // Show animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

let currentUser = null;
let hacksync_users = [];

function handleRouting() {
    let hash = window.location.hash || '#home';

    // 보호된 라우트 접근 제어
    const protectedRoutes = ['#dashboard', '#judge', '#team', '#profile'];
    if (protectedRoutes.includes(hash) && !currentUser) {
        showToast('해당 메뉴에 접근하려면 로그인이 필요합니다.', 'error');
        window.location.hash = '#auth';
        return;
    }

    // 로그인된 사용자가 #auth 접근 시 리다이렉트
    if (hash === '#auth' && currentUser) {
        if (currentUser.role === 'admin') window.location.hash = '#dashboard';
        else if (currentUser.role === 'judge') window.location.hash = '#judge';
        else window.location.hash = '#team';
        return;
    }

    // #features 페이지 별도 처리
    sections.forEach(sec => {
        sec.classList.remove('active');
        if ('#' + sec.id === hash) {
            sec.classList.add('active');
        }
    });

    // Nav link 활성화 표시
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        }
    });

    // 차트 리사이즈 (대시보드 전환 시)
    if (hash === '#dashboard') {
        setTimeout(() => {
            if (roleChartInstance) roleChartInstance.resize();
            if (doughnutChartInstance) doughnutChartInstance.resize();
            if (lineChartInstance) lineChartInstance.resize();
        }, 100);
    }

    // 참가자 그리드 렌더 (팀빌딩 전환 시)
    if (hash === '#team') {
        setTimeout(() => lucide.createIcons(), 100);
    }

    // 카운터 애니메이션 (홈 전환 시)
    if (hash === '#home') {
        animateCounters();
    }

    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', handleRouting);

function updateNavUI() {
    const guestNavs = document.querySelectorAll('.guest-nav');
    const authNavs = document.querySelectorAll('.auth-nav');
    const btnLogin = document.getElementById('btn-login-nav');
    const userProfile = document.getElementById('user-profile-nav');
    const userName = document.getElementById('nav-user-name');

    if (!currentUser) {
        // 비로그인
        guestNavs.forEach(n => n.style.display = 'block');
        authNavs.forEach(n => n.style.display = 'none');
        if (btnLogin) btnLogin.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
    } else {
        // 로그인
        guestNavs.forEach(n => n.style.display = 'none'); // 원하면 block 유지 가능
        authNavs.forEach(n => {
            if (n.classList.contains(`role-${currentUser.role}`)) {
                n.style.display = 'block';
            } else {
                n.style.display = 'none';
            }
        });
        if (btnLogin) btnLogin.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            if (userName) userName.innerText = currentUser.name;
        }
    }
}

// Auth 초기화 및 로드 (DOM 로드 전 실행)
function initAuth() {
    const savedUser = localStorage.getItem('hacksync_currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    const savedUsersList = localStorage.getItem('hacksync_users');
    if (savedUsersList) {
        hacksync_users = JSON.parse(savedUsersList);
    } else {
        // Mock 기본 계정 생성
        hacksync_users = [
            { email: 'admin@hacksync.io', pw: '1234', name: '관리자', role: 'admin' },
            { email: 'judge@hacksync.io', pw: '1234', name: '심사위원 A', role: 'judge' },
            { email: 'user@hacksync.io', pw: '1234', name: '김참가', role: 'participant' }
        ];
        localStorage.setItem('hacksync_users', JSON.stringify(hacksync_users));
    }
}

initAuth();

document.addEventListener('DOMContentLoaded', () => {
    updateNavUI();
    handleRouting();
});


// =============================================================
// 2. 숫자 카운터 애니메이션 (소개 페이지)
// =============================================================
let countersAnimated = false;

function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo 이징
            const eased = 1 - Math.pow(1 - progress, 4);
            counter.textContent = Math.floor(target * eased);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target;
            }
        }
        requestAnimationFrame(update);
    });
}


// =============================================================
// 3. Chart.js — 대시보드 차트
// =============================================================
let roleChartInstance = null;
let doughnutChartInstance = null;
let lineChartInstance = null;

// 공통 Chart.js 설정
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(15, 17, 26, 0.9)',
            titleFont: { family: 'Pretendard Variable' },
            bodyFont: { family: 'Pretendard Variable' },
            padding: 12,
            cornerRadius: 8,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
        }
    }
};

function initCharts() {
    // --- 바 차트: 직무별 지원자 분포 ---
    const barCtx = document.getElementById('roleChart');
    if (!barCtx) return;

    const ctx = barCtx.getContext('2d');
    const gradientF = ctx.createLinearGradient(0, 0, 0, 400);
    gradientF.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
    gradientF.addColorStop(1, 'rgba(99, 102, 241, 0.2)');

    const gradientB = ctx.createLinearGradient(0, 0, 0, 400);
    gradientB.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
    gradientB.addColorStop(1, 'rgba(168, 85, 247, 0.2)');

    const gradientA = ctx.createLinearGradient(0, 0, 0, 400);
    gradientA.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
    gradientA.addColorStop(1, 'rgba(236, 72, 153, 0.2)');

    roleChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Frontend', 'Backend', 'AI/Data', 'Design', 'PM'],
            datasets: [{
                label: '지원자 수 (명)',
                data: [142, 128, 86, 45, 27],
                backgroundColor: [gradientF, gradientB, gradientA, 'rgba(16, 185, 129, 0.6)', 'rgba(245, 158, 11, 0.6)'],
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 'flex',
                maxBarThickness: 40
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e1', font: { family: 'Pretendard Variable' } }
                }
            }
        }
    });

    // --- 도넛 차트: 포지션 비율 ---
    const doughnutCtx = document.getElementById('doughnutChart');
    if (doughnutCtx) {
        doughnutChartInstance = new Chart(doughnutCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Frontend', 'Backend', 'AI/Data', 'Design', 'PM'],
                datasets: [{
                    data: [142, 128, 86, 45, 27],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderWidth: 0,
                    spacing: 3,
                    borderRadius: 4
                }]
            },
            options: {
                ...chartDefaults,
                cutout: '65%',
                plugins: {
                    ...chartDefaults.plugins,
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Pretendard Variable', size: 11 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 8
                        }
                    }
                }
            }
        });
    }

    // --- 라인 차트: 일별 지원자 추이 ---
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        const lineGradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 250);
        lineGradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        lineGradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

        lineChartInstance = new Chart(lineCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['5/15', '5/16', '5/17', '5/18', '5/19', '5/20', '5/21'],
                datasets: [{
                    label: '신규 지원자',
                    data: [12, 19, 15, 28, 22, 35, 42],
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: lineGradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#090A0F',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...chartDefaults,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#cbd5e1', font: { family: 'Pretendard Variable' } }
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initCharts);


// =============================================================
// 4. 대시보드 사이드바 서브뷰 네비게이션
// =============================================================
function initSidebarNav() {
    const sideMenuItems = document.querySelectorAll('.side-menu li[data-view]');
    
    sideMenuItems.forEach(item => {
        function activateItem() {
            const viewId = item.dataset.view;
            const sidebar = item.closest('.sidebar');
            const dashboardContent = item.closest('.dashboard-layout').querySelector('.dashboard-content');

            // 해당 사이드바 내에서만 활성화 토글
            sidebar.querySelectorAll('li[data-view]').forEach(m => {
                m.classList.remove('active');
                m.setAttribute('aria-selected', 'false');
            });
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');

            // 해당 대시보드 콘텐츠 내에서만 서브뷰 토글
            dashboardContent.querySelectorAll('.dash-subview').forEach(v => v.classList.remove('active'));
            const target = document.getElementById(viewId);
            if (target) {
                target.classList.add('active');
            }

            // 차트 리사이즈 (Admin Dashboard인 경우)
            setTimeout(() => {
                if (roleChartInstance) roleChartInstance.resize();
                if (doughnutChartInstance) doughnutChartInstance.resize();
                if (lineChartInstance) lineChartInstance.resize();
            }, 50);

            lucide.createIcons();
        }

        item.addEventListener('click', activateItem);
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateItem();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initSidebarNav);


// =============================================================
// 5. 최근 액티비티 렌더링 (대시보드 Overview)
// =============================================================
const activityData = [
    { name: '김토스', action: 'Frontend 개발자로 지원했습니다.', time: '방금 전', color: 'bg-gradient' },
    { name: 'AI 헬스케어 팀', action: '팀 빌딩을 완료했습니다.', time: '15분 전', color: 'bg-purple' },
    { name: '박카카오', action: 'Github 포트폴리오를 업데이트했습니다.', time: '1시간 전', color: 'bg-pink' },
    { name: '정해인', action: 'Vue.js 기반 프로젝트를 제출했습니다.', time: '2시간 전', color: 'bg-blue' },
    { name: '강동원', action: 'Backend 트랙에 팀을 생성했습니다.', time: '3시간 전', color: 'bg-green' },
    { name: '스마트 시티 팀', action: '최종 산출물을 제출했습니다.', time: '5시간 전', color: 'bg-gradient' },
];

function renderActivities() {
    const list = document.getElementById('activity-list');
    if (!list) return;

    list.innerHTML = activityData.map(a => `
        <li>
            <div class="dot ${a.color}"></div>
            <div class="activity-info">
                <p class="summary"><strong>${a.name}</strong>님이 ${a.action}</p>
                <span class="time">${a.time}</span>
            </div>
        </li>
    `).join('');
}

document.addEventListener('DOMContentLoaded', renderActivities);


// =============================================================
// 6. 지원자 테이블 데이터 & 렌더링 (대시보드 - 전체 지원자)
// =============================================================
let applicantData = [
    { name: '김토스', email: 'toss@email.com', role: 'Frontend', team: 'AI 헬스케어 팀', date: '2025-05-21', status: 'PENDING' },
    { name: '이현우', email: 'hyunwoo@email.com', role: 'Frontend', team: 'EduTech 팀', date: '2025-05-21', status: 'ACCEPTED' },
    { name: '박지성', email: 'jisung@email.com', role: 'Backend', team: 'AI 헬스케어 팀', date: '2025-05-20', status: 'ACCEPTED' },
    { name: '김데이터', email: 'data@email.com', role: 'AI', team: '스마트 시티 팀', date: '2025-05-20', status: 'ACCEPTED' },
    { name: '최디자인', email: 'design@email.com', role: 'Design', team: '미배정', date: '2025-05-19', status: 'PENDING' },
    { name: '정해인', email: 'haein@email.com', role: 'Frontend', team: 'EduTech 팀', date: '2025-05-19', status: 'ACCEPTED' },
    { name: '강동원', email: 'dongwon@email.com', role: 'Backend', team: '핀테크 혁신 팀', date: '2025-05-18', status: 'ACCEPTED' },
    { name: '손흥민', email: 'heungmin@email.com', role: 'PM', team: '미배정', date: '2025-05-18', status: 'REJECTED' },
    { name: '류현진', email: 'hyunjin@email.com', role: 'Backend', team: '미배정', date: '2025-05-17', status: 'PENDING' },
    { name: '김민지', email: 'minji@email.com', role: 'Design', team: '그린 에너지 팀', date: '2025-05-17', status: 'ACCEPTED' },
    { name: '장원영', email: 'wonyoung@email.com', role: 'Frontend', team: '미배정', date: '2025-05-16', status: 'REJECTED' },
    { name: '이강인', email: 'kangin@email.com', role: 'AI', team: '스마트 시티 팀', date: '2025-05-16', status: 'ACCEPTED' },
    { name: '안유진', email: 'yujin@email.com', role: 'PM', team: '핀테크 혁신 팀', date: '2025-05-15', status: 'PENDING' },
    { name: '카리나', email: 'karina@email.com', role: 'Design', team: 'AI 헬스케어 팀', date: '2025-05-15', status: 'ACCEPTED' },
    { name: '윈터', email: 'winter@email.com', role: 'Frontend', team: '미배정', date: '2025-05-14', status: 'REJECTED' },
];

const statusLabels = {
    PENDING: { label: '심사 대기', class: 'pending' },
    ACCEPTED: { label: '합격', class: 'accepted' },
    REJECTED: { label: '불합격', class: 'rejected' }
};

function renderApplicants(filter = 'all', searchQuery = '') {
    const tbody = document.getElementById('applicant-tbody');
    if (!tbody) return;

    let filtered = filter === 'all'
        ? applicantData
        : applicantData.filter(a => a.status === filter);

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.role.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.team.toLowerCase().includes(q)
        );
    }

    tbody.innerHTML = filtered.map(a => {
        const st = statusLabels[a.status];
        return `
            <tr>
                <td><strong>${a.name}</strong></td>
                <td class="text-gray">${a.email}</td>
                <td>${a.role}</td>
                <td>${a.team}</td>
                <td class="text-gray">${a.date}</td>
                <td><span class="status-badge ${st.class}">${st.label}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn accept" title="합격" aria-label="${a.name} 합격 처리" onclick="updateApplicantStatus('${a.email}', 'ACCEPTED')"><i data-lucide="check" size="14"></i></button>
                        <button class="table-action-btn reject" title="불합격" aria-label="${a.name} 불합격 처리" onclick="updateApplicantStatus('${a.email}', 'REJECTED')"><i data-lucide="x" size="14"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray" style="padding:2rem;">조건에 맞는 지원자가 없습니다.</td></tr>';
    }

    lucide.createIcons();
}

function updateApplicantStatus(email, newStatus) {
    const applicant = applicantData.find(a => a.email === email);
    if (applicant) {
        applicant.status = newStatus;
        if (typeof saveState === 'function') saveState(); // 상태 저장
        // 현재 필터 유지하면서 리렌더
        const activeFilter = document.querySelector('.applicant-status-bar .filter-btn.active');
        const currentFilter = activeFilter ? activeFilter.dataset.afilter : 'all';
        const searchVal = document.getElementById('applicant-search') ? document.getElementById('applicant-search').value : '';
        renderApplicants(currentFilter, searchVal);
    }
}

// 지원자 필터 버튼 이벤트
function initApplicantFilters() {
    document.querySelectorAll('[data-afilter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-afilter]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const searchVal = document.getElementById('applicant-search') ? document.getElementById('applicant-search').value : '';
            renderApplicants(e.target.dataset.afilter, searchVal);
        });
    });

    // 검색 입력 이벤트
    const searchInput = document.getElementById('applicant-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeFilter = document.querySelector('.applicant-status-bar .filter-btn.active');
            const currentFilter = activeFilter ? activeFilter.dataset.afilter : 'all';
            renderApplicants(currentFilter, e.target.value);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderApplicants();
    initApplicantFilters();
});


// =============================================================
// 7. 랭킹 테이블 렌더링 (대시보드 - 심사 결과 집계)
// =============================================================
let rankingData = [
    { rank: 1, team: 'AI 헬스케어 팀', track: 'AI/Data', creativity: 95, completeness: 92, presentation: 90, judges: 5 },
    { rank: 2, team: '스마트 시티 팀', track: 'AI/Data', creativity: 90, completeness: 91, presentation: 85, judges: 5 },
    { rank: 3, team: 'EduTech 팀', track: 'Frontend', creativity: 88, completeness: 85, presentation: 88, judges: 5 },
    { rank: 4, team: '핀테크 혁신 팀', track: 'Backend', creativity: 82, completeness: 90, presentation: 80, judges: 4 },
    { rank: 5, team: '그린 에너지 팀', track: 'Design', creativity: 85, completeness: 80, presentation: 82, judges: 4 },
    { rank: 6, team: '메타버스 팀', track: 'Frontend', creativity: 78, completeness: 82, presentation: 84, judges: 3 },
    { rank: 7, team: '로봇공학 팀', track: 'AI/Data', creativity: 80, completeness: 78, presentation: 76, judges: 3 },
    { rank: 8, team: '블록체인 팀', track: 'Backend', creativity: 75, completeness: 80, presentation: 72, judges: 3 },
];

function renderRankings() {
    const tbody = document.getElementById('ranking-tbody');
    if (!tbody) return;

    tbody.innerHTML = rankingData.map(r => {
        const total = ((r.creativity * 0.35) + (r.completeness * 0.40) + (r.presentation * 0.25)).toFixed(1);
        const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;

        return `
            <tr>
                <td class="rank-cell ${rankClass}" aria-label="${r.rank}위">${medal}</td>
                <td><strong>${r.team}</strong></td>
                <td><span class="skill-tag">${r.track}</span></td>
                <td class="score-cell">${r.creativity}</td>
                <td class="score-cell">${r.completeness}</td>
                <td class="score-cell">${r.presentation}</td>
                <td class="score-cell text-gradient" style="font-size:1.1rem;">${total}</td>
                <td class="text-gray">${r.judges}/5명</td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', renderRankings);


// =============================================================
// 8. 팀빌딩 참가자 데이터 & 렌더링
// =============================================================

// --- 프로필 → 팀빌딩 연동 ---
// localStorage에 저장된 모든 프로필을 participants와 병합
function mergeProfilesIntoParticipants() {
    const merged = [...participants];
    const existingNames = new Set(participants.map(p => p.name));

    // localStorage에서 hacksync_profile_ 키로 시작하는 프로필들 수집
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith('hacksync_profile_')) continue;

        try {
            const profile = JSON.parse(localStorage.getItem(key));
            if (!profile || !profile.name || !profile.name.trim()) continue;
            if (profile.skills && profile.skills.length === 0) continue; // 스킬 없으면 제외

            const email = key.replace('hacksync_profile_', '');
            const participantName = profile.name.trim();

            // 이미 기본 참가자에 같은 이름이 있으면 건너뛰기
            if (existingNames.has(participantName)) continue;

            // 매칭률 계산 (프로필 완성도 기반)
            let matchScore = 50;
            if (profile.bio && profile.bio.trim()) matchScore += 15;
            if (profile.skills && profile.skills.length > 0) matchScore += profile.skills.length * 5;
            if (profile.github && profile.github.trim()) matchScore += 10;
            matchScore = Math.min(matchScore, 98);

            // 현재 로그인 사용자인지 확인
            const isMe = currentUser && currentUser.email === email;

            merged.unshift({
                name: participantName + (isMe ? ' (나)' : ''),
                role: profile.role || 'Frontend',
                skills: profile.skills || [],
                avatar: profile.avatar || `https://i.pravatar.cc/150?u=${email}`,
                github: !!(profile.github && profile.github.trim()),
                bio: profile.bio || '아직 자기소개가 없습니다.',
                match: matchScore,
                isMyProfile: isMe,
                email: email
            });
            existingNames.add(participantName);
        } catch (e) {
            // JSON 파싱 실패 시 무시
        }
    }

    return merged;
}

// 프로필 저장 시 즉시 팀빌딩에 반영
function syncProfileToParticipants(profile, email) {
    // 현재 활성 필터와 검색어 유지
    const activeFilter = document.querySelector('.filter-bar .filter-btn[data-filter].active');
    const currentFilter = activeFilter ? activeFilter.dataset.filter : 'all';
    const searchVal = document.getElementById('team-search') ? document.getElementById('team-search').value : '';

    // 팀빌딩 그리드 재렌더링
    renderParticipants(currentFilter, searchVal);
}
let participants = [
    { name: '이현우', role: 'Frontend', skills: ['React', 'TypeScript', 'Next.js'], avatar: 'https://i.pravatar.cc/150?u=1', github: true, bio: '3년차 프론트엔드 개발자. 사용자 경험에 진심입니다.', match: 92 },
    { name: '박지성', role: 'Backend', skills: ['Spring Boot', 'Java', 'MySQL'], avatar: 'https://i.pravatar.cc/150?u=2', github: true, bio: '대규모 트래픽 처리 경험. MSA 아키텍처 선호.', match: 87 },
    { name: '김데이터', role: 'AI', skills: ['Python', 'PyTorch', 'FastAPI'], avatar: 'https://i.pravatar.cc/150?u=3', github: true, bio: 'NLP/CV 모델 학습 및 서빙 파이프라인 구축 경험.', match: 95 },
    { name: '최디자인', role: 'Design', skills: ['Figma', 'Protopie', 'UX/UI'], avatar: 'https://i.pravatar.cc/150?u=4', github: false, bio: 'B2B SaaS 디자인 시스템 구축 경험 보유.', match: 78 },
    { name: '정해인', role: 'Frontend', skills: ['Vue.js', 'SCSS', 'Zustand'], avatar: 'https://i.pravatar.cc/150?u=5', github: true, bio: '인터랙티브 웹 애플리케이션 개발 전문.', match: 85 },
    { name: '강동원', role: 'Backend', skills: ['Node.js', 'NestJS', 'Docker'], avatar: 'https://i.pravatar.cc/150?u=6', github: true, bio: 'DevOps와 백엔드를 겸하는 풀스택 지향 개발자.', match: 81 },
    { name: '손흥민', role: 'PM', skills: ['Notion', 'Jira', 'Data Analysis'], avatar: 'https://i.pravatar.cc/150?u=7', github: false, bio: '2년간 해커톤 기획 및 운영 경험. 팀 퍼실리테이팅 전문.', match: 73 },
    { name: '류현진', role: 'Backend', skills: ['Go', 'gRPC', 'PostgreSQL'], avatar: 'https://i.pravatar.cc/150?u=8', github: true, bio: '고성능 마이크로서비스 설계 및 구현.', match: 79 },
    { name: '김민지', role: 'Design', skills: ['Adobe XD', 'Illustration', 'Branding'], avatar: 'https://i.pravatar.cc/150?u=9', github: false, bio: '브랜드 아이덴티티와 비주얼 디자인 전문.', match: 76 },
    { name: '이강인', role: 'AI', skills: ['TensorFlow', 'MLOps', 'Pandas'], avatar: 'https://i.pravatar.cc/150?u=10', github: true, bio: 'ML 파이프라인 자동화 및 모델 서빙 경험.', match: 90 },
    { name: '안유진', role: 'PM', skills: ['Figma', 'SQL', 'GTM Strategy'], avatar: 'https://i.pravatar.cc/150?u=11', github: false, bio: 'IT 스타트업 PM 2년차. 데이터 드리븐 의사결정.', match: 70 },
    { name: '카리나', role: 'Design', skills: ['Figma', 'After Effects', 'Motion'], avatar: 'https://i.pravatar.cc/150?u=12', github: false, bio: '모션 디자인과 인터랙션 디자인을 결합합니다.', match: 82 },
];

const gridEl = document.getElementById('participant-grid');

function renderParticipants(filter = 'all', searchQuery = '') {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    // localStorage에 저장된 프로필들을 참가자 목록에 병합
    const allParticipants = mergeProfilesIntoParticipants();

    let filtered = filter === 'all'
        ? allParticipants
        : allParticipants.filter(p => p.role === filter);

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.role.toLowerCase().includes(q) ||
            p.skills.some(s => s.toLowerCase().includes(q)) ||
            p.bio.toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        gridEl.innerHTML = '<p class="text-gray" style="grid-column: 1/-1; text-align:center; padding: 3rem;">조건에 맞는 참가자가 없습니다.</p>';
        return;
    }

    filtered.forEach((p, i) => {
        const skillsHtml = p.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
        const isMe = p.isMyProfile === true;

        const card = document.createElement('div');
        card.className = 'part-card glass';
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `${p.name} - ${p.role}`);
        if (isMe) {
            card.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            card.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), transparent)';
        }
        card.style.animationDelay = `${i * 0.05}s`;
        card.innerHTML = `
            <span class="part-match">${isMe ? '내 프로필' : p.match + '% 매치'}</span>
            <div class="part-header">
                <img src="${p.avatar}" alt="${p.name} 프로필 사진" class="avatar">
                <div>
                    <h4 class="part-name">${p.name}</h4>
                    <span class="part-role">${p.role} ${p.role === 'PM' ? '' : 'Developer'}</span>
                </div>
            </div>
            <p class="part-bio">${p.bio}</p>
            <div class="part-skills">
                ${skillsHtml}
            </div>
            <div class="part-links">
                <a href="#" onclick="event.preventDefault()"><i data-lucide="folder-git2" size="16"></i> ${p.github ? 'Github' : 'Notion'} </a>
                ${isMe 
                    ? '<a href="#profile" class="btn-invite"><i data-lucide="edit" size="16"></i> 프로필 수정</a>'
                    : `<a href="#" class="btn-invite" onclick="event.preventDefault(); handleInvite('${p.name}');"><i data-lucide="user-plus" size="16"></i> 영입하기</a>`
                }
            </div>
        `;
        gridEl.appendChild(card);
    });

    // Re-initialize icons for newly added DOM elements
    lucide.createIcons();
}

function handleInvite(name) {
    showToast(`${name}님에게 팀 초대 요청을 보냈습니다. 🎉`, 'success');
}

// 필터 버튼 로직
function initTeamFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 현재 필터 그룹 내에서만 active 토글
            const parent = e.target.closest('.filter-bar') || e.target.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            e.target.classList.add('active');
            e.target.setAttribute('aria-pressed', 'true');

            const searchVal = document.getElementById('team-search') ? document.getElementById('team-search').value : '';
            renderParticipants(e.target.dataset.filter, searchVal);
        });
    });

    // 검색 입력
    const teamSearch = document.getElementById('team-search');
    if (teamSearch) {
        teamSearch.addEventListener('input', (e) => {
            const activeFilter = document.querySelector('.filter-bar .filter-btn[data-filter].active');
            const currentFilter = activeFilter ? activeFilter.dataset.filter : 'all';
            renderParticipants(currentFilter, e.target.value);
        });
    }
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    renderParticipants();
    initTeamFilters();
});


// =============================================================
// 9. CRM 채널 토글
// =============================================================
function initChannelToggle() {
    document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.channel-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        });
    });
}

document.addEventListener('DOMContentLoaded', initChannelToggle);


// =============================================================
// 10. Navbar 스크롤 시 배경 강화
// =============================================================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            navbar.style.background = 'rgba(9, 10, 15, 0.85)';
            navbar.style.borderBottomColor = 'rgba(255,255,255,0.08)';
        } else {
            navbar.style.background = 'var(--glass-bg)';
            navbar.style.borderBottomColor = 'var(--glass-border)';
        }
    });
}

// =============================================================
// 10b. Hamburger Menu & Mobile Nav
// =============================================================
function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.getElementById('main-nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.contains('mobile-open');
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('mobile-open');
        // aria-expanded 토글
        hamburger.setAttribute('aria-expanded', !isOpen);
        hamburger.setAttribute('aria-label', isOpen ? '메뉴 열기' : '메뉴 닫기');
        // Toggle body scroll lock
        document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('mobile-open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', '메뉴 열기');
            document.body.style.overflow = '';
        });
    });

    // Close mobile nav on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('mobile-open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', '메뉴 열기');
            document.body.style.overflow = '';
        }
    });
}

// =============================================================
// 10c. Mobile Sidebar Auto-Close
// =============================================================
function initMobileSidebar() {
    // When a sidebar menu item is clicked on mobile, close the sidebar
    document.querySelectorAll('.side-menu li[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = item.closest('.sidebar');
                if (sidebar) sidebar.classList.remove('open');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initNavbarScroll);
document.addEventListener('DOMContentLoaded', initMobileNav);
document.addEventListener('DOMContentLoaded', initMobileSidebar);


// =============================================================
// 11. 심사위원 대시보드 로직
// =============================================================
let judgePendingTeams = [
    { id: 1, name: 'AI 헬스케어 팀', track: 'AI/Data', desc: '의료 데이터를 활용한 AI 건강 관리 서비스입니다. 사용자의 생체 데이터를 분석하여 맞춤형 건강 리포트를 제공합니다.', github: true, pdf: true, video: false },
    { id: 2, name: '스마트 시티 팀', track: 'AI/Data', desc: 'IoT 센서 데이터를 분석하여 교통 체증을 예측하고 신호 주기를 최적화하는 스마트 시티 솔루션.', github: true, pdf: true, video: true },
    { id: 3, name: 'EduTech 팀', track: 'Frontend', desc: '학생의 학습 성취도를 시각화하고 게이미피케이션 요소를 도입한 인터랙티브 학습 플랫폼.', github: true, pdf: true, video: false },
    { id: 4, name: '핀테크 혁신 팀', track: 'Backend', desc: '블록체인 기술을 활용한 안전하고 빠른 국가 간 소액 송금 서비스 아키텍처 구현.', github: true, pdf: false, video: true },
    { id: 5, name: '그린 에너지 팀', track: 'Design', desc: '개인의 탄소 발자국을 추적하고 친환경 활동을 장려하는 모바일 앱 UI/UX 디자인.', github: false, pdf: true, video: true }
];

let judgeCompletedTeams = [
    { name: '메타버스 팀', track: 'Frontend', creativity: 85, completeness: 80, presentation: 82, total: 82.5 },
    { name: '로봇공학 팀', track: 'AI/Data', creativity: 90, completeness: 85, presentation: 88, total: 87.5 }
];

let currentScoringTeamId = null;

function renderJudgeDashboards() {
    // 1. 평가 대상 팀 (진행 중)
    const pendingGrid = document.getElementById('judge-pending-grid');
    if (pendingGrid) {
        pendingGrid.innerHTML = judgePendingTeams.map(t => `
            <div class="part-card glass">
                <div class="flex-between mb-3">
                    <span class="skill-tag">${t.track}</span>
                    <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border:none;">심사 대기</span>
                </div>
                <h3 class="text-xl font-bold mb-2">${t.name}</h3>
                <p class="text-sm text-gray mb-4" style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.desc}</p>
                
                <div class="flex-wrap gap-2 mb-4" style="display:flex;">
                    ${t.pdf ? '<span class="text-xs text-gray" style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius:4px;"><i data-lucide="file-text" size="10"></i> PDF</span>' : ''}
                    ${t.github ? '<span class="text-xs text-gray" style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius:4px;"><i data-lucide="github" size="10"></i> GitHub</span>' : ''}
                    ${t.video ? '<span class="text-xs text-gray" style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius:4px;"><i data-lucide="play-circle" size="10"></i> 영상</span>' : ''}
                </div>
                
                <button class="btn-primary w-100" style="width: 100%;" onclick="openScoreModal(${t.id})">
                    <i data-lucide="edit-3" size="16" style="margin-right:6px;"></i> 채점하기
                </button>
            </div>
        `).join('');
    }

    // 2. 완료된 심사
    const completedTbody = document.getElementById('judge-completed-tbody');
    if (completedTbody) {
        completedTbody.innerHTML = judgeCompletedTeams.map(t => `
            <tr>
                <td><strong>${t.name}</strong></td>
                <td><span class="skill-tag">${t.track}</span></td>
                <td class="score-cell">${t.creativity}</td>
                <td class="score-cell">${t.completeness}</td>
                <td class="score-cell">${t.presentation}</td>
                <td class="score-cell text-gradient" style="font-size:1.1rem;">${t.total}</td>
                <td>
                    <button class="table-action-btn" title="수정" onclick="showToast('채점 수정은 주최자에게 문의하세요.', 'error')"><i data-lucide="edit-2" size="14"></i></button>
                </td>
            </tr>
        `).join('');
    }

    lucide.createIcons();
}

function openScoreModal(teamId) {
    const team = judgePendingTeams.find(t => t.id === teamId);
    if (!team) return;
    
    currentScoringTeamId = teamId;
    document.getElementById('score-team-name').innerText = team.name;
    document.getElementById('score-team-desc').innerText = team.desc;
    
    // 모달 초기화
    document.getElementById('score-input-1').value = 80;
    document.getElementById('score-input-2').value = 80;
    document.getElementById('score-input-3').value = 80;
    document.getElementById('score-val-1').innerText = '80점';
    document.getElementById('score-val-2').innerText = '80점';
    document.getElementById('score-val-3').innerText = '80점';
    updateJudgeTotal();

    document.getElementById('score-team-modal').classList.add('show');
}

function updateJudgeTotal() {
    const s1 = parseInt(document.getElementById('score-input-1').value);
    const s2 = parseInt(document.getElementById('score-input-2').value);
    const s3 = parseInt(document.getElementById('score-input-3').value);
    
    const total = (s1 * 0.35) + (s2 * 0.40) + (s3 * 0.25);
    document.getElementById('judge-total-score').innerText = total.toFixed(1);
}

function submitJudgeScore() {
    if (!currentScoringTeamId) return;
    
    const s1 = parseInt(document.getElementById('score-input-1').value);
    const s2 = parseInt(document.getElementById('score-input-2').value);
    const s3 = parseInt(document.getElementById('score-input-3').value);
    const total = ((s1 * 0.35) + (s2 * 0.40) + (s3 * 0.25)).toFixed(1);

    const teamIndex = judgePendingTeams.findIndex(t => t.id === currentScoringTeamId);
    if (teamIndex !== -1) {
        const team = judgePendingTeams[teamIndex];
        
        // 제출된 항목 완료 리스트로 이동
        judgeCompletedTeams.unshift({
            name: team.name,
            track: team.track,
            creativity: s1,
            completeness: s2,
            presentation: s3,
            total: total
        });
        
        // 주최자 대시보드의 랭킹 데이터(rankingData)에도 반영
        const existingRank = rankingData.find(r => r.team === team.name);
        if (existingRank) {
            // 기존 데이터 업데이트 (간단히 새 점수로 덮어쓰기)
            existingRank.creativity = s1;
            existingRank.completeness = s2;
            existingRank.presentation = s3;
            // judges 수를 1명 증가 (임의의 로직)
            if (existingRank.judges < 5) existingRank.judges += 1;
        } else {
            // 새 데이터 추가
            rankingData.push({
                rank: 0, // 임시
                team: team.name,
                track: team.track,
                creativity: s1,
                completeness: s2,
                presentation: s3,
                judges: 1
            });
        }
        
        // 총점 기준으로 랭킹 재정렬 및 rank 번호 부여
        rankingData.sort((a, b) => {
            const totalA = (a.creativity * 0.35) + (a.completeness * 0.40) + (a.presentation * 0.25);
            const totalB = (b.creativity * 0.35) + (b.completeness * 0.40) + (b.presentation * 0.25);
            return totalB - totalA; // 내림차순
        });
        
        rankingData.forEach((r, index) => {
            r.rank = index + 1;
        });

        // 주최자 랭킹 보드 리렌더링
        if (typeof renderRankings === 'function') {
            renderRankings();
        }

        // 대기열에서 삭제
        judgePendingTeams.splice(teamIndex, 1);
        
        if (typeof saveState === 'function') saveState(); // 상태 저장

        // 모달 닫기 & 리렌더링
        document.getElementById('score-team-modal').classList.remove('show');
        renderJudgeDashboards();
        showToast(`${team.name} 채점이 완료되었습니다. 주최자 랭킹 보드에 즉시 반영됩니다.`, 'success');
    }
}

// =============================================================
// 12. LocalStorage 데이터 영속성 (새로고침 방지)
// =============================================================
function loadState() {
    try {
        const savedRanking = localStorage.getItem('hacksync_rankingData');
        if (savedRanking) rankingData = JSON.parse(savedRanking);

        const savedPending = localStorage.getItem('hacksync_judgePendingTeams');
        if (savedPending) judgePendingTeams = JSON.parse(savedPending);

        const savedCompleted = localStorage.getItem('hacksync_judgeCompletedTeams');
        if (savedCompleted) judgeCompletedTeams = JSON.parse(savedCompleted);

        const savedApplicants = localStorage.getItem('hacksync_applicantData');
        if (savedApplicants) applicantData = JSON.parse(savedApplicants);
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
    }
}

function saveState() {
    try {
        localStorage.setItem('hacksync_rankingData', JSON.stringify(rankingData));
        localStorage.setItem('hacksync_judgePendingTeams', JSON.stringify(judgePendingTeams));
        localStorage.setItem('hacksync_judgeCompletedTeams', JSON.stringify(judgeCompletedTeams));
        localStorage.setItem('hacksync_applicantData', JSON.stringify(applicantData));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

// 초기 데이터 로드 (스크립트 로드 시 즉시 실행되어 DOMContentLoaded 이벤트 핸들러에서 렌더링될 때 반영됨)
loadState();

document.addEventListener('DOMContentLoaded', renderJudgeDashboards);

// =============================================================
// 13. 인증 폼 및 액션 핸들러
// =============================================================
function toggleAuthMode(e, mode) {
    if (e) e.preventDefault();
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const subtitle = document.getElementById('auth-subtitle');

    if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        subtitle.innerText = '새로운 계정을 생성하세요';
    } else {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        subtitle.innerText = '계정에 로그인하세요';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;

    const user = hacksync_users.find(u => u.email === email && u.pw === pw);
    if (user) {
        currentUser = user;
        localStorage.setItem('hacksync_currentUser', JSON.stringify(currentUser));
        updateNavUI();
        showToast(`${user.name}님 환영합니다!`, 'success');
        
        // 역할에 따라 리다이렉트
        if (user.role === 'admin') window.location.hash = '#dashboard';
        else if (user.role === 'judge') window.location.hash = '#judge';
        else window.location.hash = '#team';
    } else {
        showToast('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const role = document.getElementById('signup-role').value;
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const pw = document.getElementById('signup-pw').value;

    if (hacksync_users.some(u => u.email === email)) {
        showToast('이미 존재하는 이메일입니다.', 'error');
        return;
    }

    const newUser = { email, pw, name, role };
    hacksync_users.push(newUser);
    localStorage.setItem('hacksync_users', JSON.stringify(hacksync_users));
    
    showToast('회원가입이 완료되었습니다. 로그인해 주세요.', 'success');
    toggleAuthMode(null, 'login');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('hacksync_currentUser');
    updateNavUI();
    window.location.hash = '#home';
}


// =============================================================
// 14. CSV 내보내기
// =============================================================
function exportCSV() {
    const headers = ['이름', '이메일', '직무', '팀', '지원일', '상태'];
    const rows = applicantData.map(a => [a.name, a.email, a.role, a.team, a.date, statusLabels[a.status].label]);

    // BOM for Korean encoding support
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HackSync_지원자_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('CSV 파일이 다운로드되었습니다.', 'success');
}


// =============================================================
// 15. 리포트 다운로드
// =============================================================
function downloadReport() {
    const totalApplicants = applicantData.length;
    const accepted = applicantData.filter(a => a.status === 'ACCEPTED').length;
    const rejected = applicantData.filter(a => a.status === 'REJECTED').length;
    const pending = applicantData.filter(a => a.status === 'PENDING').length;

    const roleDistribution = {};
    applicantData.forEach(a => {
        roleDistribution[a.role] = (roleDistribution[a.role] || 0) + 1;
    });

    const teamDistribution = {};
    applicantData.forEach(a => {
        teamDistribution[a.team] = (teamDistribution[a.team] || 0) + 1;
    });

    let report = `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
 HackSync 리포트 — 2025 글로벌 AI 해커톤
 생성일: ${new Date().toLocaleString('ko-KR')}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

■ 요약 통계
  총 지원자: ${totalApplicants}명
  합격: ${accepted}명 (${(accepted/totalApplicants*100).toFixed(1)}%)
  불합격: ${rejected}명 (${(rejected/totalApplicants*100).toFixed(1)}%)
  심사 대기: ${pending}명 (${(pending/totalApplicants*100).toFixed(1)}%)

■ 직무별 분포
`;
    Object.entries(roleDistribution).forEach(([role, count]) => {
        const bar = '\u2588'.repeat(Math.round(count / totalApplicants * 20));
        report += `  ${role.padEnd(10)} ${String(count).padStart(3)}명 ${bar}\n`;
    });

    report += `\n■ 팀별 현황\n`;
    Object.entries(teamDistribution).forEach(([team, count]) => {
        report += `  ${team.padEnd(16)} ${count}명\n`;
    });

    report += `\n■ 심사 랭킹 (상위)\n`;
    rankingData.slice(0, 5).forEach(r => {
        const total = ((r.creativity * 0.35) + (r.completeness * 0.40) + (r.presentation * 0.25)).toFixed(1);
        report += `  ${String(r.rank).padStart(2)}위  ${r.team.padEnd(16)} ${total}점 (심사위원 ${r.judges}/5명)\n`;
    });

    report += `\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
 © 2025 HackSync. All rights reserved.
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HackSync_리포트_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('리포트가 다운로드되었습니다.', 'success');
}


// =============================================================
// 16. 랭킹 갱신
// =============================================================
function refreshRanking() {
    // 버튼 로딩 상태 표시
    const btn = document.querySelector('[onclick="refreshRanking()"]');
    if (btn) {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" size="16" class="spin-icon"></i> 갱신 중...';
        lucide.createIcons({ root: btn });

        setTimeout(() => {
            // 랭킹 정렬
            rankingData.sort((a, b) => {
                const totalA = (a.creativity * 0.35) + (a.completeness * 0.40) + (a.presentation * 0.25);
                const totalB = (b.creativity * 0.35) + (b.completeness * 0.40) + (b.presentation * 0.25);
                return totalB - totalA;
            });
            rankingData.forEach((r, i) => r.rank = i + 1);

            // 리렌더링
            renderRankings();

            // 저장
            if (typeof saveState === 'function') saveState();

            // 테이블 행 하이라이트 애니메이션
            const rows = document.querySelectorAll('#ranking-tbody tr');
            rows.forEach((row, i) => {
                row.style.transition = 'background 0.4s ease';
                row.style.background = 'rgba(99, 102, 241, 0.12)';
                setTimeout(() => {
                    row.style.background = '';
                }, 600 + i * 100);
            });

            // 버튼 복원
            btn.innerHTML = originalText;
            btn.disabled = false;
            lucide.createIcons({ root: btn });

            showToast('랭킹이 최신 상태로 갱신되었습니다.', 'success');
        }, 500);
    } else {
        // 버튼 없이 직접 호출된 경우 (fallback)
        rankingData.sort((a, b) => {
            const totalA = (a.creativity * 0.35) + (a.completeness * 0.40) + (a.presentation * 0.25);
            const totalB = (b.creativity * 0.35) + (b.completeness * 0.40) + (b.presentation * 0.25);
            return totalB - totalA;
        });
        rankingData.forEach((r, i) => r.rank = i + 1);
        renderRankings();
        if (typeof saveState === 'function') saveState();
        showToast('랭킹이 최신 상태로 갱신되었습니다.', 'success');
    }
}


// =============================================================
// 17. 모달 공통 헬퍼
// =============================================================
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        removeTrapFocus(modal);
        restoreModalFocus();
    }
}

function openModal(id) {
    previouslyFocusedElement = document.activeElement;
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        trapFocusInModal(modal);
    }
    lucide.createIcons();
}


// =============================================================
// 18. 비밀번호 재설정
// =============================================================
let resetStep = 1;

function showPasswordResetModal(e) {
    if (e) e.preventDefault();
    resetStep = 1;
    const emailEl = document.getElementById('reset-email');
    const pwGroup = document.getElementById('reset-new-pw-group');
    const btn = document.getElementById('reset-pw-btn');
    if (emailEl) emailEl.value = '';
    if (pwGroup) pwGroup.style.display = 'none';
    if (btn) btn.innerText = '계정 확인';
    const newPw = document.getElementById('reset-new-pw');
    if (newPw) newPw.value = '';
    openModal('password-reset-modal');
}

function handlePasswordReset() {
    const email = document.getElementById('reset-email').value.trim();

    if (resetStep === 1) {
        if (!email) {
            showToast('이메일을 입력해 주세요.', 'error');
            return;
        }
        const user = hacksync_users.find(u => u.email === email);
        if (!user) {
            showToast('등록되지 않은 이메일입니다.', 'error');
            return;
        }
        document.getElementById('reset-new-pw-group').style.display = 'block';
        document.getElementById('reset-pw-btn').innerText = '비밀번호 변경';
        resetStep = 2;
        showToast('계정이 확인되었습니다. 새 비밀번호를 입력해 주세요.', 'info');
    } else if (resetStep === 2) {
        const newPw = document.getElementById('reset-new-pw').value.trim();
        if (!newPw || newPw.length < 4) {
            showToast('비밀번호는 4자리 이상이어야 합니다.', 'error');
            return;
        }
        const user = hacksync_users.find(u => u.email === email);
        if (user) {
            user.pw = newPw;
            localStorage.setItem('hacksync_users', JSON.stringify(hacksync_users));
            closeModal('password-reset-modal');
            showToast('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.', 'success');
        }
    }
}


// =============================================================
// 19. 알림 시스템
// =============================================================
let notifications = [];

function loadNotifications() {
    try {
        const saved = localStorage.getItem('hacksync_notifications');
        if (saved) notifications = JSON.parse(saved);
    } catch (e) { notifications = []; }
}

function saveNotifications() {
    localStorage.setItem('hacksync_notifications', JSON.stringify(notifications));
}

function addNotification(message, type = 'info') {
    notifications.unshift({
        id: Date.now(),
        message,
        type,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        read: false
    });
    if (notifications.length > 20) notifications.pop();
    saveNotifications();
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const count = document.getElementById('notif-count');
    if (!list || !count) return;

    const unread = notifications.filter(n => !n.read).length;
    if (unread > 0) {
        count.style.display = 'flex';
        count.innerText = unread > 9 ? '9+' : unread;
    } else {
        count.style.display = 'none';
    }

    if (notifications.length === 0) {
        list.innerHTML = '<li class="notif-empty">새로운 알림이 없습니다.</li>';
        return;
    }

    list.innerHTML = notifications.slice(0, 10).map(n => {
        const iconName = n.type === 'invite' ? 'user-plus' : n.type === 'success' ? 'check' : 'bell';
        const colorClass = n.type === 'invite' ? 'bg-purple' : n.type === 'success' ? 'bg-green' : 'bg-blue';
        return `
            <li class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
                <div class="notif-icon ${colorClass}">
                    <i data-lucide="${iconName}" size="14"></i>
                </div>
                <div class="notif-content">
                    <p class="text-sm">${n.message}</p>
                    <span class="text-gray" style="font-size: 0.7rem;">${n.time}</span>
                </div>
            </li>
        `;
    }).join('');

    lucide.createIcons();
}

function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('notif-dropdown');
    const bell = document.getElementById('notification-bell');
    if (dropdown) {
        const isShown = dropdown.classList.toggle('show');
        if (bell) bell.setAttribute('aria-expanded', isShown.toString());
    }
}

function markNotificationRead(id) {
    const n = notifications.find(notif => notif.id === id);
    if (n) n.read = true;
    saveNotifications();
    renderNotifications();
}

function clearAllNotifications(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    notifications.forEach(n => n.read = true);
    saveNotifications();
    renderNotifications();
    showToast('모든 알림을 읽음 처리했습니다.', 'info');
}

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notif-dropdown');
    if (bell && dropdown && !bell.contains(e.target)) {
        dropdown.classList.remove('show');
        bell.setAttribute('aria-expanded', 'false');
    }
});

// 알림벨 키보드 지원 (Enter/Space)
document.addEventListener('DOMContentLoaded', () => {
    const bell = document.getElementById('notification-bell');
    if (bell) {
        bell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNotifications(e);
            }
        });
    }
});

// Override handleInvite to also add notification
handleInvite = function(name) {
    addNotification(`${name}님에게 팀 초대 요청을 보냈습니다.`, 'invite');
    showToast(`${name}님에게 팀 초대 요청을 보냈습니다. 🎉`, 'success');
};

loadNotifications();
document.addEventListener('DOMContentLoaded', renderNotifications);


// =============================================================
// 20. 예약 발송
// =============================================================
function showScheduleModal() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('schedule-date');
    if (dateInput) dateInput.value = tomorrow.toISOString().slice(0, 10);
    openModal('schedule-modal');
}

function handleScheduleSend() {
    const date = document.getElementById('schedule-date').value;
    const time = document.getElementById('schedule-time').value;

    if (!date || !time) {
        showToast('날짜와 시간을 모두 설정해 주세요.', 'error');
        return;
    }

    const scheduledDate = new Date(`${date}T${time}`);
    const now = new Date();

    if (scheduledDate <= now) {
        showToast('예약 시간은 현재 시간 이후여야 합니다.', 'error');
        return;
    }

    const formattedDate = scheduledDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = scheduledDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    closeModal('schedule-modal');
    addNotification(`메시지가 ${formattedDate} ${formattedTime}에 발송 예약되었습니다.`, 'success');
    showToast(`${formattedDate} ${formattedTime}에 발송이 예약되었습니다.`, 'success');
}


// =============================================================
// 21. 문의하기
// =============================================================
function showContactModal() {
    // Reset form
    const fields = ['contact-name', 'contact-email', 'contact-org', 'contact-message'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    openModal('contact-modal');
}

function handleContactSubmit() {
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();

    if (!name || !email) {
        showToast('이름과 이메일은 필수 입력 항목입니다.', 'error');
        return;
    }

    closeModal('contact-modal');
    showToast('문의가 성공적으로 접수되었습니다. 영업일 기준 1-2일 내 답변드리겠습니다.', 'success');
    addNotification('문의가 접수되었습니다. 곧 담당자가 연락드립니다.', 'success');
}


// =============================================================
// 22. FAQ 토글
// =============================================================
function showFAQModal() {
    openModal('faq-modal');
}

function toggleFAQ(item) {
    // Close all other FAQ items
    const parent = item.parentElement;
    parent.querySelectorAll('.faq-item').forEach(other => {
        if (other !== item) {
            other.classList.remove('open');
            const q = other.querySelector('.faq-question');
            if (q) q.setAttribute('aria-expanded', 'false');
        }
    });
    const isOpen = item.classList.toggle('open');
    const question = item.querySelector('.faq-question');
    if (question) question.setAttribute('aria-expanded', isOpen.toString());
}

// FAQ 키보드 접근성
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFAQ(item);
                }
            });
        }
    });
});


// =============================================================
// 23. 결제 처리 (Mock)
// =============================================================
function handlePayment(plan) {
    if (!currentUser) {
        showToast('결제하려면 먼저 로그인해 주세요.', 'error');
        location.hash = '#auth';
        return;
    }

    const planName = plan === 'pro' ? 'Pro' : 'Enterprise';
    showToast(`${planName} 플랜이 활성화되었습니다! 🎉 (데모 모드)`, 'success');
    addNotification(`${planName} 플랜 구독이 시작되었습니다.`, 'success');
}


// =============================================================
// 24. 프로젝트 링크 핸들러 (심사위원 모달)
// =============================================================
function handleProjectLink(e, type) {
    e.preventDefault();
    const teamName = document.getElementById('score-team-name').innerText;
    const messages = {
        pdf: `${teamName}의 발표자료(PDF)를 불러오는 중입니다...`,
        github: `${teamName}의 GitHub 저장소를 여는 중입니다...`,
        video: `${teamName}의 시연 영상을 준비하는 중입니다...`
    };
    showToast(messages[type] || '링크를 여는 중입니다...', 'info');
}


// =============================================================
// 25. CRM 채널 분기 로직
// =============================================================
const crmTemplates = {
    email: `안녕하세요, {name}님.

2025 글로벌 AI 해커톤에 지원해 주셔서 감사합니다.
심사 결과, 귀하는 {result} 되었습니다.

자세한 사항은 HackSync 대시보드에서 확인해 주세요.

감사합니다.
HackSync 운영팀 드림`,
    kakao: `[HackSync] 2025 글로벌 AI 해커톤
{name}님, 심사 결과: {result}
▶ 자세히 보기: hacksync.io/result`
};

function initCRMChannelToggle() {
    document.querySelectorAll('.channel-btn[data-channel]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.channel-btn[data-channel]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const channel = btn.dataset.channel;
            const textarea = btn.closest('.crm-compose').querySelector('.form-textarea');
            if (textarea && crmTemplates[channel]) {
                textarea.value = crmTemplates[channel];
            }

            // Update subject field visibility for kakao
            const subjectGroup = btn.closest('.crm-compose').querySelector('.form-input[type="text"]');
            if (subjectGroup) {
                subjectGroup.closest('.form-group').style.display = channel === 'kakao' ? 'none' : 'block';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initCRMChannelToggle);


// =============================================================
// 26. 내 프로필 관리
// =============================================================
let profileSkills = [];

function loadProfile() {
    if (!currentUser) return;

    const key = `hacksync_profile_${currentUser.email}`;
    let profile = null;
    try {
        const saved = localStorage.getItem(key);
        if (saved) profile = JSON.parse(saved);
    } catch (e) { profile = null; }

    const nameInput = document.getElementById('profile-name');
    const roleSelect = document.getElementById('profile-role');
    const bioInput = document.getElementById('profile-bio');
    const githubInput = document.getElementById('profile-github');
    const portfolioInput = document.getElementById('profile-portfolio');
    const avatarPreview = document.getElementById('profile-avatar-preview');

    if (profile) {
        if (nameInput) nameInput.value = profile.name || '';
        if (roleSelect) roleSelect.value = profile.role || 'Frontend';
        if (bioInput) bioInput.value = profile.bio || '';
        if (githubInput) githubInput.value = profile.github || '';
        if (portfolioInput) portfolioInput.value = profile.portfolio || '';
        if (avatarPreview && profile.avatar) avatarPreview.src = profile.avatar;
        profileSkills = profile.skills || [];
    } else {
        // 기본값: 현재 로그인 사용자 이름
        if (nameInput) nameInput.value = currentUser.name || '';
        profileSkills = [];
    }

    renderProfileSkills();
    updateProfilePreview();
    updateProfileCompleteness();
}

function saveProfile() {
    if (!currentUser) {
        showToast('로그인이 필요합니다.', 'error');
        return;
    }

    const name = (document.getElementById('profile-name').value || '').trim();
    const role = (document.getElementById('profile-role').value || 'Frontend');
    const bio = (document.getElementById('profile-bio').value || '').trim();
    const github = (document.getElementById('profile-github').value || '').trim();
    const portfolio = (document.getElementById('profile-portfolio').value || '').trim();
    const avatar = document.getElementById('profile-avatar-preview').src;

    if (!name) {
        showToast('이름은 필수 입력 항목입니다.', 'error');
        return;
    }

    const profile = { name, role, bio, github, portfolio, avatar, skills: profileSkills };
    const key = `hacksync_profile_${currentUser.email}`;
    localStorage.setItem(key, JSON.stringify(profile));

    // 팀빌딩 참가자 목록에 즉시 반영
    syncProfileToParticipants(profile, currentUser.email);

    // 날짜 표시
    const statusEl = document.getElementById('profile-save-status');
    if (statusEl) {
        statusEl.innerText = `✓ 마지막 저장: ${new Date().toLocaleTimeString('ko-KR')}`;
    }

    showToast('프로필이 저장되었습니다! 팀빌딩 페이지에 반영됩니다.', 'success');
    addNotification('프로필이 업데이트되었습니다.', 'success');
    updateProfileCompleteness();
}


// --- 아바타 선택 ---
function selectAvatar(imgEl) {
    const preview = document.getElementById('profile-avatar-preview');
    const previewCard = document.getElementById('preview-avatar');
    if (preview) preview.src = imgEl.src;
    if (previewCard) previewCard.src = imgEl.src;

    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    imgEl.classList.add('selected');
}


// --- 스킬 태그 관리 ---
function addSkillTag(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (profileSkills.includes(trimmed)) {
        showToast(`'${trimmed}' 스킬이 이미 추가되어 있습니다.`, 'info');
        return;
    }
    if (profileSkills.length >= 8) {
        showToast('스킬은 최대 8개까지 추가할 수 있습니다.', 'error');
        return;
    }
    profileSkills.push(trimmed);
    renderProfileSkills();
    updateProfilePreview();
    updateProfileCompleteness();
}

function removeSkillTag(skill) {
    profileSkills = profileSkills.filter(s => s !== skill);
    renderProfileSkills();
    updateProfilePreview();
    updateProfileCompleteness();
}

function handleSkillInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addSkillFromInput();
    }
}

function addSkillFromInput() {
    const input = document.getElementById('profile-skill-input');
    if (input && input.value.trim()) {
        addSkillTag(input.value);
        input.value = '';
        input.focus();
    }
}

function renderProfileSkills() {
    const container = document.getElementById('profile-skills-display');
    if (!container) return;

    if (profileSkills.length === 0) {
        container.innerHTML = '<span class="text-gray text-sm">아직 추가된 스킬이 없습니다.</span>';
        return;
    }

    container.innerHTML = profileSkills.map(skill => `
        <span class="skill-tag-editable">
            ${skill}
            <button class="skill-remove" onclick="removeSkillTag('${skill}')">×</button>
        </span>
    `).join('');
}


// --- 라이브 미리보기 ---
function updateProfilePreview() {
    const name = (document.getElementById('profile-name')?.value || '').trim();
    const role = document.getElementById('profile-role')?.value || 'Frontend';
    const bio = (document.getElementById('profile-bio')?.value || '').trim();

    const roleLabels = {
        Frontend: 'Frontend Developer',
        Backend: 'Backend Developer',
        AI: 'AI / Data Scientist',
        Design: 'Designer (UI/UX)',
        PM: 'PM / 기획자'
    };

    const previewName = document.getElementById('preview-name');
    const previewRole = document.getElementById('preview-role');
    const previewBio = document.getElementById('preview-bio');
    const previewSkills = document.getElementById('preview-skills');

    if (previewName) previewName.innerText = name || '이름을 입력하세요';
    if (previewRole) previewRole.innerText = roleLabels[role] || role;
    if (previewBio) previewBio.innerText = bio || '자기소개를 작성하면 여기에 표시됩니다.';

    if (previewSkills) {
        if (profileSkills.length > 0) {
            previewSkills.innerHTML = profileSkills.map(s => `<span class="skill-tag">${s}</span>`).join('');
        } else {
            previewSkills.innerHTML = '<span class="skill-tag">스킬을 추가해 주세요</span>';
        }
    }

    updateProfileCompleteness();
}


// --- 프로필 완성도 ---
function updateProfileCompleteness() {
    const checks = [
        { label: '이름 입력', done: !!(document.getElementById('profile-name')?.value?.trim()) },
        { label: '직무 선택', done: true },
        { label: '자기소개 작성', done: !!(document.getElementById('profile-bio')?.value?.trim()) },
        { label: '스킬 1개 이상 등록', done: profileSkills.length > 0 },
        { label: 'GitHub URL 등록', done: !!(document.getElementById('profile-github')?.value?.trim()) },
    ];

    const done = checks.filter(c => c.done).length;
    const total = checks.length;
    const pct = Math.round((done / total) * 100);

    const fill = document.getElementById('profile-progress-fill');
    const text = document.getElementById('profile-progress-text');
    const list = document.getElementById('profile-checklist');

    if (fill) fill.style.width = pct + '%';
    if (text) text.innerText = `${pct}% 완성 (${done}/${total})`;
    if (list) {
        list.innerHTML = checks.map(c => `
            <li class="${c.done ? 'done' : ''}">
                <i data-lucide="${c.done ? 'check-circle' : 'circle'}" size="14"></i>
                ${c.label}
            </li>
        `).join('');
        lucide.createIcons({ root: list });
    }

    // 매칭률 미리보기
    const matchEl = document.getElementById('preview-match');
    if (matchEl) {
        matchEl.innerText = pct >= 80 ? '92% 매칭' : pct >= 60 ? '78% 매칭' : pct >= 40 ? '65% 매칭' : '- % 매칭';
    }
}


// 프로필 페이지 진입 시 로드
const _origHandleRouting = handleRouting;
handleRouting = function() {
    _origHandleRouting();
    const hash = window.location.hash || '#home';
    if (hash === '#profile' && currentUser) {
        loadProfile();
    }
};

