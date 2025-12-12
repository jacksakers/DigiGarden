# 🌱 DigiGarden

A lightweight, fast, self-hosted personal knowledge base with bi-directional linking, designed to run on a Raspberry Pi.

## Features

- **Fast Capture**: Quick note creation with Markdown support
- **Bi-Directional Linking**: Use `[[WikiLinks]]` to connect ideas
- **Hierarchical Organization**: Organize notes in a tree structure
- **Dark Mode UI**: Beautiful dark interface with Tailwind CSS
- **Image Support**: Drag-and-drop image uploads
- **Search**: Fast search across all notes
- **Self-Hosted**: Complete ownership of your data
- **Lightweight**: Runs on Raspberry Pi with minimal resources

## Tech Stack

- **Backend**: Flask (Python)
- **Database**: TinyDB (JSON-based)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript

## Quick Start

### Prerequisites

- For Raspberry Pi: Raspberry Pi OS Lite (64-bit)

## Project Structure

```
DigiGarden/
├── app/
│   ├── main.py              # Flask application
│   ├── garden.json          # TinyDB database (auto-created)
│   ├── templates/
│   │   └── index.html       # Main UI template
│   └── static/
│       ├── js/
│       │   └── app.js       # Frontend JavaScript
│       ├── css/             # Custom CSS (if needed)
│       └── uploads/         # Uploaded images
├── design_docs/
│   └── main_idea.txt        # Technical design document
├── requirements.txt         # Python dependencies
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Usage Guide

### Creating Notes

1. Click "New Note" button or press `Ctrl+N`
2. Enter a title and content in Markdown
3. Click "Save" or press `Ctrl+S`

### Linking Notes

Use double brackets to create links between notes:
```markdown
This note connects to [[Another Note]] and [[Yet Another Note]].
```

If the linked note doesn't exist, it will be created automatically as a stub.

### Uploading Images

1. Switch to edit mode
2. Drag and drop an image onto the upload zone, or click to select
3. The Markdown image syntax will be inserted automatically

### Keyboard Shortcuts

- `Ctrl+K` - Focus search
- `Ctrl+N` - Create new note
- `Ctrl+E` - Toggle edit mode
- `Ctrl+S` - Save note

### Backlinks

At the bottom of each note, you'll see which other notes link to the current note.

## Development

1. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

2. **Run the Flask app**:
   ```powershell
   cd app
   ../.venv/Scripts/python.exe main.py
   ```

3. **Access at**: `http://localhost:5100`

## Raspberry Pi Setup (Running as a Service)

To run DigiGarden as a system service on your Raspberry Pi:

1. **Copy the service file to systemd**:
   ```bash
   sudo cp digigarden.service /etc/systemd/system/
   ```

2. **Reload systemd to recognize the new service**:
   ```bash
   sudo systemctl daemon-reload
   ```

3. **Enable the service to start on boot**:
   ```bash
   sudo systemctl enable digigarden.service
   ```

4. **Start the service**:
   ```bash
   sudo systemctl start digigarden.service
   ```

5. **Check service status**:
   ```bash
   sudo systemctl status digigarden.service
   ```

6. **View logs**:
   ```bash
   sudo journalctl -u digigarden.service -f
   ```

### Useful Service Commands

- **Stop the service**: `sudo systemctl stop digigarden.service`
- **Restart the service**: `sudo systemctl restart digigarden.service`
- **Disable autostart**: `sudo systemctl disable digigarden.service`
- **View recent logs**: `sudo journalctl -u digigarden.service -n 50`

### Accessing DigiGarden

Once the service is running, access DigiGarden at:
- **Local**: `http://localhost:5100`
- **Via Tailscale**: `http://[your-pi-tailscale-ip]:5100`

## Data Persistence

Your data is stored in two locations:
- **Database**: `app/garden.json` - All note content and metadata
- **Images**: `app/static/uploads/` - Uploaded images

## Backup

To backup your garden:

```powershell
# Backup database and images
cp app/garden.json garden_backup_$(date +%Y%m%d).json
cp -r app/static/uploads uploads_backup_$(date +%Y%m%d)
```

## Contributing

This is a personal project, but feel free to fork and customize for your needs!

## License

MIT License - Feel free to use and modify as needed.

## Roadmap

- [ ] Tags implementation
- [ ] Graph view of connections
- [ ] Export to Markdown files
- [ ] Full-text search improvements
- [ ] Mobile app (PWA)
- [ ] Dark/Light theme toggle
- [ ] Note templates

---

Built with ❤️ for personal knowledge management
