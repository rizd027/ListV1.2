// Countdown and Redirect Logic
let seconds = 10;
const countdownEl = document.getElementById('countdown');
const targetUrl = 'https://list-v.vercel.app/dashboard.html';

const timer = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;

    if (seconds <= 0) {
        clearInterval(timer);
        window.location.href = targetUrl;
    }
}, 1000);

// Simple interaction: make the block "look" at the mouse
document.addEventListener('mousemove', (e) => {
    const block = document.querySelector('.walking-block');
    if (!block) return;

    const rect = block.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const distance = Math.min(5, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 50);

    const eyes = document.querySelectorAll('.eye');
    eyes.forEach(eye => {
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;
        eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});
