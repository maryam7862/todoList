const HOST = window.location.hostname || '127.0.0.1';
const API_BASE = `http://${HOST}:5000/api`;
const UPLOAD_BASE = `http://${HOST}:5000/uploads`;
let authToken = null;
let currentUser = null;
let allTasks = [];
let currentFilter = 'all';
let selectedTasks = new Set();

const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const authForms = document.querySelectorAll('.auth-form');
const logoutBtn = document.getElementById('logoutBtn');
const addTaskForm = document.getElementById('addTaskForm');
const tasksList = document.getElementById('tasksList');
const taskHistoryList = document.getElementById('taskHistoryList');
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const filterBtns = document.querySelectorAll('.filter-btn');
const pomodoroTimers = {};
const DEFAULT_POMODORO_SECONDS = 25 * 60;

async function apiFetch(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = isFormData ? { ...(options.headers || {}) } : { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (authToken) headers['x-auth-token'] = authToken;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            const message = isJson ? data?.message || data || response.statusText : await response.text();
            throw new Error(message || 'Server error');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
        }
        throw error;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        showApp();
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    try {
        const data = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        showApp();
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
}

function showApp() {
    authContainer.classList.remove('active');
    appContainer.classList.add('active');
    document.getElementById('userName').innerHTML = `<i class="fas fa-id-badge"></i> ${currentUser.name}`;
    document.getElementById('userEmail').innerText = currentUser.email;
    const greetingElement = document.getElementById('greeting');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    greetingElement.innerText = `${greeting}, ${currentUser.name}!`;
}

function showAuth() {
    appContainer.classList.remove('active');
    authContainer.classList.add('active');
}

async function loadTasks() {
    Object.keys(pomodoroTimers).forEach((taskId) => stopPomodoro(taskId));
    try {
        const rawTasks = await apiFetch('/tasks');
        allTasks = rawTasks.map((task) => ({
            ...task,
            _id: String(task.id),
            completed: task.completed === true || task.completed === 1 || task.completed === '1' || task.completed === 'true',
            slidesFile: task.slidesFile || null,
            notesFile: task.notesFile || null,
            uploads: {
                slides: task.slidesFile ? {
                    name: task.slidesFile,
                    url: `${UPLOAD_BASE}/${encodeURIComponent(task.slidesFile)}`
                } : null,
                notes: task.notesFile ? {
                    name: task.notesFile,
                    url: `${UPLOAD_BASE}/${encodeURIComponent(task.notesFile)}`
                } : null
            }
        }));
        renderTasks();
        updateStats();
    } catch (error) {
        console.error(error);
        alert('Unable to load tasks. Please try again.');
    }
}

async function addTask(event) {
    event.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value || null;
    const progress = Number(document.getElementById('taskProgress').value || 0);
    const pomodoroSessions = Number(document.getElementById('taskPomodoroSessions').value || 0);
    const completed = document.getElementById('taskCompleted').value === '1';

    if (!title) return alert('Please enter a task title.');

    try {
        await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description, priority, dueDate, progress, pomodoroSessions, completed })
        });
        addTaskForm.reset();
        document.getElementById('taskProgressValue').innerText = '0%';
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

async function toggleComplete(taskId, currentStatus) {
    const task = allTasks.find((item) => String(item._id) === String(taskId));
    if (!task) return;

    try {
        task.completed = !currentStatus;
        await apiFetch(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                priority: task.priority,
                dueDate: task.dueDate,
                progress: task.progress,
                pomodoroSessions: task.pomodoroSessions,
                completed: task.completed,
                slidesFile: task.slidesFile,
                notesFile: task.notesFile
            })
        });
        await loadTasks();
    } catch (error) {
        console.error('Error marking task complete:', error);
        alert(error.message);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task permanently?')) return;
    try {
        await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

function openEditModal(task) {
    document.getElementById('editTaskId').value = task._id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editCompleted').value = task.completed ? '1' : '0';
    document.getElementById('editProgress').value = task.progress || 0;
    document.getElementById('editProgressValue').innerText = `${task.progress || 0}%`;
    document.getElementById('editPomodoroSessions').value = task.pomodoroSessions || 0;
    document.getElementById('editDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
    editModal.classList.add('active');
}

async function saveEdit(event) {
    event.preventDefault();
    const id = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const priority = document.getElementById('editPriority').value;
    const completed = document.getElementById('editCompleted').value === '1';
    const progress = Number(document.getElementById('editProgress').value || 0);
    const pomodoroSessions = Number(document.getElementById('editPomodoroSessions').value || 0);
    const dueDate = document.getElementById('editDueDate').value || null;

    if (!title) return alert('Title cannot be empty.');

    try {
        const task = allTasks.find((item) => item._id === id);
        await apiFetch(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, description, priority, completed, progress, pomodoroSessions, dueDate, slidesFile: task?.slidesFile, notesFile: task?.notesFile })
        });
        editModal.classList.remove('active');
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

function stopPomodoro(taskId) {
    if (!pomodoroTimers[taskId]) return;
    clearInterval(pomodoroTimers[taskId].interval);
    delete pomodoroTimers[taskId];
    const button = document.getElementById(`pomodoroBtn-${taskId}`);
    const label = document.getElementById(`timerLabel-${taskId}`);
    if (button) button.textContent = 'Start Pomodoro';
    if (label) label.textContent = '25:00';
}

function triggerFileInput(taskId, type) {
    const input = document.getElementById(`${type}Input-${taskId}`);
    if (input) {
        input.value = null;
        input.click();
    }
}

async function handleFileUpload(taskId, type, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        await apiFetch(`/tasks/${taskId}/upload?type=${type}`, {
            method: 'POST',
            body: formData,
            headers: {}
        });
        await loadTasks();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Unable to upload file.');
    }
}

async function completePomodoroSession(taskId) {
    const task = allTasks.find((item) => item._id === taskId);
    if (!task) return;

    const updatedSessions = (task.pomodoroSessions || 0) + 1;
    const updatedProgress = Math.min(100, (task.progress || 0) + 10);
    const updatedCompleted = task.completed || updatedProgress >= 100;

    try {
        await apiFetch(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                priority: task.priority,
                dueDate: task.dueDate,
                progress: updatedProgress,
                pomodoroSessions: updatedSessions,
                completed: updatedCompleted,
                slidesFile: task.slidesFile,
                notesFile: task.notesFile
            })
        });
        await loadTasks();
    } catch (error) {
        console.error(error);
    }
}

function togglePomodoro(taskId) {
    const existing = pomodoroTimers[taskId];
    if (existing) {
        stopPomodoro(taskId);
        return;
    }

    const button = document.getElementById(`pomodoroBtn-${taskId}`);
    const label = document.getElementById(`timerLabel-${taskId}`);
    if (!button || !label) return;

    let remaining = DEFAULT_POMODORO_SECONDS;
    button.textContent = 'Stop';
    label.textContent = formatTime(remaining);

    const interval = setInterval(async () => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(interval);
            delete pomodoroTimers[taskId];
            button.textContent = 'Start Pomodoro';
            label.textContent = '25:00';
            await completePomodoroSession(taskId);
        } else {
            label.textContent = formatTime(remaining);
        }
    }, 1000);

    pomodoroTimers[taskId] = { interval };
}

function renderTasks() {
    const filteredTasks = allTasks.filter((task) => {
        if (currentFilter === 'active') return task.completed === false;
        if (currentFilter === 'completed') return task.completed === true;
        return true;
    });
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-state">\n        <p>✨ No tasks yet.</p>\n        <p>Add a new task to get started.</p>\n        </div>';
        updateBulkActionsBar();
        renderTaskHistory();
        return;
    }

    tasksList.innerHTML = filteredTasks.map((task) => {
        const dueDateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const isSelected = selectedTasks.has(task._id);
        return `
            <div class="task-card ${isSelected ? 'selected' : ''}" data-id="${task._id}">
                <div class="task-select ${isSelected ? 'checked' : ''}" onclick="toggleTaskSelection('${task._id}', event)">
                    ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="toggleComplete('${task._id}', ${task.completed})">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        ${dueDateText ? `<span><i class="far fa-calendar-alt"></i> ${dueDateText}</span>` : ''}
                    </div>
                    <div class="task-progress">
                        <div class="progress-value"><span>Progress</span><span>${task.progress}%</span></div>
                        <div class="progress-bar"><span style="width: ${task.progress}%"></span></div>
                    </div>
                    <div class="pomodoro-panel">
                        <span class="pomodoro-chip"><i class="fas fa-stopwatch"></i> ${task.pomodoroSessions} pomodoro</span>
                        <button class="timer-button" type="button" id="pomodoroBtn-${task._id}" onclick="togglePomodoro('${task._id}')">Start Pomodoro</button>
                        <span class="timer-label" id="timerLabel-${task._id}">25:00</span>
                    </div>
                </div>
                <div class="task-actions">
                    <div class="upload-group">
                        <button class="upload-btn upload-slides-btn" type="button" onclick="triggerFileInput('${task._id}', 'slides')"><i class="fas fa-file-powerpoint"></i><span>Upload Slides</span></button>
                        ${task.uploads?.slides ? `<a class="upload-preview" href="${task.uploads.slides.url}" target="_blank" rel="noopener"><i class="fas fa-file-powerpoint"></i> ${escapeHtml(task.uploads.slides.name)}</a>` : ''}
                    </div>
                    <div class="upload-group">
                        <button class="upload-btn upload-notes-btn" type="button" onclick="triggerFileInput('${task._id}', 'notes')"><i class="fas fa-file-lines"></i><span>Upload Notes</span></button>
                        ${task.uploads?.notes ? `<a class="upload-preview" href="${task.uploads.notes.url}" target="_blank" rel="noopener"><i class="fas fa-file-lines"></i> ${escapeHtml(task.uploads.notes.name)}</a>` : ''}
                    </div>
                    <button class="edit-btn" type="button" onclick="openEditModalById('${task._id}')"><i class="fas fa-edit"></i><span>Edit</span></button>
                    <button class="delete-btn" type="button" onclick="deleteTask('${task._id}')"><i class="fas fa-trash"></i><span>Delete</span></button>
                </div>
                <input type="file" id="slidesInput-${task._id}" class="task-file-input" accept="application/pdf" onchange="handleFileUpload('${task._id}', 'slides', event)">
                <input type="file" id="notesInput-${task._id}" class="task-file-input" accept="application/pdf" onchange="handleFileUpload('${task._id}', 'notes', event)">
            </div>
        `;
    }).join('');
    
    updateBulkActionsBar();
    renderTaskHistory();
}

function openEditModalById(taskId) {
    const task = allTasks.find((item) => String(item._id) === String(taskId));
    if (task) openEditModal(task);
}

function updateStats() {
    document.getElementById('totalTasks').innerText = allTasks.length;
    document.getElementById('completedTasks').innerText = allTasks.filter((task) => task.completed).length;
}

function renderTaskHistory() {
    if (!taskHistoryList) return;

    const completedTasks = allTasks.filter((task) => task.completed === true);
    if (completedTasks.length === 0) {
        taskHistoryList.innerHTML = '<div class="history-empty"><p>Completed tasks will appear here as your task history grows.</p></div>';
        return;
    }

    taskHistoryList.innerHTML = completedTasks.map((task) => {
        const dueDateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
        return `
            <div class="history-task">
                <div class="history-title"><i class="fas fa-check-circle"></i><span>${escapeHtml(task.title)}</span></div>
                <div class="history-meta">${dueDateText} • ${task.pomodoroSessions || 0} pomodoro</div>
            </div>
        `;
    }).join('');
}

function toggleTaskSelection(taskId, event) {
    event.stopPropagation();
    if (selectedTasks.has(taskId)) {
        selectedTasks.delete(taskId);
    } else {
        selectedTasks.add(taskId);
    }
    renderTasks();
}

function updateBulkActionsBar() {
    const bulkBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedTasks.size > 0) {
        bulkBar.style.display = 'block';
        selectedCount.innerText = `${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} selected`;
    } else {
        bulkBar.style.display = 'none';
    }
}

async function markSelectedAsCompleted() {
    if (selectedTasks.size === 0) return;
    
    const confirmMsg = `Mark ${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} as completed?`;
    if (!confirm(confirmMsg)) return;
    
    try {
        for (const taskId of selectedTasks) {
            const task = allTasks.find((item) => String(item._id) === String(taskId));
            if (!task) continue;
            const res = await apiFetch(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    progress: task.progress,
                    pomodoroSessions: task.pomodoroSessions,
                    completed: true,
                    slidesFile: task.slidesFile,
                    notesFile: task.notesFile
                })
            });
        }
        selectedTasks.clear();
        await loadTasks();
    } catch (error) {
        console.error('Error in markSelectedAsCompleted:', error);
        alert(error.message);
    }
}

function clearSelection() {
    selectedTasks.clear();
    renderTasks();
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

filterBtns.forEach((button) => {
    button.addEventListener('click', () => {
        filterBtns.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
logoutBtn.addEventListener('click', logout);
addTaskForm.addEventListener('submit', addTask);
editTaskForm.addEventListener('submit', saveEdit);

const markCompletedBtn = document.getElementById('markCompletedBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

if (markCompletedBtn) {
    markCompletedBtn.addEventListener('click', markSelectedAsCompleted);
}

if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', clearSelection);
}

const taskProgressInput = document.getElementById('taskProgress');
const taskProgressValue = document.getElementById('taskProgressValue');
const editProgressInput = document.getElementById('editProgress');
const editProgressValue = document.getElementById('editProgressValue');

if (taskProgressInput && taskProgressValue) {
    taskProgressInput.addEventListener('input', () => {
        taskProgressValue.innerText = `${taskProgressInput.value}%`;
    });
}

if (editProgressInput && editProgressValue) {
    editProgressInput.addEventListener('input', () => {
        editProgressValue.innerText = `${editProgressInput.value}%`;
    });
}

document.querySelector('.close-modal').addEventListener('click', () => editModal.classList.remove('active'));
document.querySelector('.cancel-btn').addEventListener('click', () => editModal.classList.remove('active'));

tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        tabBtns.forEach((button) => button.classList.remove('active'));
        authForms.forEach((form) => form.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}Form`).classList.add('active');
    });
});

(function init() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showApp();
        loadTasks();
    } else {
        showAuth();
    }
})();
