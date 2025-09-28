// js/tips.js
import { auth } from './firebaseInit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Display logged-in user email
    const userEmailSpan = document.getElementById('userEmail');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userEmailSpan.textContent = user.email;
        } else {
            window.location.href = "login.html";
        }
    });

    // Smooth click highlight for material items
    document.querySelectorAll('.material-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.add('highlight');
            setTimeout(() => item.classList.remove('highlight'), 1000);
        });

        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-5px)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
        });
    });

    // Optionally, display total items recycled if you have that logic
    if (typeof displayItemsRecycled === 'function') {
        displayItemsRecycled();
    }
});
