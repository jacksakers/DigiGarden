from flask import Flask, render_template, request, jsonify, send_from_directory
from tinydb import TinyDB, Query
from datetime import datetime
import uuid
import os
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize TinyDB
db = TinyDB('garden.json')
notes_table = db.table('notes')

# Allowed file extensions for uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_wikilinks(content):
    """Extract [[WikiLinks]] from content"""
    pattern = r'\[\[([^\]]+)\]\]'
    return re.findall(pattern, content)

def find_note_by_title(title):
    """Find a note by its title (case-insensitive)"""
    Note = Query()
    results = notes_table.search(Note.title.test(lambda s: s.lower() == title.lower()))
    return results[0] if results else None

def update_links(note_id, content):
    """Parse content for [[WikiLinks]] and update links/backlinks"""
    wikilinks = extract_wikilinks(content)
    linked_note_ids = []
    
    for link_title in wikilinks:
        # Find or create the linked note
        linked_note = find_note_by_title(link_title)
        
        if not linked_note:
            # Create a stub note
            stub_id = str(uuid.uuid4())
            stub_note = {
                'id': stub_id,
                'title': link_title,
                'content': '',
                'parent_id': None,
                'tags': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'links': [],
                'backlinks': []
            }
            notes_table.insert(stub_note)
            linked_note = stub_note
        
        linked_note_ids.append(linked_note['id'])
        
        # Add current note to backlinks of linked note
        Note = Query()
        target_note = notes_table.get(Note.id == linked_note['id'])
        if target_note:
            backlinks = target_note.get('backlinks', [])
            if note_id not in backlinks:
                backlinks.append(note_id)
                notes_table.update({'backlinks': backlinks}, Note.id == linked_note['id'])
    
    return linked_note_ids

@app.route('/')
def index():
    """Render the main dashboard"""
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_all_notes():
    """Get all notes (for sidebar/tree view)"""
    all_notes = notes_table.all()
    return jsonify(all_notes)

@app.route('/api/note/<note_id>', methods=['GET'])
def get_note(note_id):
    """Get a specific note by ID"""
    Note = Query()
    note = notes_table.get(Note.id == note_id)
    
    if note:
        # Get backlink details
        backlink_details = []
        for backlink_id in note.get('backlinks', []):
            backlink_note = notes_table.get(Note.id == backlink_id)
            if backlink_note:
                backlink_details.append({
                    'id': backlink_note['id'],
                    'title': backlink_note['title']
                })
        
        note['backlink_details'] = backlink_details
        return jsonify(note)
    
    return jsonify({'error': 'Note not found'}), 404

@app.route('/api/note', methods=['POST'])
def create_note():
    """Create a new note"""
    data = request.json
    
    note_id = str(uuid.uuid4())
    note = {
        'id': note_id,
        'title': data.get('title', 'Untitled'),
        'content': data.get('content', ''),
        'parent_id': data.get('parent_id'),
        'tags': data.get('tags', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'links': [],
        'backlinks': []
    }
    
    # Parse and update links
    linked_ids = update_links(note_id, note['content'])
    note['links'] = linked_ids
    
    notes_table.insert(note)
    return jsonify(note), 201

@app.route('/api/note/<note_id>', methods=['PUT'])
def update_note(note_id):
    """Update an existing note"""
    data = request.json
    Note = Query()
    
    existing_note = notes_table.get(Note.id == note_id)
    if not existing_note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Remove old backlinks
    for old_link_id in existing_note.get('links', []):
        target_note = notes_table.get(Note.id == old_link_id)
        if target_note:
            backlinks = target_note.get('backlinks', [])
            if note_id in backlinks:
                backlinks.remove(note_id)
                notes_table.update({'backlinks': backlinks}, Note.id == old_link_id)
    
    # Update note
    updates = {
        'title': data.get('title', existing_note['title']),
        'content': data.get('content', existing_note['content']),
        'parent_id': data.get('parent_id', existing_note.get('parent_id')),
        'tags': data.get('tags', existing_note.get('tags', [])),
        'updated_at': datetime.now().isoformat()
    }
    
    # Parse and update new links
    linked_ids = update_links(note_id, updates['content'])
    updates['links'] = linked_ids
    
    notes_table.update(updates, Note.id == note_id)
    
    updated_note = notes_table.get(Note.id == note_id)
    return jsonify(updated_note)

@app.route('/api/note/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    Note = Query()
    note = notes_table.get(Note.id == note_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Remove backlinks from other notes
    for link_id in note.get('links', []):
        target_note = notes_table.get(Note.id == link_id)
        if target_note:
            backlinks = target_note.get('backlinks', [])
            if note_id in backlinks:
                backlinks.remove(note_id)
                notes_table.update({'backlinks': backlinks}, Note.id == link_id)
    
    notes_table.remove(Note.id == note_id)
    return jsonify({'message': 'Note deleted successfully'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle image file upload"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to prevent filename collisions
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Return markdown image syntax
        markdown = f"![{name}](/static/uploads/{filename})"
        return jsonify({
            'markdown': markdown,
            'url': f"/static/uploads/{filename}"
        })
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/search', methods=['GET'])
def search_notes():
    """Search notes by title, content, or tags"""
    query = request.args.get('q', '').lower()
    
    if not query:
        return jsonify([])
    
    all_notes = notes_table.all()
    results = []
    
    for note in all_notes:
        # Search in title, content, and tags
        if (query in note['title'].lower() or 
            query in note['content'].lower() or 
            any(query in tag.lower() for tag in note.get('tags', []))):
            results.append({
                'id': note['id'],
                'title': note['title'],
                'preview': note['content'][:100] + '...' if len(note['content']) > 100 else note['content']
            })
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5100, debug=True)
