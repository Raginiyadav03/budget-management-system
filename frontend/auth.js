// API base URL - automatically detects environment
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://budget-management-api-tqch.onrender.com/api';

// Check if we're on login or register page
const isLoginPage = window.location.pathname.includes('login.html') || 
                    (window.location.pathname.endsWith('/') && !window.location.pathname.includes('register.html'));
const isRegisterPage = window.location.pathname.includes('register.html');

// Loading functions
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('show');
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('show');
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.background = '#efe';
        errorDiv.style.color = '#3c3';
        errorDiv.style.borderLeftColor = '#3c3';
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
            errorDiv.style.background = '';
            errorDiv.style.color = '';
            errorDiv.style.borderLeftColor = '';
        }, 3000);
    }
}

// Handle login form submission
if (isLoginPage) {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            // Clear previous errors
            const errorDiv = document.getElementById('errorMessage');
            if (errorDiv) {
                errorDiv.classList.remove('show');
            }
            
            showLoading();
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store user info in localStorage
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('userId', data.user.id);
                    
                    // Redirect to main page
                    window.location.href = 'index.html';
                } else {
                    hideLoading();
                    showError(data.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                hideLoading();
                console.error('Login error:', error);
                showError('Network error. Please check your connection and try again.');
            }
        });
    }
}

// Handle register form submission
if (isRegisterPage) {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Clear previous errors
            const errorDiv = document.getElementById('errorMessage');
            if (errorDiv) {
                errorDiv.classList.remove('show');
            }
            
            // Client-side validation
            if (password !== confirmPassword) {
                showError('Passwords do not match!');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long!');
                return;
            }
            
            showLoading();
            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store user info in localStorage
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('userId', data.user.id);
                    
                    hideLoading();
                    showSuccess('Registration successful! Redirecting to home page...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    hideLoading();
                    showError(data.error || 'Registration failed. Please try again.');
                }
            } catch (error) {
                hideLoading();
                console.error('Registration error:', error);
                showError('Network error. Please check your connection and try again.');
            }
        });
    }
}

// Check if user is already logged in
function checkAuth() {
    const userId = localStorage.getItem('userId');
    if (userId && (isLoginPage || isRegisterPage)) {
        // If user is logged in and on auth pages, redirect to main page
        window.location.href = 'index.html';
    }
}

// Run check on page load
checkAuth();

// Toggle password visibility
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '🙈';
        toggle.classList.add('active');
    } else {
        input.type = 'password';
        toggle.textContent = '👁️';
        toggle.classList.remove('active');
    }
};
