const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzqaIL47t4kDY3EDUwYy-O0E5jJRfkVEeeHim4yGx9gQb6wJNkt7fjEnEAfJnsd-Qu3Q/exec'; // <-- IMPORTANT: Use your new deployment URL

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const passwordHash = await hashPassword(password);

            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', email);
            formData.append('passwordHash', passwordHash);

            try {
                const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData });
                const result = await response.json();

                if (result.success) {
                    // Store user data in sessionStorage
                    sessionStorage.setItem('loggedInUser', JSON.stringify(result.user));
                    window.location.href = 'index.html';
                } else {
                    alert('Login failed: ' + result.message);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login.');
            }
        });
    }
});
