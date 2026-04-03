// Initialize Lucide Icons
lucide.createIcons();

// --- 1. SPA Routing Logic ---
const sections = document.querySelectorAll('.page-section');
const navLinks = document.querySelectorAll('.nav-links a');

function handleRouting() {
    let hash = window.location.hash || '#home';
    
    // Update active section
    sections.forEach(sec => {
        sec.classList.remove('active');
        if ('#' + sec.id === hash) {
            sec.classList.add('active');
        }
    });

    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        }
    });

    // Re-render chart if dashboard is active to prevent size issues
    if (hash === '#dashboard' && roleChartInstance) {
        // slight delay to let DOM render
        setTimeout(() => roleChartInstance.resize(), 100);
    }
}

window.addEventListener('hashchange', handleRouting);
// Initial load
document.addEventListener('DOMContentLoaded', handleRouting);


// --- 2. Chart.js for Dashboard ---
let roleChartInstance = null;

function initChart() {
    const ctx = document.getElementById('roleChart').getContext('2d');
    
    // Gradient for bars
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
            },
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
document.addEventListener('DOMContentLoaded', initChart);


// --- 3. Team Building Participant Mock Data ---
const participants = [
    { name: '이현우', role: 'Frontend', skills: ['React', 'TypeScript', 'Next.js'], avatar: 'https://i.pravatar.cc/150?u=1', github: true },
    { name: '박지성', role: 'Backend', skills: ['Spring Boot', 'Java', 'MySQL'], avatar: 'https://i.pravatar.cc/150?u=2', github: true },
    { name: '김데이터', role: 'AI', skills: ['Python', 'PyTorch', 'FastAPI'], avatar: 'https://i.pravatar.cc/150?u=3', github: true },
    { name: '최디자인', role: 'Design', skills: ['Figma', 'Protopie', 'UX/UI'], avatar: 'https://i.pravatar.cc/150?u=4', github: false },
    { name: '정해인', role: 'Frontend', skills: ['Vue.js', 'SCSS', 'Zustand'], avatar: 'https://i.pravatar.cc/150?u=5', github: true },
    { name: '강동원', role: 'Backend', skills: ['Node.js', 'NestJS', 'Docker'], avatar: 'https://i.pravatar.cc/150?u=6', github: true },
];

const gridEl = document.getElementById('participant-grid');

function renderParticipants(filter = 'all') {
    gridEl.innerHTML = '';
    
    const filtered = filter === 'all' 
        ? participants 
        : participants.filter(p => p.role === filter);

    if(filtered.length === 0) {
        gridEl.innerHTML = '<p class="text-gray" style="grid-column: 1/-1; text-align:center; padding: 3rem;">조건에 맞는 참가자가 없습니다.</p>';
        return;
    }

    filtered.forEach(p => {
        const skillsHtml = p.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
        
        const card = document.createElement('div');
        card.className = 'part-card glass';
        card.innerHTML = `
            <div class="part-header">
                <img src="${p.avatar}" alt="${p.name}" class="avatar">
                <div>
                    <h4 class="part-name">${p.name}</h4>
                    <span class="part-role">${p.role} Developer</span>
                </div>
            </div>
            <div class="part-skills">
                ${skillsHtml}
            </div>
            <div class="part-links">
                <a href="#" onclick="event.preventDefault()"><i data-lucide="folder-git2" size="16"></i> ${p.github ? 'Github' : 'Notion'} </a>
                <a href="#" class="btn-invite" onclick="event.preventDefault(); alert('${p.name}님에게 팀 초대 요청을 보냈습니다.');"><i data-lucide="user-plus" size="16"></i> 영입하기</a>
            </div>
        `;
        gridEl.appendChild(card);
    });

    // Re-initialize icons for newly added DOM elements
    lucide.createIcons();
}

// Filter button logic
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active from all
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        // Add to clicked
        e.target.classList.add('active');
        // Render
        renderParticipants(e.target.dataset.filter);
    });
});

// Initial render
document.addEventListener('DOMContentLoaded', () => renderParticipants());
