document.addEventListener('DOMContentLoaded', () => {
    initializeCommonFeatures();

    // Add smooth scroll for tip items
    document.querySelectorAll('.material-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.add('highlight');
            setTimeout(() => item.classList.remove('highlight'), 1000);
        });
    });

    // Add hover animations
    const materialItems = document.querySelectorAll('.material-item');
    materialItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-5px)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
        });
    });
});