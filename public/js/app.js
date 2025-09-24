document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.getElementById('getStartedBtn');
    const learnMoreBtn = document.getElementById('learnMoreBtn');

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            getStartedBtn.classList.add('loading');
            
            // Simulate loading state
            await new Promise(resolve => setTimeout(resolve, 800));
            
            window.location.href = './signup.html';
        });
    }

    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Smooth scroll to features section
            const featuresSection = document.querySelector('.feature-grid');
            if (featuresSection) {
                featuresSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            
            // Add pulse animation to features
            document.querySelectorAll('.feature-card').forEach((card, index) => {
                setTimeout(() => {
                    card.style.animation = 'pulse 0.5s ease';
                }, index * 100);
            });
        });
    }

    // Remove animation classes after they complete
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('animationend', () => {
            card.style.animation = '';
        });
    });
});