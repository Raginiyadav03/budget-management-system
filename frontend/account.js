const API_URL = 'https://budget-management-api-tqch.onrender.com/api';

// Get user ID
function getUserId() {
    return localStorage.getItem('userId');
}

// Check if user is authenticated
function checkAuth() {
    const userId = getUserId();
    if (!userId) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// DOM elements
const loadingSpinner = document.getElementById('loadingSpinner');

// Loading functions
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('show');
    }
}

function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.remove('show');
    }
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    updateThemeIcon(savedTheme);
}

window.toggleTheme = function() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
};

function updateThemeIcon(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Load user profile
async function loadUserProfile() {
    showLoading();
    try {
        const userId = getUserId();
        const response = await fetch(`${API_URL}/user/profile?userId=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 400 || response.status === 401) {
            hideLoading();
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            displayUserProfile(data.user);
            hideLoading();
        } else {
            hideLoading();
            console.error('Failed to load user profile');
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading user profile:', error);
    }
}

// Display user profile
function displayUserProfile(user) {
    // Profile information
    document.getElementById('userName').textContent = user.name || '-';
    document.getElementById('userEmail').textContent = user.email || '-';
    
    if (user.createdAt) {
        document.getElementById('memberSince').textContent = formatDate(user.createdAt);
    } else {
        document.getElementById('memberSince').textContent = '-';
    }
    
    // Statistics
    document.getElementById('statTotalIncome').textContent = `₹${(user.totalIncome || 0).toFixed(2)}`;
    document.getElementById('statTotalExpense').textContent = `₹${(user.totalExpense || 0).toFixed(2)}`;
    
    const totalBalance = user.totalBalance || 0;
    const balanceElement = document.getElementById('statTotalBalance');
    balanceElement.textContent = `₹${totalBalance.toFixed(2)}`;
    balanceElement.style.color = totalBalance >= 0 ? '#28a745' : '#dc3545';
    
    // Saving status
    const savingStatus = user.savingStatus || { status: 'No Data', color: '#6c757d' };
    const statusElement = document.getElementById('statSavingStatus');
    statusElement.textContent = savingStatus.status || '-';
    statusElement.style.color = savingStatus.color || '#667eea';
}

// Handle logout
window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    
    // Initialize theme
    initializeTheme();
    
    // Load user profile
    loadUserProfile();
});
