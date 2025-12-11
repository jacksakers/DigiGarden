// Global state
let currentNoteId = null;
let allNotes = [];
let isEditMode = false;

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const noteView = document.getElementById('noteView');
const notesTree = document.getElementById('notesTree');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const readMode = document.getElementById('readMode');
const editMode = document.getElementById('editMode');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const backlinksContainer = document.getElementById('backlinksContainer');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    setupEventListeners();
    setupKeyboardShortcuts();
});

// Load all notes from API
async function loadNotes() {
    try {
        const response = await fetch('/api/notes');
        allNotes = await response.json();
        renderNotesTree();
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Render notes tree in sidebar
function renderNotesTree() {
    notesTree.innerHTML = '';
    
    // Get top-level notes (no parent)
    const topLevelNotes = allNotes.filter(note => !note.parent_id);
    
    if (topLevelNotes.length === 0) {
        notesTree.innerHTML = '<p class="text-gray-500 text-sm">No notes yet. Create one!</p>';
        return;
    }
    
    topLevelNotes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesTree.appendChild(noteElement);
    });
}

// Create note element for tree
function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'group';
    
    const button = document.createElement('button');
    button.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-gray-300';
    button.onclick = () => loadNote(note.id);
    
    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = '📄';
    icon.className = 'text-sm';
    
    // Title
    const title = document.createElement('span');
    title.textContent = note.title;
    title.className = 'flex-1 truncate';
    
    button.appendChild(icon);
    button.appendChild(title);
    div.appendChild(button);
    
    return div;
}

// Load and display a specific note
async function loadNote(noteId) {
    try {
        const response = await fetch(`/api/note/${noteId}`);
        const note = await response.json();
        
        currentNoteId = noteId;
        noteTitle.value = note.title;
        noteContent.value = note.content;
        
        // Render markdown with wikilinks
        renderMarkdown(note.content);
        
        // Render backlinks
        renderBacklinks(note.backlink_details || []);
        
        // Show note view
        welcomeScreen.classList.add('hidden');
        noteView.classList.remove('hidden');
        
        // Switch to read mode
        switchToReadMode();
        
    } catch (error) {
        console.error('Error loading note:', error);
    }
}

// Render markdown content
function renderMarkdown(content) {
    // Convert [[WikiLinks]] to HTML links
    const contentWithLinks = content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
        return `<a href="#" onclick="loadNoteByTitle('${title}'); return false;" class="wikilink">${title}</a>`;
    });
    
    // Parse markdown
    readMode.innerHTML = marked.parse(contentWithLinks);
}

// Load note by title (for wikilink clicks)
async function loadNoteByTitle(title) {
    const note = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (note) {
        await loadNote(note.id);
    } else {
        alert(`Note "${title}" not found. It may be a stub. Edit this note to create it.`);
    }
}

// Render backlinks
function renderBacklinks(backlinks) {
    backlinksContainer.innerHTML = '';
    
    if (backlinks.length === 0) {
        backlinksContainer.innerHTML = '<span class="text-gray-500 text-sm">No backlinks yet</span>';
        return;
    }
    
    backlinks.forEach(backlink => {
        const badge = document.createElement('button');
        badge.className = 'px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-sm transition-colors';
        badge.textContent = backlink.title;
        badge.onclick = () => loadNote(backlink.id);
        backlinksContainer.appendChild(badge);
    });
}

// Create new note
async function createNewNote() {
    try {
        const response = await fetch('/api/note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Untitled Note',
                content: '',
                tags: []
            })
        });
        
        const newNote = await response.json();
        allNotes.push(newNote);
        renderNotesTree();
        await loadNote(newNote.id);
        switchToEditMode();
        noteTitle.focus();
        
    } catch (error) {
        console.error('Error creating note:', error);
    }
}

// Save current note
async function saveNote() {
    if (!currentNoteId) return;
    
    try {
        const response = await fetch(`/api/note/${currentNoteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: noteTitle.value,
                content: noteContent.value
            })
        });
        
        const updatedNote = await response.json();
        
        // Update local notes array
        const index = allNotes.findIndex(n => n.id === currentNoteId);
        if (index !== -1) {
            allNotes[index] = updatedNote;
        }
        
        renderNotesTree();
        renderMarkdown(noteContent.value);
        switchToReadMode();
        
        // Reload to update backlinks
        await loadNote(currentNoteId);
        
    } catch (error) {
        console.error('Error saving note:', error);
    }
}

// Delete current note
async function deleteNote() {
    if (!currentNoteId) return;
    
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }
    
    try {
        await fetch(`/api/note/${currentNoteId}`, {
            method: 'DELETE'
        });
        
        // Remove from local array
        allNotes = allNotes.filter(n => n.id !== currentNoteId);
        
        renderNotesTree();
        
        // Show welcome screen
        currentNoteId = null;
        noteView.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error deleting note:', error);
    }
}

// Switch between edit and read modes
function switchToEditMode() {
    isEditMode = true;
    readMode.classList.add('hidden');
    editMode.classList.remove('hidden');
    editBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    noteTitle.removeAttribute('readonly');
}

function switchToReadMode() {
    isEditMode = false;
    editMode.classList.add('hidden');
    readMode.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    editBtn.classList.remove('hidden');
    noteTitle.setAttribute('readonly', true);
}

// Search functionality
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value;
    
    if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            displaySearchResults(results);
        } catch (error) {
            console.error('Error searching:', error);
        }
    }, 300);
});

function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="p-4 text-gray-500 text-sm">No results found</div>';
        searchResults.classList.remove('hidden');
        return;
    }
    
    searchResults.innerHTML = '';
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700';
        div.onclick = () => {
            loadNote(result.id);
            searchInput.value = '';
            searchResults.classList.add('hidden');
        };
        
        const title = document.createElement('div');
        title.className = 'font-semibold text-gray-200';
        title.textContent = result.title;
        
        const preview = document.createElement('div');
        preview.className = 'text-sm text-gray-400 truncate';
        preview.textContent = result.preview;
        
        div.appendChild(title);
        div.appendChild(preview);
        searchResults.appendChild(div);
    });
    
    searchResults.classList.remove('hidden');
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});

// Image upload functionality
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-emerald-500');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-emerald-500');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        await uploadImage(file);
    }
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        await uploadImage(file);
    }
});

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // Insert markdown into textarea
        const textarea = noteContent;
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);
        
        textarea.value = textBefore + '\n' + data.markdown + '\n' + textAfter;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image');
    }
}

// Setup event listeners
function setupEventListeners() {
    editBtn.addEventListener('click', switchToEditMode);
    saveBtn.addEventListener('click', saveNote);
    deleteBtn.addEventListener('click', deleteNote);
    newNoteBtn.addEventListener('click', createNewNote);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K for search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Ctrl+N for new note
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            createNewNote();
        }
        
        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (isEditMode) {
                saveNote();
            }
        }
        
        // Ctrl+E to toggle edit mode
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            if (currentNoteId) {
                if (isEditMode) {
                    saveNote();
                } else {
                    switchToEditMode();
                }
            }
        }
    });
}
