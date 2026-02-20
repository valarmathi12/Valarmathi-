// DOM Elements
const landingSection = document.getElementById('landing');
const loginSection = document.getElementById('login');
const adminDashboard = document.getElementById('admin-dashboard');
const studentDashboard = document.getElementById('student-dashboard');

const startBtn = document.getElementById('start-btn');
const loginForm = document.getElementById('login-form');
const logoutAdminBtn = document.getElementById('logout-admin');
const logoutStudentBtn = document.getElementById('logout-student');
const adminSearchInput = document.getElementById('admin-search');
const adminDateFilter = document.getElementById('admin-date-filter');

// Student Dashboard Elements
const submitComplaintCard = document.getElementById('submit-complaint');
const giveFeedbackCard = document.getElementById('give-feedback');
const complaintForm = document.getElementById('complaint-form');
const feedbackForm = document.getElementById('feedback-form');
const complaintsList = document.getElementById('complaints-list');
const feedbackList = document.getElementById('feedback-list');
const statusList = document.getElementById('status-list');
const statusUl = document.getElementById('status-ul');
const noComplaintsMsg = document.getElementById('no-complaints');
const duplicateNotification = document.getElementById('duplicate-notification');
const dismissNotificationBtn = document.getElementById('dismiss-notification');

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Data storage
let complaints = [];
let feedbacks = [];

// Load data from API
async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/complaints`);
        if (response.ok) {
            complaints = await response.json();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        complaints = [];
    }

    try {
        const response = await fetch(`${API_BASE}/feedback`);
        if (response.ok) {
            feedbacks = await response.json();
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbacks = [];
    }
}

// Save complaint to API
async function saveComplaintToAPI(complaint) {
    try {
        const response = await fetch(`${API_BASE}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error');
        }
        return await response.json();
    } catch (error) {
        console.error('Error saving complaint:', error);
        throw error;
    }
}

// Event Listeners
startBtn.addEventListener('click', showLogin);
loginForm.addEventListener('submit', handleLogin);
logoutAdminBtn.addEventListener('click', logout);
logoutStudentBtn.addEventListener('click', logout);
adminSearchInput.addEventListener('input', filterComplaints);

const adminDateSearchBtn = document.getElementById('admin-date-search-btn');
adminDateSearchBtn.addEventListener('click', filterByDate);

const adminDepartmentFilter = document.getElementById('admin-department-filter');
adminDepartmentFilter.addEventListener('change', filterByDepartment);

submitComplaintCard.addEventListener('click', toggleComplaintForm);
giveFeedbackCard.addEventListener('click', toggleFeedbackForm);
complaintForm.addEventListener('submit', handleComplaintSubmit);
feedbackForm.addEventListener('submit', handleFeedbackSubmit);
dismissNotificationBtn.addEventListener('click', dismissNotification);

const ratingStars = document.getElementById('rating-stars');
const ratingEmojis = document.getElementById('rating-emojis');
ratingStars.addEventListener('click', handleStarClick);
ratingEmojis.addEventListener('click', handleEmojiClick);

// Functions
function showLogin() {
    landingSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.success) {
            loginSection.classList.add('hidden');

            // Store user email in localStorage
            localStorage.setItem("userEmail", email);

            if (data.role === 'admin') {
                adminDashboard.classList.remove('hidden');
                updateSummaryCounts();
                initAdminDashboard();
            } else if (data.role === 'student') {
                studentDashboard.classList.remove('hidden');
                updateStatusList();
                updateFeedbackList();
            }

            loginForm.reset();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

function logout() {
    adminDashboard.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    landingSection.classList.remove('hidden');
}

function toggleComplaintForm() {
    const formContainer = submitComplaintCard.querySelector('.form-container');
    formContainer.classList.toggle('hidden');
    updateComplaintsList();
}

function toggleFeedbackForm() {
    const formContainer = giveFeedbackCard.querySelector('.form-container');
    formContainer.classList.toggle('hidden');
    updateFeedbackList();
}

async function handleComplaintSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('complaint-title').value;
    const description = document.getElementById('complaint-description').value;
    const priority = document.getElementById('complaint-priority').value;

    if (title && description && priority) {
        const confirmed = confirm('Are you sure you want to submit this complaint?');
        if (!confirmed) return;

        try {
            const departmentSelect = document.getElementById('complaint-department');
            const department = departmentSelect.value ? departmentSelect.value : 'General';
            const isAnonymous = document.getElementById('anonymous-complaint').checked;
            const userEmail = localStorage.getItem("userEmail");
            const complaintData = {
                title,
                description,
                priority,
                anonymous: isAnonymous,
                department: department,
                userEmail: isAnonymous ? null : userEmail,
                status: "pending",
                createdAt: new Date().toISOString()
            };

            const response = await saveComplaintToAPI(complaintData);
            const isDuplicate = response.isDuplicate;

            // Reload data from API to get latest data
            await loadData();

            updateComplaintsList();
            updateStatusList();
            updateAdminDashboard();
            updateSummaryCounts();
            complaintForm.reset();

            if (isDuplicate) {
                showDuplicateNotification();
            } else {
                alert('Complaint submitted successfully!');
            }
        } catch (error) {
            alert('Error submitting complaint. Please try again.');
            console.error('Complaint submission error:', error);
        }
    } else {
        alert('Please fill in all fields');
    }
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('feedback-title').value.trim();
    const description = document.getElementById('feedback-description').value.trim();
    const isAnonymous = document.getElementById('anonymous-feedback').checked;

    let rating = null;
    let category = null;
    const selectedStar = document.querySelector('.star.selected');
    const selectedEmoji = document.querySelector('.emoji.selected');

    if (selectedStar) {
        rating = parseInt(selectedStar.dataset.rating);
        category = "star";
    } else if (selectedEmoji) {
        rating = parseInt(selectedEmoji.dataset.rating);
        category = "emoji";
    }

    if (rating === null) {
        alert('Please select a rating');
        return;
    }

    const confirmed = confirm('Are you sure you want to submit this feedback?');
    if (!confirmed) return;

    try {
        const userEmail = localStorage.getItem("userEmail");
        const feedbackData = {
            category,
            rating,
            feedbackText: description || '',
            anonymous: isAnonymous,
            userEmail: isAnonymous ? null : userEmail,
            status: "pending"
        };

        const response = await fetch(`${API_BASE}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData),
        });

        if (response.ok) {
            // Reload data from API to get latest data
            await loadData();

            updateFeedbackList();
            updateAdminDashboard();
            updateSummaryCounts();
            feedbackForm.reset();
            clearRatingSelection();
            alert('Feedback submitted successfully!');
        } else {
            alert('Error submitting feedback. Please try again.');
        }
    } catch (error) {
        alert('Error submitting feedback. Please try again.');
        console.error('Feedback submission error:', error);
    }
}

function updateComplaintsList() {
    // Hide the Submitted Complaints section - keeping only Your Complaints section
    const complaintsListSection = document.getElementById('complaints-list');
    if (complaintsListSection) {
        complaintsListSection.classList.add('hidden');
    }
}

function updateFeedbackList() {
    const ul = document.getElementById('feedback-ul');
    const userEmail = localStorage.getItem("userEmail");
    const filteredFeedbacks = feedbacks.filter(feedback =>
        feedback.userEmail && feedback.userEmail === userEmail
    );
    ul.innerHTML = '';
    filteredFeedbacks.forEach(feedback => {
        const li = document.createElement('li');
        li.textContent = `Rating: ${feedback.rating} (${feedback.category}) - ${feedback.feedbackText || 'No text'} - ${feedback.status || "pending"}`;
        ul.appendChild(li);
    });
    feedbackList.classList.toggle('hidden', filteredFeedbacks.length === 0);
}

function updateStatusList() {
    statusUl.innerHTML = '';
    const userEmail = localStorage.getItem("userEmail");
    const filteredComplaints = complaints.filter(complaint =>
        complaint.userEmail && complaint.userEmail === userEmail
    );
    filteredComplaints.forEach(complaint => {
        const li = document.createElement('li');
        const status = complaint.status || "pending";
        let badgeStyle;
        if (status === "resolved") {
            badgeStyle = 'background-color: #d4edda; color: #155724; border-radius: 15px; padding: 4px 10px; font-size: 12px;';
        } else {
            badgeStyle = 'background-color: #fff3cd; color: #856404; border-radius: 15px; padding: 4px 10px; font-size: 12px;';
        }
        li.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;"><span>${complaint.title}</span><span style="${badgeStyle}">${status}</span></div>`;
        statusUl.appendChild(li);
    });
    noComplaintsMsg.classList.toggle('hidden', filteredComplaints.length > 0);
}

async function resolveComplaint(complaintId) {
    try {
        const response = await fetch(`${API_BASE}/complaints/${complaintId}/resolve`, {
            method: 'PUT',
        });

        if (response.ok) {
            const updatedComplaint = await response.json();
            const index = complaints.findIndex(c => c.id === complaintId);
            if (index !== -1) {
                complaints[index] = updatedComplaint;
            }

            updateAdminDashboard();
            updateSummaryCounts();
            updateHistorySections();
            if (!studentDashboard.classList.contains('hidden')) {
                updateStatusList();
                updateComplaintsList();
            }
            alert('Complaint resolved successfully!');
        } else {
            alert('Error resolving complaint. Please try again.');
        }
    } catch (error) {
        console.error('Error resolving complaint:', error);
        alert('Error resolving complaint. Please try again.');
    }
}

async function updateSummaryCounts() {
    try {
        const complaintsResponse = await fetch(`${API_BASE}/complaints/stats`);
        const feedbackResponse = await fetch(`${API_BASE}/feedback/stats`);

        if (complaintsResponse.ok) {
            const stats = await complaintsResponse.json();
            document.getElementById('total-count').textContent = stats.total;
            document.getElementById('pending-count').textContent = stats.pending;
            document.getElementById('resolved-count').textContent = stats.resolved;
        }

        if (feedbackResponse.ok) {
            const feedbackStats = await feedbackResponse.json();
            document.getElementById('feedback-count').textContent = feedbackStats.total;
            document.getElementById('total-feedback-count').textContent = feedbackStats.total;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        const total = complaints.length;
        const pending = complaints.filter(c => c.status === 'pending').length;
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        document.getElementById('total-count').textContent = total;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('resolved-count').textContent = resolved;
        document.getElementById('feedback-count').textContent = feedbacks.length;
    }
}

function renderComplaints(complaintsToRender) {
    const getDepartmentDisplay = (complaint) => {
        const department = complaint.department || 'General';
        if (department === 'General') return 'General Complaint';
        return `Department: ${department}`;
    };

    const highPriorityDiv = document.querySelector('#high-priority .items');
    highPriorityDiv.innerHTML = '';
    complaintsToRender.filter(c => c.priority === 'High').forEach(complaint => {
        const div = document.createElement('div');
        div.className = 'item-card';
        const statusBadge = complaint.status === 'pending' ? '<span class="status-badge badge-pending">Pending</span>' : '<span class="status-badge badge-resolved">Resolved</span>';
        const submitterInfo = complaint.anonymous ? '<small>Submitted by: Anonymous</small><br>' : '';
        const departmentDisplay = getDepartmentDisplay(complaint);
        div.innerHTML = `
            <div class="complaint-info">
                <strong>${complaint.title}</strong>${statusBadge}<br>
                ${submitterInfo}
                <small>${new Date(complaint.submittedAt).toLocaleDateString()}</small><br>
                <small>${departmentDisplay}</small><br>
                <span>${complaint.description}</span>
            </div>
            ${complaint.status === 'pending' ? `<button class="resolve-btn" data-id="${complaint.id}">Resolve</button>` : ''}
        `;
        highPriorityDiv.appendChild(div);
    });

    const mediumPriorityDiv = document.querySelector('#medium-priority .items');
    mediumPriorityDiv.innerHTML = '';
    complaintsToRender.filter(c => c.priority === 'Medium').forEach(complaint => {
        const div = document.createElement('div');
        div.className = 'item-card';
        const statusBadge = complaint.status === 'pending' ? '<span class="status-badge badge-pending">Pending</span>' : '<span class="status-badge badge-resolved">Resolved</span>';
        const submitterInfo = complaint.anonymous ? '<small>Submitted by: Anonymous</small><br>' : '';
        const departmentDisplay = getDepartmentDisplay(complaint);
        div.innerHTML = `
            <div class="complaint-info">
                <strong>${complaint.title}</strong>${statusBadge}<br>
                ${submitterInfo}
                <small>${new Date(complaint.submittedAt).toLocaleDateString()}</small><br>
                <small>${departmentDisplay}</small><br>
                <span>${complaint.description}</span>
            </div>
            ${complaint.status === 'pending' ? `<button class="resolve-btn" data-id="${complaint.id}">Resolve</button>` : ''}
        `;
        mediumPriorityDiv.appendChild(div);
    });

    const lowPriorityDiv = document.querySelector('#low-priority .items');
    lowPriorityDiv.innerHTML = '';
    complaintsToRender.filter(c => c.priority === 'Low').forEach(complaint => {
        const div = document.createElement('div');
        div.className = 'item-card';
        const statusBadge = complaint.status === 'pending' ? '<span class="status-badge badge-pending">Pending</span>' : '<span class="status-badge badge-resolved">Resolved</span>';
        const submitterInfo = complaint.anonymous ? '<small>Submitted by: Anonymous</small><br>' : '';
        const departmentDisplay = getDepartmentDisplay(complaint);
        div.innerHTML = `
            <div class="complaint-info">
                <strong>${complaint.title}</strong>${statusBadge}<br>
                ${submitterInfo}
                <small>${new Date(complaint.submittedAt).toLocaleDateString()}</small><br>
                <small>${departmentDisplay}</small><br>
                <span>${complaint.description}</span>
            </div>
            ${complaint.status === 'pending' ? `<button class="resolve-btn" data-id="${complaint.id}">Resolve</button>` : ''}
        `;
        lowPriorityDiv.appendChild(div);
    });

    document.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const complaintId = parseInt(e.target.dataset.id);
            resolveComplaint(complaintId);
        });
    });
}

function renderFeedback(feedbacksToRender) {
    const feedbackDiv = document.querySelector('#feedback .items');
    feedbackDiv.innerHTML = '';
    feedbacksToRender.forEach(feedback => {
        const div = document.createElement('div');
        div.className = 'item-card';
        const feedbackText = feedback.feedbackText || 'No feedback text';
        const submitterInfo = feedback.anonymous ? '<small>Submitted anonymously</small><br>' : '';
        div.innerHTML = `
            <div class="complaint-info">
                <strong>Feedback</strong><br>
                ${submitterInfo}
                <small>${new Date(feedback.submittedAt).toLocaleDateString()}</small><br>
                <span>Rating: ${feedback.rating} (${feedback.category})</span><br>
                <span>${feedbackText}</span>
            </div>
        `;
        feedbackDiv.appendChild(div);
    });
}

function updateAdminDashboard(filteredComplaints = null, filteredFeedback = null) {
    document.querySelector('#high-priority .items').innerHTML = '';
    document.querySelector('#medium-priority .items').innerHTML = '';
    document.querySelector('#low-priority .items').innerHTML = '';
    document.querySelector('#feedback .items').innerHTML = '';

    const complaintsToUse = filteredComplaints !== null ? filteredComplaints : complaints.slice(0, 5);
    const feedbacksToUse = filteredFeedback !== null ? filteredFeedback : feedbacks.slice(0, 5);

    renderComplaints(complaintsToUse);
    renderFeedback(feedbacksToUse);
    renderVisualizations(filteredComplaints, filteredFeedback);
}

function toggleRatingAndMoodSections() {
    const category = feedbackCategorySelect.value;
    if (category) {
        ratingSection.classList.remove('hidden');
        moodSection.classList.remove('hidden');
    } else {
        ratingSection.classList.add('hidden');
        moodSection.classList.add('hidden');
        clearRatingSelection();
        clearMoodSelection();
    }
}

function handleStarClick(e) {
    if (e.target.classList.contains('star')) {
        const rating = parseInt(e.target.dataset.rating);
        document.querySelectorAll('.emoji').forEach(emoji => emoji.classList.remove('selected'));
        document.querySelectorAll('.star').forEach(star => star.classList.remove('selected'));
        document.querySelectorAll('.star').forEach(star => {
            if (parseInt(star.dataset.rating) <= rating) {
                star.classList.add('selected');
            }
        });
    }
}

function handleEmojiClick(e) {
    if (e.target.classList.contains('emoji')) {
        document.querySelectorAll('.star').forEach(star => star.classList.remove('selected'));
        document.querySelectorAll('.emoji').forEach(emoji => emoji.classList.remove('selected'));
        e.target.classList.add('selected');
    }
}

function handleMoodClick(e) {
    if (e.target.classList.contains('mood-option')) {
        document.querySelectorAll('.mood-option').forEach(option => option.classList.remove('selected'));
        e.target.classList.add('selected');
    }
}

function clearRatingSelection() {
    document.querySelectorAll('.star').forEach(star => star.classList.remove('selected'));
    document.querySelectorAll('.emoji').forEach(emoji => emoji.classList.remove('selected'));
}

function clearMoodSelection() {
    document.querySelectorAll('.mood-option').forEach(option => option.classList.remove('selected'));
}

function toggleCategoryRatingSection() {
    const category = categoryFeedbackSelect.value;
    if (category) {
        categoryRatingSection.classList.remove('hidden');
        if (category === 'Overall Experience') {
            categoryRatingLabel.textContent = 'Rating (Emojis)';
            document.getElementById('category-rating-stars').classList.add('hidden');
            document.getElementById('category-rating-emojis').classList.remove('hidden');
        } else {
            categoryRatingLabel.textContent = 'Rating (Stars)';
            document.getElementById('category-rating-stars').classList.remove('hidden');
            document.getElementById('category-rating-emojis').classList.add('hidden');
        }
    } else {
        categoryRatingSection.classList.add('hidden');
        clearCategoryRatingSelection();
    }
}

function handleCategoryStarClick(e) {
    if (e.target.classList.contains('category-star')) {
        const rating = parseInt(e.target.dataset.rating);
        document.querySelectorAll('.category-star').forEach(star => star.classList.remove('selected'));
        document.querySelectorAll('.category-star').forEach(star => {
            if (parseInt(star.dataset.rating) <= rating) {
                star.classList.add('selected');
            }
        });
    }
}

function handleCategoryEmojiClick(e) {
    if (e.target.classList.contains('category-emoji')) {
        document.querySelectorAll('.category-emoji').forEach(emoji => emoji.classList.remove('selected'));
        e.target.classList.add('selected');
    }
}

function clearCategoryRatingSelection() {
    document.querySelectorAll('.category-star').forEach(star => star.classList.remove('selected'));
    document.querySelectorAll('.category-emoji').forEach(emoji => emoji.classList.remove('selected'));
}

function showDuplicateNotification() {
    duplicateNotification.classList.remove('hidden');
}

function dismissNotification() {
    duplicateNotification.classList.add('hidden');
}

async function filterComplaints() {
    const searchTerm = adminSearchInput.value.toLowerCase().trim();

    if (searchTerm) {
        try {
            const response = await fetch(`${API_BASE}/complaints/search?query=${encodeURIComponent(searchTerm)}`);
            if (response.ok) {
                const searchResults = await response.json();
                updateAdminDashboard(searchResults, feedbacks);
            }
        } catch (error) {
            console.error('Error searching complaints:', error);
            await loadData();
            updateAdminDashboard();
        }
    } else {
        await loadData();
        updateAdminDashboard();
    }
}

async function filterByDate(e) {
    e.preventDefault();
    const selectedDate = adminDateFilter.value;

    if (selectedDate) {
        try {
            const complaintsResponse = await fetch(`${API_BASE}/complaints/search/date?date=${encodeURIComponent(selectedDate)}`);
            const feedbackResponse = await fetch(`${API_BASE}/feedback/search/date?date=${encodeURIComponent(selectedDate)}`);

            if (complaintsResponse.ok && feedbackResponse.ok) {
                const dateComplaints = await complaintsResponse.json();
                const dateFeedback = await feedbackResponse.json();
                updateAdminDashboard(dateComplaints, dateFeedback);
            } else {
                console.error('Error fetching data by date');
                await loadData();
                updateAdminDashboard();
            }
        } catch (error) {
            console.error('Error filtering by date:', error);
            await loadData();
            updateAdminDashboard();
        }
    } else {
        await loadData();
        updateAdminDashboard();
    }
}

function filterByDepartment() {
    const selectedDepartment = adminDepartmentFilter.value;
    
    if (selectedDepartment) {
        const filteredComplaints = complaints.filter(complaint => {
            const complaintDepartment = complaint.department || 'General';
            return complaintDepartment === selectedDepartment;
        });
        updateAdminDashboard(filteredComplaints, feedbacks);
    } else {
        updateAdminDashboard();
    }
}

async function init() {
    loginSection.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    await loadData();
    updateAdminDashboard();
    updateSummaryCounts();

    document.getElementById('submit-complaint').querySelector('.form-container').addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('give-feedback').querySelector('.form-container').addEventListener('click', (e) => e.stopPropagation());
}

function renderVisualizations(filteredComplaints = null, filteredFeedback = null) {
    const complaintsToUse = filteredComplaints !== null ? filteredComplaints : complaints;
    const feedbacksToUse = filteredFeedback !== null ? filteredFeedback : feedbacks;

    const highCount = complaintsToUse.filter(c => c.priority === 'High').length;
    const mediumCount = complaintsToUse.filter(c => c.priority === 'Medium').length;
    const lowCount = complaintsToUse.filter(c => c.priority === 'Low').length;
    const feedbackCount = feedbacksToUse.length;

    renderCombinedPie(highCount, mediumCount, lowCount, feedbackCount);
    addLegend(highCount, mediumCount, lowCount, feedbackCount);
}

function renderCombinedPie(high, medium, low, feedback) {
    const svg = document.getElementById('summary-chart');
    svg.innerHTML = '';

    const total = high + medium + low + feedback;
    if (total === 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '200');
        circle.setAttribute('cy', '200');
        circle.setAttribute('r', '160');
        circle.setAttribute('fill', '#f0f0f0');
        svg.appendChild(circle);
        return;
    }

    const cx = 200, cy = 200, r = 160;
    let cumulativePercent = 0;

    if (high > 0) {
        const percent = (high / total) * 100;
        const path = createPieSlice(cx, cy, r, cumulativePercent, cumulativePercent + percent, '#f44336');
        svg.appendChild(path);
        cumulativePercent += percent;
    }

    if (medium > 0) {
        const percent = (medium / total) * 100;
        const path = createPieSlice(cx, cy, r, cumulativePercent, cumulativePercent + percent, '#ff9800');
        svg.appendChild(path);
        cumulativePercent += percent;
    }

    if (low > 0) {
        const percent = (low / total) * 100;
        const path = createPieSlice(cx, cy, r, cumulativePercent, cumulativePercent + percent, '#4caf50');
        svg.appendChild(path);
        cumulativePercent += percent;
    }

    if (feedback > 0) {
        const percent = (feedback / total) * 100;
        const path = createPieSlice(cx, cy, r, cumulativePercent, cumulativePercent + percent, '#9c27b0');
        svg.appendChild(path);
    }
}

function addLegend(high, medium, low, feedback) {
    const legendDiv = document.getElementById('chart-legend');
    legendDiv.innerHTML = '';

    const legendItems = [
        { label: 'High Priority Complaints', color: '#f44336' },
        { label: 'Medium Priority Complaints', color: '#ff9800' },
        { label: 'Low Priority Complaints', color: '#4caf50' },
        { label: 'Feedback', color: '#9c27b0' }
    ];

    legendItems.forEach(item => {
        const legendItemDiv = document.createElement('div');
        legendItemDiv.className = 'legend-item';

        const colorDot = document.createElement('span');
        colorDot.className = 'legend-color-dot';
        colorDot.style.backgroundColor = item.color;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'legend-label';
        labelSpan.textContent = item.label;

        legendItemDiv.appendChild(colorDot);
        legendItemDiv.appendChild(labelSpan);
        legendDiv.appendChild(legendItemDiv);
    });

    updateCountSummary(high, medium, low, feedback);
}

function updateCountSummary(high, medium, low, feedback) {
    const countSummaryDiv = document.getElementById('count-summary');
    countSummaryDiv.innerHTML = '';

    const countItems = [
        { label: 'High Priority Complaints:', value: high, color: '#f44336' },
        { label: 'Medium Priority Complaints:', value: medium, color: '#ff9800' },
        { label: 'Low Priority Complaints:', value: low, color: '#4caf50' },
        { label: 'Total Feedback:', value: feedback, color: '#9c27b0' }
    ];

    countItems.forEach(item => {
        const countItemDiv = document.createElement('div');
        countItemDiv.className = 'count-item';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'count-label';
        labelSpan.textContent = item.label;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'count-value';
        valueSpan.textContent = item.value;
        valueSpan.style.color = item.color;

        countItemDiv.appendChild(labelSpan);
        countItemDiv.appendChild(valueSpan);
        countSummaryDiv.appendChild(countItemDiv);
    });
}

function createPieSlice(cx, cy, r, startPercent, endPercent, color) {
    const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;

    const pathData = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
    ].join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', color);
    return path;
}

function renderComplaintsHistory() {
    const historyList = document.getElementById('complaints-history-list');
    historyList.innerHTML = '';

    const sortedComplaints = [...complaints].sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    sortedComplaints.forEach(complaint => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const statusClass = complaint.status === 'pending' ? 'status-pending' : 'status-resolved';
        const statusText = complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1);
        const departmentText = complaint.department || 'General';
        const departmentDisplay = departmentText === 'General' ? 'General Complaint' : `Department: ${departmentText}`;

        historyItem.innerHTML = `
            <div class="history-item-title">${complaint.title}</div>
            <div class="history-item-details">${complaint.description}</div>
            <div class="history-item-priority">Priority: ${complaint.priority}</div>
            <div class="history-item-department">${departmentDisplay}</div>
            <span class="history-item-status ${statusClass}">${statusText}</span>
        `;

        historyList.appendChild(historyItem);
    });
}

function renderFeedbackHistory() {
    const historyList = document.getElementById('feedback-history-list');
    historyList.innerHTML = '';

    const sortedFeedback = [...feedbacks].sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    sortedFeedback.forEach(feedback => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const ratingText = feedback.category === 'star' ?
            `⭐ ${feedback.rating}/5` :
            `😊 ${feedback.rating}/5`;

        const date = new Date(feedback.submittedAt).toLocaleDateString();

        historyItem.innerHTML = `
            <div class="history-item-title">Feedback</div>
            <div class="history-item-details">${feedback.feedbackText || 'No feedback text'}</div>
            <div class="history-item-rating">${ratingText}</div>
            <div class="history-item-date">${date}</div>
        `;

        historyList.appendChild(historyItem);
    });
}

function updateHistorySections() {
    renderComplaintsHistory();
    renderFeedbackHistory();
}

function initAdminDashboard() {
    updateHistorySections();
    updateNotificationCount();
}

// Notification functions for pending complaints older than 5 days
function getOldPendingComplaints() {
    const today = new Date();
    const fiveDaysAgo = new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000));
    
    return complaints.filter(complaint => {
        if (complaint.status !== 'pending') return false;
        
        const createdAt = complaint.createdAt || complaint.submittedAt;
        if (!createdAt) return false;
        
        const complaintDate = new Date(createdAt);
        return complaintDate < fiveDaysAgo;
    });
}

function updateNotificationCount() {
    const oldPendingComplaints = getOldPendingComplaints();
    const notificationBadge = document.getElementById('notification-count');
    if (notificationBadge) {
        notificationBadge.textContent = oldPendingComplaints.length;
        notificationBadge.style.display = oldPendingComplaints.length > 0 ? 'inline-block' : 'none';
    }
}

function showOldPendingNotifications() {
    const oldPendingComplaints = getOldPendingComplaints();
    let notificationList = document.getElementById('notification-list');
    
    if (!notificationList) {
        notificationList = document.createElement('div');
        notificationList.id = 'notification-list';
        notificationList.className = 'notification-list';
        notificationList.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 2px10px rgba(0,0,0,0.3);max-height:400px;overflow-y:auto;z-index:1000;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;';
        closeBtn.onclick = function() { notificationList.remove(); };
        notificationList.appendChild(closeBtn);
        
        const title = document.createElement('h3');
        title.textContent = 'Pending complaints older than 5 days';
        notificationList.appendChild(title);
        
        document.body.appendChild(notificationList);
    }
    
    // Clear existing items (except close button and title)
    while (notificationList.children.length > 2) {
        notificationList.removeChild(notificationList.lastChild);
    }
    
    if (oldPendingComplaints.length === 0) {
        const noItems = document.createElement('p');
        noItems.textContent = 'No pending complaints older than 5 days';
        notificationList.appendChild(noItems);
    } else {
        oldPendingComplaints.forEach(complaint => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:10px;border-bottom:1px solid #eee;';
            item.textContent = complaint.title + ' - pending';
            notificationList.appendChild(item);
        });
    }
    
    notificationList.style.display = 'block';
}

init();
