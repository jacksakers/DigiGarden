// Global state
let currentNoteId = null;
let allNotes = [];
let isEditMode = false;
let currentTags = [];

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
const tagsDisplay = document.getElementById('tagsDisplay');
const addTagBtn = document.getElementById('addTagBtn');
const graphViewBtn = document.getElementById('graphViewBtn');
const graphModal = document.getElementById('graphModal');
const closeGraphBtn = document.getElementById('closeGraphBtn');
const parentNoteSelect = document.getElementById('parentNoteSelect');
const menuBtn = document.getElementById('menuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const mobileNewNoteBtn = document.getElementById('mobileNewNoteBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupGraphView();
    setupMobileMenu();
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

// Render notes tree in sidebar with hierarchy
function renderNotesTree() {
    notesTree.innerHTML = '';
    
    // Get top-level notes (no parent)
    const topLevelNotes = allNotes.filter(note => !note.parent_id);
    
    if (topLevelNotes.length === 0) {
        notesTree.innerHTML = '<p class="text-gray-500 text-sm">No notes yet. Create one!</p>';
        return;
    }
    
    topLevelNotes.forEach(note => {
        const noteElement = createNoteElement(note, 0);
        notesTree.appendChild(noteElement);
    });
}

// Create note element for tree with nesting support
function createNoteElement(note, depth = 0) {
    const container = document.createElement('div');
    container.className = 'group';
    container.style.marginLeft = `${depth * 1}rem`;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center';
    
    // Get child notes
    const children = allNotes.filter(n => n.parent_id === note.id);
    const hasChildren = children.length > 0;
    
    // Expand/collapse button for parents
    if (hasChildren) {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'text-gray-400 hover:text-gray-300 px-1';
        expandBtn.innerHTML = '▼';
        expandBtn.onclick = (e) => {
            e.stopPropagation();
            const childContainer = container.querySelector('.children-container');
            if (childContainer) {
                childContainer.classList.toggle('hidden');
                expandBtn.innerHTML = childContainer.classList.contains('hidden') ? '▶' : '▼';
            }
        };
        wrapper.appendChild(expandBtn);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'w-6';
        wrapper.appendChild(spacer);
    }
    
    // Note button
    const button = document.createElement('button');
    button.className = 'flex-1 text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-gray-300';
    button.onclick = () => {
        loadNote(note.id);
        // Close sidebar on mobile after selecting a note
        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        }
    };
    
    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = hasChildren ? '📁' : '📄';
    icon.className = 'text-sm';
    
    // Title
    const title = document.createElement('span');
    title.textContent = note.title;
    title.className = 'flex-1 truncate';
    
    button.appendChild(icon);
    button.appendChild(title);
    wrapper.appendChild(button);
    container.appendChild(wrapper);
    
    // Render children
    if (hasChildren) {
        const childContainer = document.createElement('div');
        childContainer.className = 'children-container';
        children.forEach(child => {
            childContainer.appendChild(createNoteElement(child, depth + 1));
        });
        container.appendChild(childContainer);
    }
    
    return container;
}

// Load and display a specific note
async function loadNote(noteId) {
    try {
        const response = await fetch(`/api/note/${noteId}`);
        const note = await response.json();
        
        currentNoteId = noteId;
        noteTitle.value = note.title;
        noteContent.value = note.content;
        currentTags = note.tags || [];
        
        // Render markdown with wikilinks
        renderMarkdown(note.content);
        
        // Render backlinks
        renderBacklinks(note.backlink_details || []);
        
        // Render tags
        renderTags();
        
        // Update parent note selector
        updateParentNoteSelect(note.parent_id);
        
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
                content: noteContent.value,
                tags: currentTags,
                parent_id: parentNoteSelect.value || null
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
    addTagBtn.classList.remove('hidden');
}

function switchToReadMode() {
    isEditMode = false;
    editMode.classList.add('hidden');
    readMode.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    editBtn.classList.remove('hidden');
    noteTitle.setAttribute('readonly', true);
    addTagBtn.classList.add('hidden');
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

// Render tags
function renderTags() {
    tagsDisplay.innerHTML = '';
    currentTags.forEach(tag => {
        const tagBadge = document.createElement('span');
        tagBadge.className = 'px-3 py-1 bg-emerald-500 bg-opacity-20 text-emerald-400 rounded-full text-sm flex items-center gap-2';
        
        const tagText = document.createElement('span');
        tagText.textContent = tag;
        tagBadge.appendChild(tagText);
        
        if (isEditMode) {
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.className = 'hover:text-emerald-300 font-bold';
            removeBtn.onclick = () => removeTag(tag);
            tagBadge.appendChild(removeBtn);
        }
        
        tagsDisplay.appendChild(tagBadge);
    });
}

// Add tag
function addTag() {
    const tag = prompt('Enter tag name:');
    if (tag && !currentTags.includes(tag.toLowerCase())) {
        currentTags.push(tag.toLowerCase());
        renderTags();
    }
}

// Remove tag
function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

// Update parent note selector
function updateParentNoteSelect(currentParentId) {
    parentNoteSelect.innerHTML = '<option value="">None (Top Level)</option>';
    
    // Add all notes except current note as options
    allNotes.forEach(note => {
        if (note.id !== currentNoteId) {
            const option = document.createElement('option');
            option.value = note.id;
            option.textContent = note.title;
            if (note.id === currentParentId) {
                option.selected = true;
            }
            parentNoteSelect.appendChild(option);
        }
    });
}

// Setup graph view
function setupGraphView() {
    graphViewBtn.addEventListener('click', showGraphView);
    closeGraphBtn.addEventListener('click', () => {
        graphModal.classList.add('hidden');
    });
}

// Show graph view
function showGraphView() {
    graphModal.classList.remove('hidden');
    renderGraph();
}

// Render graph using D3.js
function renderGraph() {
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Prepare nodes and links
    const nodes = allNotes.map(note => ({
        id: note.id,
        title: note.title,
        tags: note.tags || []
    }));
    
    const links = [];
    allNotes.forEach(note => {
        (note.links || []).forEach(targetId => {
            links.push({
                source: note.id,
                target: targetId
            });
        });
        // Add parent-child relationships
        if (note.parent_id) {
            links.push({
                source: note.parent_id,
                target: note.id,
                isParent: true
            });
        }
    });
    
    // Create SVG
    const svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', d => d.isParent ? '#fbbf24' : '#34d399')
        .attr('stroke-width', d => d.isParent ? 3 : 2)
        .attr('stroke-opacity', 0.6);
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 20)
        .attr('fill', '#34d399')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            graphModal.classList.add('hidden');
            loadNote(d.id);
        });
    
    // Add labels to nodes
    node.append('text')
        .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
        .attr('x', 0)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d1d5db')
        .attr('font-size', '12px')
        .style('pointer-events', 'none');
    
    // Update positions on tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
}

// Setup mobile menu
function setupMobileMenu() {
    // Open sidebar
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
        overlay.classList.add('show');
    });
    
    // Close sidebar
    closeSidebarBtn.addEventListener('click', closeMobileSidebar);
    overlay.addEventListener('click', closeMobileSidebar);
    
    // Mobile new note button
    mobileNewNoteBtn.addEventListener('click', () => {
        createNewNote();
        closeMobileSidebar();
    });
}

function closeMobileSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    overlay.classList.add('hidden');
}

// Setup event listeners
function setupEventListeners() {
    editBtn.addEventListener('click', switchToEditMode);
    saveBtn.addEventListener('click', saveNote);
    deleteBtn.addEventListener('click', deleteNote);
    newNoteBtn.addEventListener('click', createNewNote);
    addTagBtn.addEventListener('click', addTag);
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
