let db, currentNoteId = null, sortKey = 'updated', sortOrder = 'desc';

// Draggable Logic
const workspace = document.getElementById('workspaceContainer');
const dragBar = document.getElementById('dragBar');
let isDragging = false;

if (dragBar) {
    dragBar.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = workspace.getBoundingClientRect();
        let perc = ((e.clientX - rect.left) / rect.width) * 100;
        perc = Math.max(15, Math.min(85, perc));
        workspace.style.gridTemplateColumns = `${perc}% 6px 1fr`;
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

function resetSplit() { workspace.style.gridTemplateColumns = "1fr 6px 1fr"; }

// Database initialization
const request = indexedDB.open("SimpleMD_DB", 1);
request.onsuccess = e => { 
    db = e.target.result; 
    renderSidebar(); 
    loadLastNote(); 
};
request.onupgradeneeded = e => { 
    e.target.result.createObjectStore("notes", { keyPath: "id" }); 
};

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
        folder: document.getElementById('folderSelect').value, 
        updated: Date.now() 
    };
    db.transaction("notes", "readwrite").objectStore("notes").put(note);
    document.getElementById('displayTitle').innerText = meta.title;
    updatePreview();
    renderSidebar();
}

function deleteIndividualNote() {
    if (!currentNoteId || !confirm("Delete this note?")) return;
    db.transaction("notes", "readwrite").objectStore("notes").delete(currentNoteId).onsuccess = () => { 
        currentNoteId = null; 
        loadLastNote(); 
        renderSidebar(); 
    };
}

function loadNote(id) {
    db.transaction("notes").objectStore("notes").get(id).onsuccess = e => {
        const n = e.target.result;
        if (!n) return;
        currentNoteId = id;
        document.getElementById('editor').value = n.content;
        document.getElementById('folderSelect').value = n.folder || "General";
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
        folder: "General", updated: id, tags: [], summary: "" 
    };
    db.transaction("notes", "readwrite").objectStore("notes").add(note).onsuccess = () => loadNote(id);
}

function renderSidebar() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    db.transaction("notes").objectStore("notes").getAll().onsuccess = e => {
        const container = document.getElementById('noteList');
        container.innerHTML = '';
        ["General", "Work", "Personal"].forEach(f => {
            const group = document.createElement('div');
            group.innerHTML = `<div class="folder-header">${f}</div>`;
            const filtered = e.target.result.filter(n => (n.folder||"General") === f && n.title.toLowerCase().includes(query));
            filtered.sort((a,b) => b.updated - a.updated).forEach(n => {
                const item = document.createElement('div');
                item.className = `note-item ${n.id === currentNoteId ? 'active' : ''}`;
                item.innerText = n.title;
                item.onclick = () => loadNote(n.id);
                group.appendChild(item);
            });
            if (filtered.length > 0 || !query) container.appendChild(group);
        });
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
                summary: meta.summary, folder: "General", 
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

// Event Listeners
let debounce;
document.getElementById('editor').addEventListener('input', () => { 
    updatePreview(); 
    clearTimeout(debounce); 
    debounce = setTimeout(saveCurrentNote, 500); 
});

const folderSelect = document.getElementById('folderSelect');
folderSelect.innerHTML = ["General", "Work", "Personal"].map(f => `<option value="${f}">${f}</option>`).join('');

function updateNoteFolder() { saveCurrentNote(); }

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
