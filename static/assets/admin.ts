interface AdminStats {
    totalUsers: number;
    totalNotes: number;
    totalNotifications: number;
    databaseSize: number;
}

interface AdminUser {
    id: number;
}

interface AdminNote {
    id: number;
    teamId: number;
    subjectTeamId: number;
    autoPerformance: string;
    teleopPerformance: string;
    generalNotes: string;
    updatedAt: number;
}

interface AdminNotification {
    id: number;
    teamId: number;
    title: string;
    message: string;
    sentAt: number;
}

let adminToken: string | null = null;
let currentAdminSection: string = "overview";

async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = adminToken || localStorage.getItem("token");
    
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    
    return fetch(endpoint, {
        ...options,
        headers
    });
}

async function loadAdminStats(): Promise<void> {
    try {
        const response = await adminFetch("/api/v1/admin/stats");
        if (!response.ok) {
            throw new Error("Failed to load stats");
        }
        
        const data = await response.json();
        const stats: AdminStats = data.stats;
        
        document.getElementById("stat-total-users")!.textContent = stats.totalUsers.toString();
        document.getElementById("stat-total-notes")!.textContent = stats.totalNotes.toString();
        document.getElementById("stat-total-notifications")!.textContent = stats.totalNotifications.toString();
        document.getElementById("stat-database-size")!.textContent = formatBytes(stats.databaseSize);
    } catch (error) {
        console.error("Error loading admin stats:", error);
        showAdminMessage("Failed to load statistics", "error");
    }
}

async function loadAdminUsers(): Promise<void> {
    try {
        const response = await adminFetch("/api/v1/admin/users");
        if (!response.ok) {
            throw new Error("Failed to load users");
        }
        
        const data = await response.json();
        const users: AdminUser[] = data.users;
        
        const tbody = document.querySelector("#admin-users-table tbody")!;
        tbody.innerHTML = "";
        
        for (const user of users) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <button class="admin-action-btn admin-btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                    <button class="admin-action-btn admin-btn-primary" onclick="showResetPasswordModal(${user.id})">Reset Password</button>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error("Error loading users:", error);
        showAdminMessage("Failed to load users", "error");
    }
}

async function createUser(): Promise<void> {
    const teamIdInput = document.getElementById("new-user-id") as HTMLInputElement;
    const passwordInput = document.getElementById("new-user-password") as HTMLInputElement;
    
    const teamId = parseInt(teamIdInput.value);
    const password = passwordInput.value;
    
    if (!teamId || !password) {
        showAdminMessage("Please enter team ID and password", "error");
        return;
    }
    
    try {
        const response = await adminFetch("/api/v1/admin/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: teamId,
                password: password
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to create user");
        }
        
        showAdminMessage("User created successfully", "success");
        teamIdInput.value = "";
        passwordInput.value = "";
        loadAdminUsers();
    } catch (error: any) {
        console.error("Error creating user:", error);
        showAdminMessage(error.message || "Failed to create user", "error");
    }
}

async function deleteUser(userId: number): Promise<void> {
    if (!confirm(`Are you sure you want to delete user ${userId}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await adminFetch(`/api/v1/admin/users/${userId}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error("Failed to delete user");
        }
        
        showAdminMessage("User deleted successfully", "success");
        loadAdminUsers();
    } catch (error) {
        console.error("Error deleting user:", error);
        showAdminMessage("Failed to delete user", "error");
    }
}

function showResetPasswordModal(userId: number): void {
    const modal = document.getElementById("reset-password-modal")!;
    const userIdSpan = document.getElementById("reset-password-user-id")!;
    const passwordInput = document.getElementById("reset-password-input") as HTMLInputElement;
    
    userIdSpan.textContent = userId.toString();
    passwordInput.value = "";
    modal.style.display = "flex";
    
    (window as any).currentResetUserId = userId;
}

function hideResetPasswordModal(): void {
    const modal = document.getElementById("reset-password-modal")!;
    modal.style.display = "none";
    (window as any).currentResetUserId = null;
}

async function resetPassword(): Promise<void> {
    const userId = (window as any).currentResetUserId;
    const passwordInput = document.getElementById("reset-password-input") as HTMLInputElement;
    const password = passwordInput.value;
    
    if (!password) {
        showAdminMessage("Please enter a new password", "error");
        return;
    }
    
    try {
        const response = await adminFetch(`/api/v1/admin/users/${userId}/password`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
            throw new Error("Failed to reset password");
        }
        
        showAdminMessage("Password reset successfully", "success");
        hideResetPasswordModal();
    } catch (error) {
        console.error("Error resetting password:", error);
        showAdminMessage("Failed to reset password", "error");
    }
}

async function loadAdminNotes(): Promise<void> {
    try {
        const response = await adminFetch("/api/v1/admin/notes");
        if (!response.ok) {
            throw new Error("Failed to load notes");
        }
        
        const data = await response.json();
        const notes: AdminNote[] = data.notes;
        
        const container = document.getElementById("admin-notes-list")!;
        container.innerHTML = "";
        
        if (notes.length === 0) {
            container.innerHTML = `<div class="admin-empty-state">No notes found</div>`;
            return;
        }
        
        for (const note of notes) {
            const hasContent = note.autoPerformance || note.teleopPerformance || note.generalNotes;
            
            const card = document.createElement("div");
            card.className = "admin-note-card";
            card.innerHTML = `
                <div class="admin-note-header">
                    <div class="admin-note-meta">
                        <span class="admin-note-label">Team ${note.teamId} → Team ${note.subjectTeamId}</span>
                        <span class="admin-note-date">${new Date(note.updatedAt * 1000).toLocaleString()}</span>
                    </div>
                    <button class="admin-action-btn admin-btn-danger admin-btn-small" onclick="deleteNote(${note.id})">Delete</button>
                </div>
                ${hasContent ? `
                    <div class="admin-note-content">
                        ${note.autoPerformance ? `
                            <div class="admin-note-field">
                                <strong>Auto Performance:</strong>
                                <p>${escapeHtml(note.autoPerformance)}</p>
                            </div>
                        ` : ""}
                        ${note.teleopPerformance ? `
                            <div class="admin-note-field">
                                <strong>Teleop Performance:</strong>
                                <p>${escapeHtml(note.teleopPerformance)}</p>
                            </div>
                        ` : ""}
                        ${note.generalNotes ? `
                            <div class="admin-note-field">
                                <strong>General Notes:</strong>
                                <p>${escapeHtml(note.generalNotes)}</p>
                            </div>
                        ` : ""}
                    </div>
                ` : `<div class="admin-note-empty">No content</div>`}
            `;
            container.appendChild(card);
        }
    } catch (error) {
        console.error("Error loading notes:", error);
        showAdminMessage("Failed to load notes", "error");
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function deleteNote(noteId: number): Promise<void> {
    if (!confirm("Are you sure you want to delete this note?")) {
        return;
    }
    
    try {
        const response = await adminFetch(`/api/v1/admin/notes/${noteId}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error("Failed to delete note");
        }
        
        showAdminMessage("Note deleted successfully", "success");
        loadAdminNotes();
        loadAdminStats();
    } catch (error) {
        console.error("Error deleting note:", error);
        showAdminMessage("Failed to delete note", "error");
    }
}

async function loadAdminNotifications(): Promise<void> {
    try {
        const response = await adminFetch("/api/v1/admin/notifications");
        if (!response.ok) {
            throw new Error("Failed to load notifications");
        }
        
        const data = await response.json();
        const notifications: AdminNotification[] = data.notifications;
        
        const container = document.getElementById("admin-notifications-list")!;
        container.innerHTML = "";
        
        if (notifications.length === 0) {
            container.innerHTML = `<div class="admin-empty-state">No notifications sent yet</div>`;
            return;
        }
        
        for (const notif of notifications) {
            const card = document.createElement("div");
            card.className = "admin-notification-card";
            card.innerHTML = `
                <div class="admin-notification-header">
                    <span class="admin-notification-team">Team ${notif.teamId}</span>
                    <span class="admin-notification-date">${new Date(notif.sentAt * 1000).toLocaleString()}</span>
                </div>
                <div class="admin-notification-title">${escapeHtml(notif.title)}</div>
                <div class="admin-notification-message">${escapeHtml(notif.message)}</div>
            `;
            container.appendChild(card);
        }
    } catch (error) {
        console.error("Error loading notifications:", error);
        showAdminMessage("Failed to load notifications", "error");
    }
}

async function sendNotification(): Promise<void> {
    const teamIdInput = document.getElementById("notif-team-id") as HTMLInputElement;
    const titleInput = document.getElementById("notif-title") as HTMLInputElement;
    const messageInput = document.getElementById("notif-message") as HTMLTextAreaElement;
    const priorityInput = document.getElementById("notif-priority") as HTMLSelectElement;
    
    const teamId = parseInt(teamIdInput.value);
    const title = titleInput.value;
    const message = messageInput.value;
    const priority = parseInt(priorityInput.value);
    
    if (!teamId || !title || !message) {
        showAdminMessage("Please fill in all fields", "error");
        return;
    }
    
    try {
        const response = await adminFetch("/api/v1/admin/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                teamId,
                title,
                message,
                priority
            })
        });
        
        if (!response.ok) {
            throw new Error("Failed to send notification");
        }
        
        showAdminMessage("Notification sent successfully", "success");
        teamIdInput.value = "";
        titleInput.value = "";
        messageInput.value = "";
        priorityInput.value = "3";
        loadAdminNotifications();
        loadAdminStats();
    } catch (error) {
        console.error("Error sending notification:", error);
        showAdminMessage("Failed to send notification", "error");
    }
}

async function clearNotificationHistory(): Promise<void> {
    if (!confirm("Are you sure you want to clear all notification history? This action cannot be undone.")) {
        return;
    }
    
    try {
        const response = await adminFetch("/api/v1/admin/notifications/clear", {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error("Failed to clear notifications");
        }
        
        showAdminMessage("Notification history cleared", "success");
        loadAdminNotifications();
        loadAdminStats();
    } catch (error) {
        console.error("Error clearing notifications:", error);
        showAdminMessage("Failed to clear notifications", "error");
    }
}

async function vacuumDatabase(): Promise<void> {
    if (!confirm("Are you sure you want to vacuum the database? This may take a few moments.")) {
        return;
    }
    
    try {
        const response = await adminFetch("/api/v1/admin/database/vacuum", {
            method: "POST"
        });
        
        if (!response.ok) {
            throw new Error("Failed to vacuum database");
        }
        
        showAdminMessage("Database vacuumed successfully", "success");
        loadAdminStats();
    } catch (error) {
        console.error("Error vacuuming database:", error);
        showAdminMessage("Failed to vacuum database", "error");
    }
}

function switchAdminSection(section: string): void {
    const sections = ["overview", "users", "notes", "notifications", "database"];
    
    sections.forEach(s => {
        const sectionEl = document.getElementById(`admin-section-${s}`);
        const navBtn = document.getElementById(`admin-nav-${s}`);
        
        if (sectionEl) {
            sectionEl.style.display = s === section ? "block" : "none";
        }
        
        if (navBtn) {
            if (s === section) {
                navBtn.classList.add("admin-nav-active");
            } else {
                navBtn.classList.remove("admin-nav-active");
            }
        }
    });
    
    currentAdminSection = section;
    
    if (section === "overview") {
        loadAdminStats();
    } else if (section === "users") {
        loadAdminUsers();
    } else if (section === "notes") {
        loadAdminNotes();
    } else if (section === "notifications") {
        loadAdminNotifications();
    }
}

function showAdminMessage(message: string, type: "success" | "error" | "info"): void {
    const messageEl = document.getElementById("admin-message")!;
    messageEl.textContent = message;
    messageEl.className = `admin-message admin-message-${type}`;
    messageEl.style.display = "block";
    
    setTimeout(() => {
        messageEl.style.display = "none";
    }, 5000);
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function initializeAdmin(): void {
    adminToken = localStorage.getItem("adminToken");
    
    if (adminToken) {
        document.getElementById("admin-login")!.style.display = "none";
        document.getElementById("admin-container")!.style.display = "block";
        switchAdminSection("overview");
    }
}

(window as any).createUser = createUser;
(window as any).deleteUser = deleteUser;
(window as any).showResetPasswordModal = showResetPasswordModal;
(window as any).hideResetPasswordModal = hideResetPasswordModal;
(window as any).resetPassword = resetPassword;
(window as any).deleteNote = deleteNote;
(window as any).sendNotification = sendNotification;
(window as any).clearNotificationHistory = clearNotificationHistory;
(window as any).vacuumDatabase = vacuumDatabase;
(window as any).switchAdminSection = switchAdminSection;

if (typeof window !== "undefined") {
    initializeAdmin();
}
