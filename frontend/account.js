// API base URL - automatically detects environment
const API_URL = 'https://budget-management-api-tqch.onrender.com/api'

// Get user ID
function getUserId() {
    return localStorage.getItem('userId');
}

// Get headers with user ID
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json'
    };
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
const alertPopup = document.getElementById('alertPopup');
const confirmPopup = document.getElementById('confirmPopup');
const alertMessage = document.getElementById('alertMessage');
const confirmMessage = document.getElementById('confirmMessage');

// Popup state
let confirmCallback = null;

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
    const userNameElement = document.getElementById('userName');
    userNameElement.textContent = user.name || '-';
    userNameElement.contentEditable = 'false';
    userNameElement.classList.remove('editing');
    
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
    
    // Reset edit buttons visibility
    const editBtn = document.getElementById('editNameBtn');
    const saveBtn = document.getElementById('saveNameBtn');
    const cancelBtn = document.getElementById('cancelNameBtn');
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

// Store original name for cancel functionality
let originalName = '';

// Custom alert function
function showAlert(message) {
    if (alertMessage && alertPopup) {
        alertMessage.textContent = message;
        alertPopup.classList.add('show');
    }
}

window.closeAlert = function() {
    if (alertPopup) {
        alertPopup.classList.remove('show');
    }
};

// Custom confirm function
function showConfirm(message, callback) {
    if (confirmMessage && confirmPopup) {
        confirmMessage.textContent = message;
        confirmCallback = callback;
        confirmPopup.classList.add('show');
    }
}

window.closeConfirm = function(result) {
    if (confirmPopup) {
        confirmPopup.classList.remove('show');
        if (confirmCallback) {
            confirmCallback(result);
            confirmCallback = null;
        }
    }
};

// Close popups when clicking outside
document.addEventListener('click', (event) => {
    if (alertPopup && event.target === alertPopup) {
        closeAlert();
    }
    if (confirmPopup && event.target === confirmPopup) {
        closeConfirm(false);
    }
});

// Edit user name
window.editUserName = function() {
    const userNameElement = document.getElementById('userName');
    const editBtn = document.getElementById('editNameBtn');
    const saveBtn = document.getElementById('saveNameBtn');
    const cancelBtn = document.getElementById('cancelNameBtn');
    
    if (!userNameElement || !editBtn || !saveBtn || !cancelBtn) {
        console.error("Required elements not found.");
        return;
    }
    
    // Store original name
    originalName = userNameElement.textContent.trim();
    
    // Make editable
    userNameElement.contentEditable = 'true';
    userNameElement.classList.add('editing');
    userNameElement.focus();
    
    // Select all text for easy editing
    const range = document.createRange();
    range.selectNodeContents(userNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Toggle buttons
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-flex';
    cancelBtn.style.display = 'inline-flex';
};

// Cancel editing
window.cancelEditName = function() {
    const userNameElement = document.getElementById('userName');
    const editBtn = document.getElementById('editNameBtn');
    const saveBtn = document.getElementById('saveNameBtn');
    const cancelBtn = document.getElementById('cancelNameBtn');
    
    if (!userNameElement) return;
    
    // Restore original name
    userNameElement.textContent = originalName;
    userNameElement.contentEditable = 'false';
    userNameElement.classList.remove('editing');
    
    // Toggle buttons
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
};

// Save user name
window.saveUserName = async function() {
    const userNameElement = document.getElementById('userName');
    const name = userNameElement.textContent.trim();
    
    // Validation
    if (!name || name.length === 0) {
        showAlert('Name cannot be empty!');
        userNameElement.focus();
        return;
    }
    
    if (name === originalName) {
        // No changes, just cancel edit mode
        window.cancelEditName();
        return;
    }
    
    const userId = getUserId();
    if (!userId) {
        showAlert('User session expired. Please login again.');
        window.location.href = 'login.html';
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/user/profile?userId=${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, userId })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update display with new data - backend returns user object directly
            const userData = {
                id: data.id,
                name: data.name,
                email: data.email,
                totalIncome: data.totalIncome,
                totalExpense: data.totalExpense,
                totalBalance: data.totalBalance,
                savingStatus: data.savingStatus,
                createdAt: data.createdAt
            };
            displayUserProfile(userData);
            // Update localStorage if user object exists
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.name = data.name;
                localStorage.setItem('user', JSON.stringify(user));
            }
            hideLoading();
            showAlert('Name updated successfully!');
        } else {
            hideLoading();
            let errorData = { error: 'Failed to update user name. Please try again.' };
            try {
                errorData = await response.json();
            } catch (e) {}
            showAlert(errorData.error || 'Failed to update user name. Please try again.');
            // Restore original name on error
            userNameElement.textContent = originalName;
            window.cancelEditName();
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating name:', error);
        showAlert('Error connecting to server. Please make sure the backend is running.');
        // Restore original name on error
        userNameElement.textContent = originalName;
        window.cancelEditName();
    }
};

// Handle logout
window.handleLogout = function() {
    showConfirm('Are you sure you want to logout?', () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
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
