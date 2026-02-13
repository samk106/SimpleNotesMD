let db, currentNoteId = null, sortKey = 'updated', sortOrder = 'desc';

// Mobile tab switching for Editor/Preview
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const workspace = document.getElementById('workspaceContainer');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.view === 'preview') {
                workspace.classList.add('preview-mode');
                // Update preview when switching to it
                updatePreview();
            } else {
                workspace.classList.remove('preview-mode');
            }
        });
    });
    
    // Mobile keyboard handling - prevent viewport shift
    if (window.innerWidth <= 768) {
        const editor = document.getElementById('editor');
        
        // When editor gets focus, add class to body
        editor.addEventListener('focus', () => {
            document.body.classList.add('keyboard-open');
        });
        
        // When editor loses focus, remove class
        editor.addEventListener('blur', () => {
            document.body.classList.remove('keyboard-open');
        });
        
        // Scroll editor to cursor position when typing
        editor.addEventListener('input', () => {
            if (document.activeElement === editor) {
                editor.scrollTop = editor.scrollHeight;
            }
        });
    }
});

// Draggable Logic - supports both horizontal and vertical
const workspace = document.getElementById('workspaceContainer');
const dragBar = document.getElementById('dragBar');
let isDragging = false;

if (dragBar) {
    dragBar.addEventListener('mousedown', () => isDragging = true);
    dragBar.addEventListener('touchstart', () => isDragging = true);
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        handleResize(e.clientX, e.clientY);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        handleResize(touch.clientX, touch.clientY);
    });
    
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('touchend', () => isDragging = false);
}

function handleResize(clientX, clientY) {
    const rect = workspace.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Vertical Resize for Mobile
        let perc = ((clientY - rect.top) / rect.height) * 100;
        perc = Math.max(10, Math.min(90, perc));
        workspace.style.gridTemplateColumns = "1fr"; // Reset columns
        workspace.style.gridTemplateRows = `${perc}% 6px 1fr`;
    } else {
        // Horizontal Resize for PC
        let perc = ((clientX - rect.left) / rect.width) * 100;
        perc = Math.max(15, Math.min(85, perc));
        workspace.style.gridTemplateRows = "1fr"; // Reset rows
        workspace.style.gridTemplateColumns = `${perc}% 6px 1fr`;
    }
}

// Ensure the dropdown toggler works correctly
function toggleDropdown(id) {
    // Close other dropdowns first
    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== id) d.classList.remove('show');
    });
    document.getElementById(id).classList.toggle('show');
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn') && !event.target.closest('.dropdown-btn')) {
        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    }
}

function resetSplit() { 
    workspace.style.gridTemplateColumns = "1fr 6px 1fr"; 
}

// Theme Toggle Function
function toggleTheme() {
    const body = document.body;
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    const themeText = document.querySelector('.theme-text');
    
    body.classList.toggle('light-theme');
    
    // Toggle icon visibility
    if (body.classList.contains('light-theme')) {
        sunIcons.forEach(icon => icon.style.display = 'none');
        moonIcons.forEach(icon => icon.style.display = 'block');
        if (themeText) themeText.textContent = 'Light Mode';
        localStorage.setItem('theme', 'light');
    } else {
        sunIcons.forEach(icon => icon.style.display = 'block');
        moonIcons.forEach(icon => icon.style.display = 'none');
        if (themeText) themeText.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'dark');
    }
    
    closeAllDropdowns();
}

// Load saved theme on page load
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    const themeText = document.querySelector('.theme-text');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        sunIcons.forEach(icon => icon.style.display = 'none');
        moonIcons.forEach(icon => icon.style.display = 'block');
        if (themeText) themeText.textContent = 'Light Mode';
    }
}

// Dropdown Menu Functionality
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Toggle dropdown on button click
document.addEventListener('click', function(e) {
    const dropdownToggle = e.target.closest('.dropdown-toggle');
    
    if (dropdownToggle) {
        e.stopPropagation();
        const dropdown = dropdownToggle.closest('.dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        const isOpen = menu.classList.contains('show');
        
        // Close all other dropdowns
        closeAllDropdowns();
        
        // Toggle current dropdown
        if (!isOpen) {
            menu.classList.add('show');
        }
    } else if (!e.target.closest('.dropdown-menu')) {
        // Close all dropdowns if clicking outside
        closeAllDropdowns();
    }
});

// Close dropdown when clicking a menu item
document.addEventListener('click', function(e) {
    if (e.target.closest('.dropdown-item')) {
        setTimeout(closeAllDropdowns, 100);
    }
});

// Call loadTheme after DOM is ready
document.addEventListener('DOMContentLoaded', loadTheme);

// Database initialization
const request = indexedDB.open("SimpleMD_DB", 1);
request.onsuccess = e => { 
    db = e.target.result; 
    checkAndCreateDefaultNote();
};
request.onupgradeneeded = e => { 
    e.target.result.createObjectStore("notes", { keyPath: "id" }); 
};

// Check if database is empty and create default note
function checkAndCreateDefaultNote() {
    const transaction = db.transaction("notes", "readonly");
    const store = transaction.objectStore("notes");
    const countRequest = store.count();
    
    countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
            // Database is empty, create a default welcome note
            const id = Date.now();
            const defaultNote = {
                id,
                title: "Welcome to SimpleMD",
                content: `---
title: Welcome to SimpleMD
tags: welcome, getting-started
---

# Welcome to SimpleMD! 👋

This is your markdown editor. Start writing your notes here.

## Features
- **Markdown Support**: Write in markdown and see live preview
- **Multiple Notes**: Create and organize multiple notes
- **Dark/Light Mode**: Toggle between themes
- **Export/Import**: Backup your notes as ZIP files

## Quick Tips
- Use the toolbar above to format your text
- Click **+ New Note** to create a new note
- Your notes are automatically saved
- Toggle dark/light mode with the sun/moon icon

Happy writing! ✨`,
                tags: ["welcome", "getting-started"],
                summary: "This is your markdown editor. Start writing your notes here.",
                updated: id
            };
            
            const addTransaction = db.transaction("notes", "readwrite");
            addTransaction.objectStore("notes").add(defaultNote).onsuccess = () => {
                loadNote(id);
                renderSidebar();
            };
        } else {
            // Load the most recent note
            renderSidebar();
            loadLastNote();
        }
    };
}

// Meta Parsing & Text Utils
function parseMeta(content) {
    const meta = { title: "Untitled", tags: [], summary: "" };
    const cleanContent = content.replace(/^---[\s\S]*?---/, '').trim();
    meta.summary = cleanContent.substring(0, 80).replace(/\n/g, ' ');
    const match = content.match(/^---([\s\S]*?)---/);
    if (match) {
        match[1].split('\n').forEach(line => {
            const [k, ...v] = line.split(':');
            if (v.length) {
                const key = k.trim().toLowerCase();
                const val = v.join(':').trim();
                if (key === 'title') meta.title = val;
                if (key === 'tags') meta.tags = val.split(',').map(t => t.trim()).filter(t => t);
            }
        });
    }
    return meta;
}

function highlightText(text, terms) {
    if (!terms || !terms.length || !text) return text || "";
    let h = text;
    terms.forEach(t => {
        const r = new RegExp(`(${t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, "gi");
        h = h.replace(r, "<mark>$1</mark>");
    });
    return h;
}

// App Core Functions
function saveCurrentNote() {
    if (!currentNoteId) return;
    const content = document.getElementById('editor').value;
    const meta = parseMeta(content);
    const note = { 
        id: currentNoteId, content, title: meta.title, 
        tags: meta.tags, summary: meta.summary, 
        updated: Date.now() 
    };
    db.transaction("notes", "readwrite").objectStore("notes").put(note);
    document.getElementById('displayTitle').innerText = meta.title;
    updatePreview();
    renderSidebar();
}

function deleteNote(noteId) {
    if (!confirm("Delete this note?")) return;
    db.transaction("notes", "readwrite").objectStore("notes").delete(noteId).onsuccess = () => { 
        if (currentNoteId === noteId) {
            currentNoteId = null;
            loadLastNote();
        }
        renderSidebar(); 
    };
}

function deleteAllNotes() {
    if (!confirm("Delete ALL notes? This action cannot be undone!")) return;
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = () => {
        currentNoteId = null;
        document.getElementById('editor').value = '';
        document.getElementById('preview').innerHTML = '';
        document.getElementById('displayTitle').innerText = 'Welcome';
        renderSidebar();
        alert("All notes have been deleted.");
    };
}

function loadNote(id) {
    db.transaction("notes").objectStore("notes").get(id).onsuccess = e => {
        const n = e.target.result;
        if (!n) return;
        currentNoteId = id;
        document.getElementById('editor').value = n.content;
        document.getElementById('displayTitle').innerText = n.title;
        updatePreview();
        renderSidebar();
    };
}

async function createNewNote() {
    const id = Date.now();
    const note = { 
        id, title: "New Note", 
        content: "---\ntitle: New Note\ntags: \n---\n", 
        updated: id, tags: [], summary: "" 
    };
    db.transaction("notes", "readwrite").objectStore("notes").add(note).onsuccess = () => loadNote(id);
}

function renderSidebar() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    db.transaction("notes").objectStore("notes").getAll().onsuccess = e => {
        const container = document.getElementById('noteList');
        container.innerHTML = '';
        
        const filtered = e.target.result.filter(n => n.title.toLowerCase().includes(query));
        filtered.sort((a,b) => b.updated - a.updated).forEach(n => {
            const item = document.createElement('div');
            item.className = `note-item ${n.id === currentNoteId ? 'active' : ''}`;
            
            // Create note title and delete button container
            const noteContent = document.createElement('div');
            noteContent.className = 'note-item-content';
            noteContent.innerHTML = `
                <span class="note-title" data-title="${n.title}">${n.title}</span>
                <button class="note-delete-btn" onclick="event.stopPropagation(); deleteNote(${n.id})" title="Delete note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            
            item.appendChild(noteContent);
            item.onclick = () => loadNote(n.id);
            container.appendChild(item);
        });
        
        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 13px;">No notes found</div>';
        }
    };
}

// Library Table Logic
function setSort(k) { 
    sortOrder = (sortKey === k && sortOrder === 'asc') ? 'desc' : 'asc'; 
    sortKey = k; 
    renderLibraryTable(); 
}

function renderLibraryTable() {
    const filter = document.getElementById('libFilter').value.toLowerCase();
    const terms = filter.split(/\s+/).filter(t => t);
    db.transaction("notes").objectStore("notes").getAll().onsuccess = e => {
        const body = document.getElementById('libBody');
        body.innerHTML = '';
        ['title', 'updated'].forEach(id => {
            const el = document.getElementById(`sort-${id}`);
            if(el) el.innerText = sortKey === id ? (sortOrder === 'asc' ? '↑' : '↓') : '↕';
        });
        e.target.result.filter(n => terms.every(t => (n.title + (n.tags||[]).join("") + n.content).toLowerCase().includes(t)))
        .sort((a,b) => sortOrder === 'asc' ? (a[sortKey] > b[sortKey] ? 1 : -1) : (a[sortKey] < b[sortKey] ? 1 : -1))
        .forEach(n => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:#2563eb;cursor:pointer;font-weight:600;" onclick="openFromLib(${n.id})">${highlightText(n.title, terms)}</td>
                <td style="font-size:12px;color:#6b7280;">${new Date(n.updated).toLocaleDateString()}</td>
                <td>${(n.tags||[]).map(t => `<span class="tag-pill">${highlightText(t, terms)}</span>`).join('')}</td>
                <td style="color:#9ca3af;font-size:12px;">${highlightText(n.summary, terms)}</td>`;
            body.appendChild(tr);
        });
    };
}

function toggleLibrary() { 
    const v = document.getElementById('libraryView'); 
    v.style.display = (v.style.display === 'flex' ? 'none' : 'flex'); 
    if(v.style.display === 'flex') renderLibraryTable(); 
}

function openFromLib(id) { toggleLibrary(); loadNote(id); }

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const list = document.querySelector('.list-container');
    const header = document.querySelector('.sidebar-header');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile: Toggle overlay
        sidebar.classList.toggle('mobile-open');
        
        if (sidebar.classList.contains('mobile-open')) {
            toggleBtn.innerText = '‹';
        } else {
            toggleBtn.innerText = '›';
        }
    } else {
        // Desktop: Toggle collapse
        sidebar.classList.toggle('hidden');

        if (sidebar.classList.contains('hidden')) {
            toggleBtn.innerText = '›';
            if(list) list.style.display = 'none';
            if(header) header.style.display = 'none';
        } else {
            toggleBtn.innerText = '‹';
            if(list) list.style.display = 'block';
            if(header) header.style.display = 'flex';
        }

        window.dispatchEvent(new Event('resize'));
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
            toggleBtn.innerText = '›';
        }
    }
});

// Auto-close sidebar after selecting a note on mobile
const originalLoadNote = loadNote;
loadNote = function(id) {
    originalLoadNote(id);
    
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        sidebar.classList.remove('mobile-open');
        toggleBtn.innerText = '›';
    }
};

function updatePreview() { 
    const rawContent = document.getElementById('editor').value.replace(/^---[\s\S]*?---/, '');
    let htmlOutput = marked.parse(rawContent);

    // Create a temporary element to manipulate the HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlOutput;

    // Find all links or paragraphs that contain a youtube link
    const links = tempDiv.querySelectorAll('a, p');
    
    links.forEach(el => {
        const text = el.innerText || el.textContent;
        const ytMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        
        if (ytMatch) {
            const videoId = ytMatch[1];
            const videoHTML = `
                <div class="video-wrapper" style="margin: 20px 0; border-radius: 12px; overflow: hidden; aspect-ratio: 16/9; background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <iframe 
                        width="100%" height="100%" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>`;
            
            // Replace the entire element (the link or the paragraph) with the video
            el.outerHTML = videoHTML;
        }
    });

    document.getElementById('preview').innerHTML = tempDiv.innerHTML; 
}

function loadLastNote() { 
    db.transaction("notes").objectStore("notes").openCursor(null, 'prev').onsuccess = e => { 
        if (e.target.result) loadNote(e.target.result.value.id); 
    }; 
}

// Backup & Import
async function importBackup(input) {
    if(!input.files.length) return;
    const zip = await JSZip.loadAsync(input.files[0]);
    const notes = [];
    for (const path in zip.files) {
        if (path.endsWith(".md")) {
            const content = await zip.files[path].async("string");
            const meta = parseMeta(content);
            notes.push({ 
                id: Date.now() + Math.random(), content, 
                title: meta.title, tags: meta.tags, 
                summary: meta.summary,
                updated: Date.now() 
            });
        }
    }
    const tx = db.transaction("notes", "readwrite");
    notes.forEach(n => tx.objectStore("notes").put(n));
    tx.oncomplete = () => location.reload();
}

async function exportBackup() {
    const zip = new JSZip();
    db.transaction("notes").objectStore("notes").getAll().onsuccess = e => {
        e.target.result.forEach(n => zip.file(`${n.title}.md`, n.content));
        zip.generateAsync({type:"blob"}).then(blob => {
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blob); 
            a.download = "SimpleMD_Backup.zip"; 
            a.click();
        });
    };
}

// Markdown Toolbar Functions
function insertMarkdown(type) {
    const editor = document.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    let newText = '';
    let cursorOffset = 0;
    
    switch(type) {
        case 'h1':
            newText = selectedText ? `# ${selectedText}` : '# ';
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'h2':
            newText = selectedText ? `## ${selectedText}` : '## ';
            cursorOffset = selectedText ? newText.length : 3;
            break;
        case 'h3':
            newText = selectedText ? `### ${selectedText}` : '### ';
            cursorOffset = selectedText ? newText.length : 4;
            break;
        case 'bold':
            newText = selectedText ? `**${selectedText}**` : '****';
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'italic':
            newText = selectedText ? `*${selectedText}*` : '**';
            cursorOffset = selectedText ? newText.length : 1;
            break;
        case 'strikethrough':
            newText = selectedText ? `~~${selectedText}~~` : '~~~~';
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'hr':
            newText = '\n---\n';
            cursorOffset = newText.length;
            break;
        case 'quote':
            newText = selectedText ? `> ${selectedText}` : '> ';
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'ul':
            newText = selectedText ? `- ${selectedText}` : '- ';
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'ol':
            newText = selectedText ? `1. ${selectedText}` : '1. ';
            cursorOffset = selectedText ? newText.length : 3;
            break;
        case 'checkbox':
            newText = selectedText ? `- [ ] ${selectedText}` : '- [ ] ';
            cursorOffset = selectedText ? newText.length : 6;
            break;
        case 'table':
            newText = '\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n';
            cursorOffset = newText.length;
            break;
        case 'image':
            newText = selectedText ? `![alt text](${selectedText})` : '![alt text](url)';
            cursorOffset = selectedText ? newText.length : 12;
            break;
        case 'link':
            newText = selectedText ? `[${selectedText}](url)` : '[text](url)';
            cursorOffset = selectedText ? newText.length - 4 : 1;
            break;
        case 'code':
            newText = selectedText ? `\`${selectedText}\`` : '``';
            cursorOffset = selectedText ? newText.length : 1;
            break;
        case 'codeblock':
            newText = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '\`\`\`\n\n\`\`\`';
            cursorOffset = selectedText ? newText.length - 3 : 4;
            break;
    }
    
    editor.value = beforeText + newText + afterText;
    editor.focus();
    editor.setSelectionRange(start + cursorOffset, start + cursorOffset);
    
    // Trigger update
    updatePreview();
    saveCurrentNote();
}

// ============================================
// GITHUB SYNC FUNCTIONALITY
// ============================================

const GITHUB_CONFIG_KEY = 'simpleMD_github_config';
let githubConfig = JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || '{}');
let syncInterval = null;
let currentWizardStep = 0;

// Toggle sync settings panel
function toggleSyncSettings() {
    const panel = document.getElementById('syncSettings');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'flex';
        updateGitHubUI();
    } else {
        panel.style.display = 'none';
    }
}

// Update UI based on connection status
function updateGitHubUI() {
    const connected = githubConfig.connected && githubConfig.token;
    document.getElementById('github-connected').style.display = connected ? 'block' : 'none';
    document.getElementById('github-setup-wizard').style.display = connected ? 'none' : 'block';
    
    if (connected) {
        document.getElementById('github-user-info').textContent = `@${githubConfig.username}`;
        document.getElementById('github-repo-info').textContent = `Repository: ${githubConfig.repo}`;
        document.getElementById('github-auto-sync').checked = githubConfig.autoSync || false;
        updateSyncStatus('Ready to sync');
    } else {
        showWizardStep(0);
    }
}

// Wizard navigation
function nextWizardStep(step) {
    showWizardStep(step);
}

function previousWizardStep(step) {
    showWizardStep(step);
}

function showWizardStep(step) {
    for (let i = 0; i <= 2; i++) {
        const stepEl = document.getElementById(`wizard-step-${i}`);
        if (stepEl) stepEl.style.display = i === step ? 'block' : 'none';
    }
    currentWizardStep = step;
}

// Open GitHub token creation page
function openGitHubTokenPage() {
    window.open('https://github.com/settings/tokens/new?description=SimpleMD%20Sync&scopes=repo', '_blank');
}

// Open GitHub repo
function openGitHubRepo() {
    if (githubConfig.username && githubConfig.repo) {
        window.open(`https://github.com/${githubConfig.username}/${githubConfig.repo}`, '_blank');
    }
}

// Connect to GitHub
async function connectGitHub() {
    const token = document.getElementById('github-token-input').value.trim();
    const repo = document.getElementById('github-repo-input').value.trim();
    const errorEl = document.getElementById('connection-error');
    const btn = document.getElementById('connect-btn');
    
    errorEl.style.display = 'none';
    
    if (!token || !token.startsWith('ghp_')) {
        errorEl.textContent = 'Please enter a valid GitHub token (starts with ghp_)';
        errorEl.style.display = 'block';
        return;
    }
    
    if (!repo) {
        errorEl.textContent = 'Please enter a repository name';
        errorEl.style.display = 'block';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    
    try {
        // Verify token and get user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${token}` }
        });
        
        if (!userResponse.ok) {
            throw new Error('Invalid token or no internet connection');
        }
        
        const user = await userResponse.json();
        
        // Check if repo exists, create if not
        const repoResponse = await fetch(`https://api.github.com/repos/${user.login}/${repo}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        
        if (repoResponse.status === 404) {
            // Create repo
            const createResponse = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: repo,
                    description: 'SimpleMD Notes - Private markdown notes',
                    private: true,
                    auto_init: true
                })
            });
            
            if (!createResponse.ok) {
                throw new Error('Failed to create repository');
            }
        }
        
        // Save config
        githubConfig = {
            connected: true,
            token: token,
            username: user.login,
            repo: repo,
            autoSync: false
        };
        saveGitHubConfig();
        
        // Initial sync
        await performSync();
        
        updateGitHubUI();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Connect GitHub';
    }
}

// Disconnect
function disconnectGitHub() {
    if (confirm('Disconnect from GitHub? Your local notes will not be affected.')) {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        githubConfig = {};
        saveGitHubConfig();
        updateGitHubUI();
    }
}

// Toggle auto-sync
function toggleAutoSync() {
    const enabled = document.getElementById('github-auto-sync').checked;
    githubConfig.autoSync = enabled;
    saveGitHubConfig();
    
    if (enabled) {
        startAutoSync();
        updateSyncStatus('Auto-sync enabled');
    } else {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        updateSyncStatus('Auto-sync disabled');
    }
}

// Manual sync
async function manualSync() {
    const btn = document.getElementById('manual-sync-btn');
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    updateSyncStatus('Syncing...');
    
    try {
        await performSync();
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Synced!';
        updateSyncStatus(`Last synced: ${new Date().toLocaleTimeString()}`);
        setTimeout(() => {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Sync Now';
            btn.disabled = false;
        }, 2000);
    } catch (error) {
        alert(`Sync failed: ${error.message}`);
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Sync Now';
        btn.disabled = false;
        updateSyncStatus('Sync failed');
    }
}

// Perform sync
async function performSync() {
    const notes = await getAllNotes();
    
    for (const note of notes) {
        const content = note.content || '';
        const path = `notes/${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
        
        try {
            // Check if file exists
            const fileResponse = await fetch(
                `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`,
                { headers: { 'Authorization': `token ${githubConfig.token}` }}
            );
            
            const fileExists = fileResponse.ok;
            const fileData = fileExists ? await fileResponse.json() : null;
            
            // Create or update file
            await fetch(
                `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubConfig.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Update ${note.title}`,
                        content: btoa(unescape(encodeURIComponent(content))),
                        sha: fileData?.sha
                    })
                }
            );
        } catch (error) {
            console.error(`Failed to sync note ${note.title}:`, error);
        }
    }
}

// Get all notes
function getAllNotes() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notes'], 'readonly');
        const request = transaction.objectStore('notes').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Start auto-sync
function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
        try {
            await performSync();
            updateSyncStatus(`Last synced: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            console.error('Auto-sync failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Update sync status
function updateSyncStatus(message) {
    const statusEl = document.getElementById('sync-status');
    if (statusEl) statusEl.textContent = message;
}

// Save config
function saveGitHubConfig() {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(githubConfig));
}

// Initialize on load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (githubConfig.connected && githubConfig.autoSync) {
            startAutoSync();
        }
    }, 1000);
});

// Event Listeners
let debounce;
document.getElementById('editor').addEventListener('input', () => { 
    updatePreview(); 
    clearTimeout(debounce); 
    debounce = setTimeout(saveCurrentNote, 500); 
});

// Dynamically load GA script
const gaScript = document.createElement('script');
gaScript.async = true;
gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-X7EKF97C32';
document.head.appendChild(gaScript);

// GA config
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}

gtag('js', new Date());
gtag('config', 'G-X7EKF97C32');