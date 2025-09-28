import Chart from 'chart.js/auto';

// Initialize impact chart
function initImpactChart() {
    const ctx = document.getElementById('impactChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Items Recycled',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#4CAF50',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update achievements progress
function updateAchievements() {
    const achievements = document.querySelectorAll('.achievement');
    achievements.forEach(achievement => {
        const count = parseInt(achievement.dataset.count);
        const progress = Math.min((count / 100) * 100, 100);
        achievement.querySelector('.progress').style.width = `${progress}%`;
    });
}

// Animate impact numbers
function animateNumbers() {
    const elements = document.querySelectorAll('.impact-value');
    elements.forEach(element => {
        const target = parseInt(element.getAttribute('data-target'));
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 10);
    });
}

// Initialize dashboard features
document.addEventListener('DOMContentLoaded', () => {
    initImpactChart();
    updateAchievements();
    animateNumbers();

    // Event listeners for quick action buttons
    document.getElementById('scrollToCameraBtn').addEventListener('click', () => {
        window.location.href = 'scan.html';
    });

    document.getElementById('viewHistoryBtn').addEventListener('click', () => {
        window.location.href = 'history.html';
    });
});