let db, currentNoteId = null, sortKey = 'updated', sortOrder = 'desc';

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
    
    // If you want it to ALWAYS be a horizontal (left/right) split:
    let perc = ((clientX - rect.left) / rect.width) * 100;
    
    // Constraints: Don't let the user drag too far left or right
    perc = Math.max(10, Math.min(90, perc));
    
    // Apply the horizontal columns
    workspace.style.gridTemplateRows = "1fr"; // Force single row
    workspace.style.gridTemplateColumns = `${perc}% 6px 1fr`;
    
    // Ensure the dragBar looks like a vertical line
    dragBar.style.width = "6px";
    dragBar.style.height = "100%";
    dragBar.style.cursor = "col-resize";
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