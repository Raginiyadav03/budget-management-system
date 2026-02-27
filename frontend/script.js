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

// Get headers with user ID
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json'
    };
}

// DOM elements
const transactionForm = document.getElementById('transactionForm');
const editForm = document.getElementById('editForm');
const transactionsList = document.getElementById('transactionsList');
const totalBalance = document.getElementById('totalBalance');
const totalIncome = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const savingStatus = document.getElementById('savingStatus');
const filterButtons = document.querySelectorAll('.filter-btn');
const editModal = document.getElementById('editModal');
const alertPopup = document.getElementById('alertPopup');
const confirmPopup = document.getElementById('confirmPopup');
const alertMessage = document.getElementById('alertMessage');
const confirmMessage = document.getElementById('confirmMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

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

// Current filter
let currentFilter = 'all';
let currentEditId = null;
let currentPage = 1;
let allTransactions = []; // Store all transactions for search
let searchQuery = ''; // Current search query
let itemsPerPage = 5;
let paginationData = null;
let selectedMonth = ''; // Current month filter
let selectedAmountFilter = ''; // Current amount filter (above1000, below500, between)
let amountFrom = ''; // Amount range from
let amountTo = ''; // Amount range to

// Helper function to get current local datetime string
function getCurrentDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Initialize theme
    initializeTheme();
    
    // Display user info and account dropdown
    displayUserInfo();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const accountDropdown = document.getElementById('accountDropdown');
        const accountIconBtn = document.querySelector('.account-icon-btn');
        
        if (accountDropdown && accountIconBtn && 
            !accountDropdown.contains(event.target) && 
            !accountIconBtn.contains(event.target)) {
            accountDropdown.classList.remove('show');
        }
    });
    
    // Set current date and time as default (local time)
    document.getElementById('date').value = getCurrentDateTimeString();
    
    // Load transactions
    loadTransactions();
    
    
    // Setup event listeners
    transactionForm.addEventListener('submit', handleFormSubmit);
    editForm.addEventListener('submit', handleEditSubmit);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
        if (event.target === alertPopup) {
            closeAlert();
        }
        if (event.target === confirmPopup) {
            closeConfirm(false);
        }
    };
});

// Display user info and account dropdown
function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headerRight = document.querySelector('.header-right');
    
    if (headerRight && user.name) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <span>Welcome, ${escapeHtml(user.name)}</span>
            <div class="account-dropdown">
                <button class="account-icon-btn" onclick="toggleAccountDropdown()" aria-label="Account menu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </button>
                <div class="dropdown-menu" id="accountDropdown">
                    <a href="#" class="dropdown-item" onclick="handleMyAccount(); return false;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        My Account
                    </a>
                    <a href="#" class="dropdown-item" onclick="handleLogout(); return false;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                    </a>
                </div>
            </div>
        `;
        headerRight.appendChild(userInfo);
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

// Toggle account dropdown
window.toggleAccountDropdown = function() {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

// Handle My Account
window.handleMyAccount = function() {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    window.location.href = 'account.html';
};

// Popup functions
function showAlert(message) {
    alertMessage.textContent = message;
    alertPopup.classList.add('show');
}

window.closeAlert = function() {
    alertPopup.classList.remove('show');
};

function showConfirm(message, callback) {
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmPopup.classList.add('show');
}

window.closeConfirm = function(result) {
    confirmPopup.classList.remove('show');
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
};

// Handle logout (global function for onclick)
window.handleLogout = function() {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    showConfirm('Are you sure you want to logout?', (confirmed) => {
        if (confirmed) {
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
};

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    
    const transaction = {
        description,
        amount,
        type,
        date,
        userId: getUserId()
    };
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(transaction)
        });
        
        if (response.ok) {
            transactionForm.reset();
            // Set current date and time as default (local time)
            document.getElementById('date').value = getCurrentDateTimeString();
            loadTransactions();
        } else {
            hideLoading();
            showAlert('Failed to add transaction. Please try again.');
        }
    } catch (error) {
        hideLoading();
        console.error('Error adding transaction:', error);
        showAlert('Error connecting to server. Please make sure the backend is running.');
    }
}

// Load all transactions with pagination
async function loadTransactions(page = currentPage) {
    showLoading();
    try {
        const userId = getUserId();
        const url = `${API_URL}/transactions?userId=${userId}&page=${page}&limit=${itemsPerPage}&filter=${currentFilter}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 400 || response.status === 401) {
            // User ID missing or invalid
            hideLoading();
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            paginationData = data.pagination;
            currentPage = data.pagination.currentPage;
            
            // Store all transactions for search functionality
            allTransactions = data.transactions;
            
            // Apply all filters (search, month, amount)
            let transactionsToDisplay = allTransactions;
            
            // Apply search filter
            if (searchQuery.trim()) {
                transactionsToDisplay = filterTransactionsBySearch(transactionsToDisplay, searchQuery);
            }
            
            // Apply month filter
            if (selectedMonth) {
                transactionsToDisplay = filterTransactionsByMonth(transactionsToDisplay, selectedMonth);
            }
            
            // Apply amount filter
            if (selectedAmountFilter) {
                transactionsToDisplay = filterTransactionsByAmount(transactionsToDisplay, selectedAmountFilter, amountFrom, amountTo);
            }
            
            displayTransactions(transactionsToDisplay);
            updateBalanceFromTotal(data.totalBalance);
            updateIncomeAndExpense(data.totalIncome || 0, data.totalExpense || 0);
            updateSavingStatus(data.savingStatus);
            displayPagination();
            hideLoading();
        } else {
            hideLoading();
            console.error('Failed to load transactions');
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading transactions:', error);
        transactionsList.innerHTML = '<p class="empty-message">Error connecting to server. Please make sure the backend is running.</p>';
    }
}

// Display transactions
function displayTransactions(transactions) {
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p class="empty-message">No transactions found.</p>';
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => {
        const transactionId = transaction._id || transaction.id;
        return `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-info">
                <div class="transaction-description">${escapeHtml(transaction.description)}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="transaction-amount">
                ${transaction.type === 'income' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
            </div>
            <div class="transaction-actions">
                <button class="edit-btn" onclick="openEditModal('${transactionId}')">Edit</button>
                <button class="delete-btn" onclick="deleteTransaction('${transactionId}')">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

// Update balance from total balance (from server)
function updateBalanceFromTotal(balance) {
    totalBalance.textContent = `₹${balance.toFixed(2)}`;
    totalBalance.style.color = balance >= 0 ? '#28a745' : '#dc3545';
}

// Update income and expense totals
function updateIncomeAndExpense(income, expense) {
    totalIncome.textContent = `₹${income.toFixed(2)}`;
    totalExpense.textContent = `₹${expense.toFixed(2)}`;
}

// Update saving status
function updateSavingStatus(statusData) {
    if (statusData && statusData.status) {
        savingStatus.textContent = statusData.status;
        savingStatus.style.color = statusData.color || '#667eea';
    } else {
        savingStatus.textContent = '-';
        savingStatus.style.color = '#667eea';
    }
}

// Delete transaction
async function deleteTransaction(id) {
    showConfirm('Are you sure you want to delete this transaction?', async (confirmed) => {
        if (!confirmed) {
            return;
        }
        
        showLoading();
        try {
            const userId = getUserId();
            const response = await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            
            if (response.ok) {
                loadTransactions();
            } else {
                hideLoading();
                showAlert('Failed to delete transaction. Please try again.');
            }
        } catch (error) {
            hideLoading();
            console.error('Error deleting transaction:', error);
            showAlert('Error connecting to server.');
        }
    });
}

// Filter transactions by search query
function filterTransactionsBySearch(transactions, query) {
    if (!query || !query.trim()) {
        return transactions;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return transactions.filter(transaction => {
        // Search in description
        const descriptionMatch = transaction.description.toLowerCase().includes(searchTerm);
        
        // Search in amount
        const amountMatch = transaction.amount.toString().includes(searchTerm);
        
        // Search in formatted date
        const dateMatch = formatDate(transaction.date).toLowerCase().includes(searchTerm);
        
        // Search in type
        const typeMatch = transaction.type.toLowerCase().includes(searchTerm);
        
        return descriptionMatch || amountMatch || dateMatch || typeMatch;
    });
}

// Filter transactions by month
function filterTransactionsByMonth(transactions, month) {
    if (!month) {
        return transactions;
    }
    
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionMonth = String(transactionDate.getMonth() + 1).padStart(2, '0');
        return transactionMonth === month;
    });
}

// Filter transactions by amount
function filterTransactionsByAmount(transactions, filterType, from, to) {
    if (!filterType) {
        return transactions;
    }
    
    return transactions.filter(transaction => {
        const amount = transaction.amount;
        
        switch(filterType) {
            case 'above1000':
                return amount > 1000;
            case 'below500':
                return amount < 500;
            case 'between':
                const fromAmount = parseFloat(from) || 0;
                const toAmount = parseFloat(to) || Infinity;
                return amount >= fromAmount && amount <= toAmount;
            default:
                return true;
        }
    });
}

// Apply all active filters and display results
function applyAllFilters() {
    let filteredTransactions = allTransactions;
    
    // Apply search filter
    if (searchQuery.trim()) {
        filteredTransactions = filterTransactionsBySearch(filteredTransactions, searchQuery);
    }
    
    // Apply month filter
    if (selectedMonth) {
        filteredTransactions = filterTransactionsByMonth(filteredTransactions, selectedMonth);
    }
    
    // Apply amount filter
    if (selectedAmountFilter) {
        filteredTransactions = filterTransactionsByAmount(filteredTransactions, selectedAmountFilter, amountFrom, amountTo);
    }
    
    // Display filtered transactions
    displayTransactions(filteredTransactions);
    
    // Hide pagination when any filter is active
    if (searchQuery.trim() || selectedMonth || selectedAmountFilter) {
        document.getElementById('paginationContainer').innerHTML = '';
    } else {
        displayPagination();
    }
}

// Handle search
window.handleSearch = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchQuery = searchInput.value;
        applyAllFilters();
    }
};

// Handle month filter
window.handleMonthFilter = function() {
    const monthSelect = document.getElementById('monthFilter');
    if (monthSelect) {
        selectedMonth = monthSelect.value;
        applyAllFilters();
    }
};

// Handle amount filter
window.handleAmountFilter = function() {
    const amountSelect = document.getElementById('amountFilter');
    const betweenGroup = document.getElementById('betweenAmountGroup');
    
    if (amountSelect) {
        selectedAmountFilter = amountSelect.value;
        
        // Show/hide between amount inputs
        if (selectedAmountFilter === 'between') {
            betweenGroup.style.display = 'flex';
            amountFrom = document.getElementById('amountFrom')?.value || '';
            amountTo = document.getElementById('amountTo')?.value || '';
        } else {
            betweenGroup.style.display = 'none';
            amountFrom = '';
            amountTo = '';
        }
        
        applyAllFilters();
    }
};

// Handle filter
function handleFilter(filter) {
    currentFilter = filter;
    currentPage = 1; // Reset to page 1 when filter changes
    
    // Clear advanced filters when changing type filter
    const searchInput = document.getElementById('searchInput');
    const monthSelect = document.getElementById('monthFilter');
    const amountSelect = document.getElementById('amountFilter');
    const betweenGroup = document.getElementById('betweenAmountGroup');
    
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
    }
    
    if (monthSelect) {
        monthSelect.value = '';
        selectedMonth = '';
    }
    
    if (amountSelect) {
        amountSelect.value = '';
        selectedAmountFilter = '';
    }
    
    if (betweenGroup) {
        betweenGroup.style.display = 'none';
        amountFrom = '';
        amountTo = '';
        document.getElementById('amountFrom').value = '';
        document.getElementById('amountTo').value = '';
    }
    
    // Update active button
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reload transactions to apply filter
    loadTransactions(1); // Reset to page 1 when filter changes
}

// Change items per page
window.changeItemsPerPage = function() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    currentPage = 1; // Reset to first page
    loadTransactions(1);
};

// Display pagination controls
function displayPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationData || paginationData.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (paginationData.hasPrevPage) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${paginationData.currentPage - 1})">‹ Prev</button>`;
    } else {
        paginationHTML += `<button class="pagination-btn disabled" disabled>‹ Prev</button>`;
    }
    
    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, paginationData.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(paginationData.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === paginationData.currentPage) {
            paginationHTML += `<button class="pagination-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn" onclick="goToPage(${i})">${i}</button>`;
        }
    }
    
    if (endPage < paginationData.totalPages) {
        if (endPage < paginationData.totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${paginationData.totalPages})">${paginationData.totalPages}</button>`;
    }
    
    // Next button
    if (paginationData.hasNextPage) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${paginationData.currentPage + 1})">Next ›</button>`;
    } else {
        paginationHTML += `<button class="pagination-btn disabled" disabled>Next ›</button>`;
    }
    
    paginationHTML += '</div>';
    paginationHTML += `<div class="pagination-info">Showing ${((paginationData.currentPage - 1) * paginationData.itemsPerPage) + 1} - ${Math.min(paginationData.currentPage * paginationData.itemsPerPage, paginationData.totalItems)} of ${paginationData.totalItems} transactions</div>`;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
window.goToPage = function(page) {
    if (page >= 1 && page <= paginationData.totalPages) {
        loadTransactions(page);
    }
};

// Format date and time in Indian format
function formatDate(dateString) {
    const date = new Date(dateString);
    // Indian date format: DD/MM/YYYY HH:MM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open edit modal
async function openEditModal(id) {
    currentEditId = id;
    
    showLoading();
    try {
        const userId = getUserId();
        const response = await fetch(`${API_URL}/transactions/${id}?userId=${userId}`, {
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
            const transaction = await response.json();
            
            // Populate form with transaction data
            document.getElementById('editDescription').value = transaction.description;
            document.getElementById('editAmount').value = transaction.amount;
            document.getElementById('editType').value = transaction.type;
            // Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
            const dateValue = transaction.date.includes('T') 
                ? transaction.date.slice(0, 16) 
                : transaction.date + 'T00:00';
            document.getElementById('editDate').value = dateValue;
            
            hideLoading();
            // Show modal
            editModal.classList.add('show');
        } else {
            hideLoading();
            showAlert('Failed to load transaction. Please try again.');
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading transaction:', error);
        showAlert('Error connecting to server.');
    }
}

// Close edit modal
function closeEditModal() {
    editModal.classList.remove('show');
    currentEditId = null;
    editForm.reset();
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!currentEditId) {
        return;
    }
    
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseFloat(document.getElementById('editAmount').value);
    const type = document.getElementById('editType').value;
    const date = document.getElementById('editDate').value;
    
    const transaction = {
        description,
        amount,
        type,
        date,
        userId: getUserId()
    };
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/transactions/${currentEditId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(transaction)
        });
        
        if (response.ok) {
            closeEditModal();
            loadTransactions();
        } else {
            hideLoading();
            const error = await response.json();
            showAlert(error.error || 'Failed to update transaction. Please try again.');
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating transaction:', error);
        showAlert('Error connecting to server. Please make sure the backend is running.');
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
