// API base URL - automatically detects environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://budget-management-api-tqch.onrender.com/api';

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
const alertPopup = document.getElementById('alertPopup');
const alertMessage = document.getElementById('alertMessage');

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

// Close popup when clicking outside
document.addEventListener('click', (event) => {
    if (alertPopup && event.target === alertPopup) {
        closeAlert();
    }
});

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

// Monthly Comparison Functions
// Initialize month and year selectors for both months
function initializeMonthYearSelector() {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const lastMonth = new Date(currentYear, now.getMonth() - 1, 1);
    const lastMonthNum = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const lastMonthYear = lastMonth.getFullYear();
    
    // Initialize Month 1 (current month)
    const month1Select = document.getElementById('month1Select');
    const year1Select = document.getElementById('year1Select');
    if (month1Select && year1Select) {
        month1Select.value = currentMonth;
        populateYearSelector(year1Select, currentYear, currentYear);
        year1Select.value = currentYear;
        updateMonthSelector('month1');
    }
    
    // Initialize Month 2 (previous month)
    const month2Select = document.getElementById('month2Select');
    const year2Select = document.getElementById('year2Select');
    if (month2Select && year2Select) {
        month2Select.value = lastMonthNum;
        populateYearSelector(year2Select, currentYear, lastMonthYear);
        year2Select.value = lastMonthYear;
        updateMonthSelector('month2');
    }
}

// Populate year selector
function populateYearSelector(yearSelect, currentYear, defaultYear) {
    yearSelect.innerHTML = '';
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === defaultYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

// Update month selector to disable future months
function updateMonthSelector(selectorId) {
    const monthSelect = document.getElementById(`${selectorId}Select`);
    const yearSelect = document.getElementById(`${selectorId.replace('month', 'year')}Select`);
    
    if (!monthSelect || !yearSelect) return;
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const selectedYear = parseInt(yearSelect.value);
    
    // Enable/disable months based on selected year
    Array.from(monthSelect.options).forEach((option, index) => {
        const monthNumber = index + 1;
        if (selectedYear === currentYear && monthNumber > currentMonth) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    });
    
    // If selected month is disabled, reset to current month
    if (selectedYear === currentYear) {
        const selectedMonth = parseInt(monthSelect.value);
        if (selectedMonth > currentMonth) {
            monthSelect.value = String(currentMonth).padStart(2, '0');
        }
    }
}

// Load monthly comparison data
async function loadMonthlyComparison() {
    const month1Select = document.getElementById('month1Select');
    const year1Select = document.getElementById('year1Select');
    const month2Select = document.getElementById('month2Select');
    const year2Select = document.getElementById('year2Select');
    
    if (!month1Select || !year1Select || !month2Select || !year2Select) return;
    
    const month1 = month1Select.value;
    const year1 = year1Select.value;
    const month2 = month2Select.value;
    const year2 = year2Select.value;
    
    if (!month1 || !year1 || !month2 || !year2) {
        showAlert('Please select both months to compare.');
        return;
    }
    
    // Check if both months are the same
    if (month1 === month2 && year1 === year2) {
        showAlert('Please select two different months to compare.');
        return;
    }
    
    showLoading();
    try {
        // Get both months data in a single request
        const response = await fetch(
            `${API_URL}/transactions/monthly/compare?userId=${getUserId()}&month1=${month1}&year1=${year1}&month2=${month2}&year2=${year2}`
        );
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to fetch comparison data`);
        }
        
        const comparisonData = await response.json();
        
        // Display the data
        displayMonthlyComparison(comparisonData.month1, comparisonData.month2, month1, year1, month2, year2);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading monthly comparison:', error);
        let errorMessage = 'Failed to load monthly comparison. Please try again.';
        
        // Try to get more detailed error message
        if (error.message) {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage);
    }
}

// Display monthly comparison
function displayMonthlyComparison(month1Data, month2Data, month1, year1, month2, year2) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Update labels
    document.getElementById('month1Label').textContent = 
        `${monthNames[parseInt(month1) - 1]} ${year1}`;
    document.getElementById('month2Label').textContent = 
        `${monthNames[parseInt(month2) - 1]} ${year2}`;
    
    // Update month 1 stats
    document.getElementById('month1Income').textContent = 
        `₹${(month1Data.income || 0).toFixed(2)}`;
    document.getElementById('month1Expense').textContent = 
        `₹${(month1Data.expense || 0).toFixed(2)}`;
    
    const month1Balance = month1Data.balance || 0;
    const month1BalanceEl = document.getElementById('month1Balance');
    month1BalanceEl.textContent = `₹${month1Balance.toFixed(2)}`;
    month1BalanceEl.style.color = month1Balance >= 0 ? '#28a745' : '#dc3545';
    
    // Update month 2 stats
    document.getElementById('month2Income').textContent = 
        `₹${(month2Data.income || 0).toFixed(2)}`;
    document.getElementById('month2Expense').textContent = 
        `₹${(month2Data.expense || 0).toFixed(2)}`;
    
    const month2Balance = month2Data.balance || 0;
    const month2BalanceEl = document.getElementById('month2Balance');
    month2BalanceEl.textContent = `₹${month2Balance.toFixed(2)}`;
    month2BalanceEl.style.color = month2Balance >= 0 ? '#28a745' : '#dc3545';
    
    // Update summary
    updateComparisonSummary(month1Data, month2Data);
}

// Update comparison summary
function updateComparisonSummary(month1, month2) {
    const summaryEl = document.getElementById('comparisonSummary');
    if (!summaryEl) return;
    
    const incomeDiff = (month1.income || 0) - (month2.income || 0);
    const expenseDiff = (month1.expense || 0) - (month2.expense || 0);
    const balanceDiff = (month1.balance || 0) - (month2.balance || 0);
    
    let summaryHTML = '<div class="summary-items">';
    
    // Income comparison
    if (incomeDiff > 0) {
        summaryHTML += `<div class="summary-item positive">
            <span class="summary-label">Income:</span>
            <span class="summary-value">+₹${incomeDiff.toFixed(2)}</span>
        </div>`;
    } else if (incomeDiff < 0) {
        summaryHTML += `<div class="summary-item negative">
            <span class="summary-label">Income:</span>
            <span class="summary-value">₹${incomeDiff.toFixed(2)}</span>
        </div>`;
    } else {
        summaryHTML += `<div class="summary-item neutral">
            <span class="summary-label">Income:</span>
            <span class="summary-value">No change</span>
        </div>`;
    }
    
    // Expense comparison
    if (expenseDiff > 0) {
        summaryHTML += `<div class="summary-item negative">
            <span class="summary-label">Expense:</span>
            <span class="summary-value">+₹${expenseDiff.toFixed(2)}</span>
        </div>`;
    } else if (expenseDiff < 0) {
        summaryHTML += `<div class="summary-item positive">
            <span class="summary-label">Expense:</span>
            <span class="summary-value">₹${expenseDiff.toFixed(2)}</span>
        </div>`;
    } else {
        summaryHTML += `<div class="summary-item neutral">
            <span class="summary-label">Expense:</span>
            <span class="summary-value">No change</span>
        </div>`;
    }
    
    // Balance comparison
    if (balanceDiff > 0) {
        summaryHTML += `<div class="summary-item positive">
            <span class="summary-label">Balance:</span>
            <span class="summary-value">+₹${balanceDiff.toFixed(2)}</span>
        </div>`;
    } else if (balanceDiff < 0) {
        summaryHTML += `<div class="summary-item negative">
            <span class="summary-label">Balance:</span>
            <span class="summary-value">₹${balanceDiff.toFixed(2)}</span>
        </div>`;
    } else {
        summaryHTML += `<div class="summary-item neutral">
            <span class="summary-label">Balance:</span>
            <span class="summary-value">No change</span>
        </div>`;
    }
    
    summaryHTML += '</div>';
    summaryEl.innerHTML = summaryHTML;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    
    // Initialize theme
    initializeTheme();
    
    // Initialize monthly comparison
    initializeMonthYearSelector();
    
    // Update month selectors when year changes
    const year1Select = document.getElementById('year1Select');
    const year2Select = document.getElementById('year2Select');
    if (year1Select) {
        year1Select.addEventListener('change', () => {
            updateMonthSelector('month1');
        });
    }
    if (year2Select) {
        year2Select.addEventListener('change', () => {
            updateMonthSelector('month2');
        });
    }
    
    // Update month selectors when month changes
    const month1Select = document.getElementById('month1Select');
    const month2Select = document.getElementById('month2Select');
    if (month1Select) {
        month1Select.addEventListener('change', () => {
            updateMonthSelector('month1');
        });
    }
    if (month2Select) {
        month2Select.addEventListener('change', () => {
            updateMonthSelector('month2');
        });
    }
});
