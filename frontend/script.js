// API base URL - automatically detects environment
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
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
let itemsPerPage = 5;
let paginationData = null;

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
    
    // Display user info and logout button
    displayUserInfo();
    
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

// Display user info and logout button
function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headerTop = document.querySelector('.header-top');
    
    if (headerTop && user.name) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <span>Welcome, ${escapeHtml(user.name)}</span>
            <button class="btn-logout" onclick="handleLogout()">Logout</button>
        `;
        headerTop.appendChild(userInfo);
    }
}

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
        const response = await fetch(`${API_URL}/transactions?userId=${userId}&page=${page}&limit=${itemsPerPage}`, {
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
            
            // Apply filter on frontend (since backend doesn't support filter)
            let filteredTransactions = data.transactions;
            if (currentFilter !== 'all') {
                filteredTransactions = data.transactions.filter(t => t.type === currentFilter);
            }
            
            displayTransactions(filteredTransactions);
            updateBalanceFromTotal(data.totalBalance);
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

// Handle filter
function handleFilter(filter) {
    currentFilter = filter;
    
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
