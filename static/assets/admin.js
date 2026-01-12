// Admin Panel JavaScript

const API_BASE = '/api/v1';
let adminToken = null;

// Authentication Functions
async function checkAuth() {
    adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
        showLoginScreen();
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/auth/verify`, {
            headers: {
                'X-Admin-Token': adminToken
            }
        });
        const data = await response.json();

        if (data.authenticated) {
            showAdminPanel();
            return true;
        } else {
            localStorage.removeItem('admin_token');
            showLoginScreen();
            return false;
        }
    } catch (error) {
        showLoginScreen();
        return false;
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
}

async function adminLogin() {
    const password = document.getElementById('admin-password').value;

    if (!password) {
        showLoginStatus('Please enter a password', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.status === 'success') {
            adminToken = data.token;
            localStorage.setItem('admin_token', adminToken);
            showLoginStatus('Login successful!', 'success');
            setTimeout(() => {
                showAdminPanel();
                loadStats();
                loadUsers();
                loadRegisteredTeams();
                addLog('Admin logged in successfully', 'success');
            }, 500);
        } else {
            showLoginStatus(data.error || 'Login failed', 'error');
            if (response.status === 429) {
                document.getElementById('lockout-info').style.display = 'block';
                document.getElementById('lockout-info').textContent = data.error;
            }
        }
    } catch (error) {
        showLoginStatus('Error: ' + error.message, 'error');
    }
}

async function adminLogout() {
    try {
        await fetch(`${API_BASE}/admin/auth/logout`, {
            method: 'POST',
            headers: {
                'X-Admin-Token': adminToken
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('admin_token');
    adminToken = null;
    showLoginScreen();
    document.getElementById('admin-password').value = '';
}

function showLoginStatus(message, type = 'info') {
    const el = document.getElementById('login-status');
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// Helper to add auth header to requests
function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['X-Admin-Token'] = adminToken;
    return fetch(url, options);
}

// Utility Functions
function showStatus(elementId, message, type = 'info') {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function addLog(message, type = 'info') {
    const logViewer = document.getElementById('activity-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logViewer.insertBefore(entry, logViewer.firstChild);

    // Keep only last 50 entries
    while (logViewer.children.length > 50) {
        logViewer.removeChild(logViewer.lastChild);
    }
}

function clearLog() {
    const logViewer = document.getElementById('activity-log');
    logViewer.innerHTML = '<div class="log-entry info">Log cleared</div>';
}

// Stats Functions
async function loadStats() {
    try {
        const response = await authFetch(`${API_BASE}/admin/stats`);
        const data = await response.json();

        if (data.status === 'success' && data.stats) {
            document.getElementById('stat-users').textContent = data.stats.totalUsers ?? 0;
            document.getElementById('stat-notes').textContent = data.stats.totalNotes ?? 0;
            document.getElementById('stat-notifications').textContent = data.stats.totalNotifications ?? 0;
            document.getElementById('stat-db-size').textContent = data.stats.dbSize ?? '0.00 MB';
            addLog('Stats refreshed successfully', 'success');
        } else {
            addLog('Failed to load stats: ' + (data.error || 'Unknown error'), 'error');
            // Set defaults on error
            document.getElementById('stat-users').textContent = '0';
            document.getElementById('stat-notes').textContent = '0';
            document.getElementById('stat-notifications').textContent = '0';
            document.getElementById('stat-db-size').textContent = '0.00 MB';
        }
    } catch (error) {
        addLog('Error loading stats: ' + error.message, 'error');
        // Set defaults on error
        document.getElementById('stat-users').textContent = '0';
        document.getElementById('stat-notes').textContent = '0';
        document.getElementById('stat-notifications').textContent = '0';
        document.getElementById('stat-db-size').textContent = '0.00 MB';
    }
}

// User Management Functions
async function loadRegisteredTeams() {
    try {
        const response = await authFetch(`${API_BASE}/admin/teams`);
        const data = await response.json();

        const tbody = document.getElementById('teams-tbody');
        tbody.innerHTML = '';

        if (data.status === 'success' && data.teams && data.teams.length > 0) {
            data.teams.forEach(team => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${team.teamNumber || 'N/A'}</td>
                    <td>${team.nameShort || 'N/A'}</td>
                    <td>${team.schoolName || 'N/A'}</td>
                    <td>${team.city || 'N/A'}, ${team.stateProv || 'N/A'}</td>
                `;
                tbody.appendChild(row);
            });
            addLog(`Loaded ${data.teams.length} registered teams`, 'info');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No teams found</td></tr>';
        }
    } catch (error) {
        addLog('Error loading registered teams: ' + error.message, 'error');
        const tbody = document.getElementById('teams-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Error loading teams</td></tr>';
    }
}

async function loadUsers() {
    try {
        const response = await authFetch(`${API_BASE}/admin/users`);
        const data = await response.json();

        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';

        if (data.status === 'success' && data.users.length > 0) {
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>
                        <button class="btn" onclick="resetUserPassword(${user.id})">Reset Password</button>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            addLog(`Loaded ${data.users.length} users`, 'info');
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">No users found</td></tr>';
        }
    } catch (error) {
        addLog('Error loading users: ' + error.message, 'error');
    }
}

async function createUser() {
    const teamId = document.getElementById('new-team-id').value;
    const password = document.getElementById('new-team-password').value;

    if (!teamId || !password) {
        showStatus('user-status', 'Please enter team ID and password', 'error');
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: parseInt(teamId), password })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('user-status', `User ${teamId} created successfully`, 'success');
            addLog(`Created user ${teamId}`, 'success');
            document.getElementById('new-team-id').value = '';
            document.getElementById('new-team-password').value = '';
            loadUsers();
        } else {
            showStatus('user-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to create user ${teamId}: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('user-status', 'Error: ' + error.message, 'error');
        addLog('Error creating user: ' + error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm(`Are you sure you want to delete user ${userId}?`)) {
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('user-status', `User ${userId} deleted successfully`, 'success');
            addLog(`Deleted user ${userId}`, 'success');
            loadUsers();
        } else {
            showStatus('user-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to delete user ${userId}: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('user-status', 'Error: ' + error.message, 'error');
        addLog('Error deleting user: ' + error.message, 'error');
    }
}

async function resetUserPassword(userId) {
    const newPassword = prompt(`Enter new password for user ${userId}:`);
    if (!newPassword) {
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/users/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('user-status', `Password reset for user ${userId}`, 'success');
            addLog(`Reset password for user ${userId}`, 'success');
        } else {
            showStatus('user-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to reset password for user ${userId}: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('user-status', 'Error: ' + error.message, 'error');
        addLog('Error resetting password: ' + error.message, 'error');
    }
}

// Notes Management Functions
async function viewTeamNotes() {
    const teamId = document.getElementById('notes-team-id').value;

    if (!teamId) {
        showStatus('notes-status', 'Please enter a team ID', 'error');
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/notes/${teamId}`);
        const data = await response.json();

        const display = document.getElementById('notes-display');

        if (data.status === 'success' && data.notes.length > 0) {
            let html = '<table class="users-table"><thead><tr><th>Subject Team</th><th>Auto</th><th>Teleop</th><th>General</th><th>Updated</th></tr></thead><tbody>';
            data.notes.forEach(note => {
                const date = note.updated_at ? new Date(note.updated_at * 1000).toLocaleString() : 'Never';
                html += `
                    <tr>
                        <td>${note.subject_team_id}</td>
                        <td>${note.auto_performance || '-'}</td>
                        <td>${note.teleop_performance || '-'}</td>
                        <td>${note.general_notes || '-'}</td>
                        <td>${date}</td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            display.innerHTML = html;
            addLog(`Loaded notes for team ${teamId}`, 'info');
        } else {
            display.innerHTML = '<p>No notes found for this team</p>';
        }
    } catch (error) {
        showStatus('notes-status', 'Error: ' + error.message, 'error');
        addLog('Error loading notes: ' + error.message, 'error');
    }
}

async function deleteTeamNotes() {
    const teamId = document.getElementById('notes-team-id').value;

    if (!teamId) {
        showStatus('notes-status', 'Please enter a team ID', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete all notes for team ${teamId}?`)) {
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/notes/${teamId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('notes-status', `Notes deleted for team ${teamId}`, 'success');
            addLog(`Deleted notes for team ${teamId}`, 'success');
            document.getElementById('notes-display').innerHTML = '';
        } else {
            showStatus('notes-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to delete notes for team ${teamId}: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('notes-status', 'Error: ' + error.message, 'error');
        addLog('Error deleting notes: ' + error.message, 'error');
    }
}

// Notification Management Functions
async function sendNotification() {
    const teamId = document.getElementById('notif-team-id').value;
    const title = document.getElementById('notif-title').value;
    const message = document.getElementById('notif-message').value;

    if (!title || !message) {
        showStatus('notif-status', 'Please enter title and message', 'error');
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamId: teamId ? parseInt(teamId) : null,
                title,
                message
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('notif-status', 'Notification sent successfully', 'success');
            addLog(`Sent notification: ${title}`, 'success');
            document.getElementById('notif-title').value = '';
            document.getElementById('notif-message').value = '';
        } else {
            showStatus('notif-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to send notification: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('notif-status', 'Error: ' + error.message, 'error');
        addLog('Error sending notification: ' + error.message, 'error');
    }
}

async function viewNotificationHistory() {
    try {
        const response = await authFetch(`${API_BASE}/admin/notifications`);
        const data = await response.json();

        if (data.status === 'success' && data.notifications.length > 0) {
            let log = '';
            data.notifications.slice(0, 50).forEach(notif => {
                const date = new Date(notif.sent_at * 1000).toLocaleString();
                log += `[${date}] Team ${notif.team_id}: ${notif.title} - ${notif.message}\n`;
            });
            alert('Recent Notifications:\n\n' + log);
            addLog('Viewed notification history', 'info');
        } else {
            alert('No notifications found');
        }
    } catch (error) {
        showStatus('notif-status', 'Error: ' + error.message, 'error');
        addLog('Error loading notifications: ' + error.message, 'error');
    }
}

async function clearNotificationHistory() {
    if (!confirm('Are you sure you want to clear all notification history?')) {
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/notifications`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('notif-status', 'Notification history cleared', 'success');
            addLog('Cleared notification history', 'success');
        } else {
            showStatus('notif-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to clear notifications: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('notif-status', 'Error: ' + error.message, 'error');
        addLog('Error clearing notifications: ' + error.message, 'error');
    }
}

// Database Management Functions
async function backupDatabase() {
    try {
        const response = await authFetch(`${API_BASE}/admin/database/backup`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('db-status', `Backup created: ${data.filename}`, 'success');
            addLog(`Database backed up to ${data.filename}`, 'success');
        } else {
            showStatus('db-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to backup database: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('db-status', 'Error: ' + error.message, 'error');
        addLog('Error backing up database: ' + error.message, 'error');
    }
}

async function vacuumDatabase() {
    if (!confirm('This will optimize the database. Continue?')) {
        return;
    }

    try {
        const response = await authFetch(`${API_BASE}/admin/database/vacuum`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.status === 'success') {
            showStatus('db-status', 'Database vacuumed successfully', 'success');
            addLog('Database vacuumed', 'success');
            loadStats();
        } else {
            showStatus('db-status', 'Error: ' + data.error, 'error');
            addLog(`Failed to vacuum database: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('db-status', 'Error: ' + error.message, 'error');
        addLog('Error vacuuming database: ' + error.message, 'error');
    }
}

// Login Logs Functions
async function loadLoginLogs() {
    try {
        const response = await authFetch(`${API_BASE}/admin/auth/logs`);
        const data = await response.json();

        const tbody = document.getElementById('login-logs-tbody');
        tbody.innerHTML = '';

        if (data.status === 'success' && data.logs && data.logs.length > 0) {
            data.logs.forEach(log => {
                const row = document.createElement('tr');
                const date = new Date(log.login_time * 1000).toLocaleString();
                const status = log.success ?
                    '<span style="color: #4ec9b0;">✓ Success</span>' :
                    '<span style="color: #f48771;">✗ Failed</span>';
                row.innerHTML = `
                    <td>${log.ip_address}</td>
                    <td style="font-size: 11px;">${log.user_agent || 'Unknown'}</td>
                    <td>${date}</td>
                    <td>${status}</td>
                `;
                tbody.appendChild(row);
            });
            addLog(`Loaded ${data.logs.length} login log entries`, 'info');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No login logs found</td></tr>';
        }
    } catch (error) {
        addLog('Error loading login logs: ' + error.message, 'error');
        const tbody = document.getElementById('login-logs-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Error loading logs</td></tr>';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        loadStats();
        loadUsers();
        loadRegisteredTeams();
        loadLoginLogs();
        addLog('Admin panel initialized', 'success');
    }

    // Allow Enter key to submit login
    document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adminLogin();
        }
    });
});

