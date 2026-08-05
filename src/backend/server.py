#!/usr/bin/env python3
"""
DashQ PDF Manager - Flask Backend Server
Gestor completo con carpetas, subcarpetas y papelera
"""

import uuid
from flask import Flask, request, jsonify, send_from_directory, send_file, make_response
from flask_socketio import SocketIO, emit
import os
import json
import unicodedata
import re

def secure_filename(filename):
    """ Custom safe filename that preserves Spanish chars (ñ, accents) and spaces. """
    if not filename:
        return ""
    filename = filename.replace('/', '_').replace('\\', '_').replace('..', '_')
    filename = re.sub(r'[<>:"|?*]', '_', filename)
    return filename.strip()
import shutil
from pathlib import Path
from datetime import datetime
import urllib.request
import urllib.error
import secrets
import sys
import io
import zipfile
import time
try:
    import fitz
except ImportError:
    fitz = None
try:
    from PIL import Image
except ImportError:
    Image = None

# Detect if running in PyInstaller bundle
if getattr(sys, 'frozen', False):
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    static_folder_path = os.path.join(sys._MEIPASS, 'dist')
else:
    # Running from python script
    static_folder_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'react-frontend', 'dist'))

app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')



# ================== Configuración de Datos Persistentes ==================
# Almacenar en el directorio de instalación para fácil acceso manual
if getattr(sys, 'frozen', False):
    # Empaquetado: sys.executable está en <Instalación>/resources/backend-bin/DashQ.exe
    # Subimos 2 niveles para guardar en <Instalación>/DatosGestor
    install_dir = os.path.abspath(os.path.join(os.path.dirname(sys.executable), '..', '..'))
    BASE_DATA_DIR = os.path.join(install_dir, 'DatosGestor')
else:
    # Desarrollo: subimos a la raíz del repositorio
    BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'DatosGestor'))

try:
    os.makedirs(BASE_DATA_DIR, exist_ok=True)
except PermissionError:
    # Si el usuario instaló en C:\Program Files sin permisos de administrador, retrocedemos a AppData
    fallback_dir = os.path.join(os.getenv('LOCALAPPDATA', os.path.expanduser('~')), 'GestorDocumental', 'DatosGestor')
    BASE_DATA_DIR = fallback_dir
    os.makedirs(BASE_DATA_DIR, exist_ok=True)

UPLOAD_FOLDER = os.path.join(BASE_DATA_DIR, 'uploads')
REGISTROS_FOLDER = os.path.join(BASE_DATA_DIR, 'registros')
TRASH_FOLDER  = os.path.join(BASE_DATA_DIR, 'trash')
PINS_FILE = os.path.join(BASE_DATA_DIR, 'pins.json')
DB_PATH = os.path.join(BASE_DATA_DIR, 'dashq.db')
UPDATES_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'updates'))
ALLOWED_EXTENSIONS = {'pdf'}
# No file size limits applied

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REGISTROS_FOLDER, exist_ok=True)
os.makedirs(TRASH_FOLDER,  exist_ok=True)
os.makedirs(UPDATES_FOLDER, exist_ok=True)
# Migrate old trash folder if it exists
if os.path.exists(os.path.join(UPLOAD_FOLDER, '.trash')) and not os.path.exists(TRASH_FOLDER):
    try:
        shutil.move(os.path.join(UPLOAD_FOLDER, '.trash'), TRASH_FOLDER)
    except Exception:
        pass
os.makedirs(TRASH_FOLDER,  exist_ok=True)

THUMBNAIL_FOLDER = os.path.join(BASE_DATA_DIR, 'thumbnails')
os.makedirs(THUMBNAIL_FOLDER, exist_ok=True)

# ── Helpers ────────────────────────────────────────────────
def allowed_file(filename):
    return '.' in filename

def safe_join(base, *parts):
    """Returns absolute path only if it stays inside base, else None."""
    base = os.path.abspath(base)
    target = os.path.abspath(os.path.join(base, *parts))
    if not target.startswith(base):
        return None
    return target

def original_name(filename):
    """Strip YYYYMMDD_HHMMSS_ timestamp prefix if present."""
    parts = filename.split('_')
    if len(parts) >= 3 and len(parts[0]) == 8 and len(parts[1]) == 6:
        try:
            int(parts[0]); int(parts[1])
            return '_'.join(parts[2:])
        except ValueError:
            pass
    return filename

def get_folder_size(conn, folder_rel_path):
    """Calculates the total size of a folder and its subfolders using the database."""
    prefix = folder_rel_path + '/%' if folder_rel_path else '%'
    try:
        cursor = conn.execute('SELECT SUM(size) as total FROM files WHERE id LIKE ? OR folder = ?', (prefix, folder_rel_path))
        row = cursor.fetchone()
        return row['total'] if row and row['total'] else 0
    except Exception:
        return 0

def folder_info(abs_folder_path, rel_folder_path):
    """Return metadata dict for a folder."""
    try:
        file_count = sum(
            1 for f in os.listdir(abs_folder_path)
            if os.path.isfile(os.path.join(abs_folder_path, f))
               and not f.endswith('.meta.json')
        )
    except Exception:
        file_count = 0
    return {
        'name': os.path.basename(abs_folder_path),
        'path': rel_folder_path,
        'file_count': file_count,
    }

def file_info(abs_path, rel_folder):
    """Return metadata dict for a file."""
    filename = os.path.basename(abs_path)
    stat = os.stat(abs_path)
    rel_path = os.path.join(rel_folder, filename).replace('\\', '/') if rel_folder else filename
    return {
        'filename':      filename,
        'original_name': original_name(filename),
        'size':          stat.st_size,
        'upload_date':   datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'path':          f'/uploads/{rel_path}',
        'relative_path': rel_path,
        'folder':        rel_folder,
    }

import sqlite3
import threading

# ── Database Setup ──

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            filename TEXT,
            original_name TEXT,
            size INTEGER,
            upload_date TEXT,
            folder TEXT,
            is_starred BOOLEAN DEFAULT 0,
            tags TEXT DEFAULT '[]'
        )
    ''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_folder ON files(folder)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_filename ON files(filename)')
    
    # Create notes table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            file_id TEXT,
            linked_files TEXT DEFAULT '[]',
            title TEXT,
            content TEXT,
            type TEXT DEFAULT 'general',
            created_by TEXT,
            created_at TEXT,
            record_number TEXT,
            record_year TEXT,
            attached_file_id TEXT
        )
    ''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_notes_file_id ON notes(file_id)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)')
    
    # Simple migration for existing DB
    try:
        conn.execute('ALTER TABLE notes ADD COLUMN record_number TEXT')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE notes ADD COLUMN record_year TEXT')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE notes ADD COLUMN attached_file_id TEXT')
    except Exception:
        pass
    try:
        conn.execute('ALTER TABLE notes ADD COLUMN tracking_code TEXT')
    except Exception:
        pass

    conn.commit()
    conn.close()

def sync_db_with_disk():
    """Synchronize SQLite DB with the actual filesystem."""
    conn = get_db()
    cursor = conn.execute('SELECT id FROM files')
    db_files = set(row['id'] for row in cursor)
    disk_files = set()
    
    for root, dirs, filenames in os.walk(UPLOAD_FOLDER):
        dirs[:] = [d for d in dirs if d != '.trash' and not d.startswith('.')]
        for entry in filenames:
            if entry.startswith('.'): continue
            fp = os.path.join(root, entry)
            rel_dir = os.path.relpath(root, UPLOAD_FOLDER).replace('\\', '/')
            if rel_dir == '.': rel_dir = ''
            rel_file = os.path.join(rel_dir, entry).replace('\\', '/') if rel_dir else entry
            disk_files.add(rel_file)
            
            try:
                stat = os.stat(fp)
                conn.execute('''
                    INSERT INTO files (id, filename, original_name, size, upload_date, folder)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        size=excluded.size
                ''', (
                    rel_file, entry, original_name(entry),
                    stat.st_size, datetime.fromtimestamp(stat.st_mtime).isoformat(), rel_dir
                ))
            except OSError:
                pass
                
    # Delete entries that no longer exist on disk
    for f_id in (db_files - disk_files):
        conn.execute('DELETE FROM files WHERE id = ?', (f_id,))
        conn.execute('DELETE FROM notes WHERE file_id = ?', (f_id,))
        
    conn.commit()
    conn.close()

@app.after_request
def auto_sync_db(response):
    """Automatically synchronize the DB after any file modifications (runs in background)."""
    if request.method in ['POST', 'DELETE', 'PUT'] and request.path.startswith('/api/'):
        # Ignore read-only or pure metadata endpoints
        if request.path not in ['/api/metadata', '/api/files/compress']:
            app_ctx = app.app_context()
            def run_sync(ctx):
                with ctx:
                    try:
                        sync_db_with_disk()
                        socketio.emit('refresh_needed')
                    except Exception as e:
                        print(f"DB auto-sync error: {e}")
            threading.Thread(target=run_sync, args=(app_ctx,)).start()
    return response

# --- Real-Time Background Watcher ---
def continuous_folder_watcher(app_context):
    """Continuously monitors the UPLOAD_FOLDER every 30 seconds to detect external file drops/deletions."""
    while True:
        try:
            time.sleep(30)
            with app_context:
                sync_db_with_disk()
                socketio.emit('refresh_needed')
        except Exception as e:
            print(f"Background watcher error: {e}")

# Start the background watcher when the app starts
watcher_thread = threading.Thread(target=continuous_folder_watcher, args=(app.app_context(),), daemon=True)
watcher_thread.start()

# ── Static / Root ──────────────────────────────────────────
@app.route('/')
def index():
    response = make_response(app.send_static_file('index.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/') or request.path.startswith('/uploads/'):
        return jsonify(error="Not found"), 404
    response = make_response(app.send_static_file('index.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve any file inside uploads/ recursively."""
    try:
        parts   = filename.split('/')
        fname   = parts[-1]
        subdir  = os.path.join(UPLOAD_FOLDER, *parts[:-1]) if len(parts) > 1 else UPLOAD_FOLDER
        abs_dir = os.path.abspath(subdir)
        abs_up  = os.path.abspath(UPLOAD_FOLDER)
        if not abs_dir.startswith(abs_up):
            return jsonify({'error': 'Forbidden'}), 403
        return send_from_directory(abs_dir, fname)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/thumbnail/<path:filename>')
def serve_thumbnail(filename):
    """Serve or generate a thumbnail for images, pdfs, and word documents."""
    try:
        parts   = filename.split('/')
        fname   = parts[-1]
        subdir  = os.path.join(UPLOAD_FOLDER, *parts[:-1]) if len(parts) > 1 else UPLOAD_FOLDER
        abs_dir = os.path.abspath(subdir)
        abs_up  = os.path.abspath(UPLOAD_FOLDER)
        if not abs_dir.startswith(abs_up):
            return jsonify({'error': 'Forbidden'}), 403
            
        src_path = os.path.join(abs_dir, fname)
        if not os.path.exists(src_path):
            return jsonify({'error': 'Not found'}), 404

        safe_name = filename.replace('/', '_').replace('\\', '_') + '.jpg'
        thumb_path = os.path.join(THUMBNAIL_FOLDER, safe_name)

        if os.path.exists(thumb_path):
            return send_file(thumb_path, mimetype='image/jpeg')

        ext = fname.split('.')[-1].lower()
        image_exts = ['png', 'jpg', 'jpeg', 'gif', 'webp']

        if Image and ext in image_exts:
            with Image.open(src_path) as img:
                img.thumbnail((300, 300))
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(thumb_path, 'JPEG', quality=85)
            return send_file(thumb_path, mimetype='image/jpeg')
            
        elif fitz and Image and ext == 'pdf':
            doc = fitz.open(src_path)
            if len(doc) > 0:
                page = doc.load_page(0)
                pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
                mode = "RGBA" if pix.alpha else "RGB"
                img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(thumb_path, 'JPEG', quality=85)
            doc.close()
            if os.path.exists(thumb_path):
                return send_file(thumb_path, mimetype='image/jpeg')

        elif Image and ext in ['doc', 'docx']:
            try:
                with zipfile.ZipFile(src_path, 'r') as z:
                    images = [n for n in z.namelist() if n.startswith('word/media/image')]
                    if images:
                        img_data = z.read(images[0])
                        with Image.open(io.BytesIO(img_data)) as img:
                            img.thumbnail((300, 300))
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            img.save(thumb_path, 'JPEG', quality=85)
                        return send_file(thumb_path, mimetype='image/jpeg')
            except Exception:
                pass
                
        return jsonify({'error': 'No thumbnail available'}), 404

    except Exception as e:
        print("Thumbnail Error:", e)
        return jsonify({'error': str(e)}), 500

# ── Browse ─────────────────────────────────────────────────
@app.route('/api/browse', methods=['GET'])
def browse():
    """
    GET /api/browse?path=optional/subfolder&search=optional_query
    Returns folders and files at that path inside uploads/.
    If search is provided, searches recursively inside UPLOAD_FOLDER.
    """
    rel_path = request.args.get('path', '').strip('/')
    search_query = request.args.get('search', '').strip().lower()
    
    if search_query:
        if len(search_query) < 1:
            return jsonify({'success': True, 'path': rel_path, 'folders': [], 'files': [], 'is_search': True}), 200

        sync_db_with_disk()

        folders = []
        files   = []
        
        def normalize_text(text):
            if not text: return ""
            return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower()

        conn = get_db()
        cursor = conn.execute('SELECT * FROM files ORDER BY filename ASC')
        search_norm = normalize_text(search_query)
        
        for row in cursor:
            file_norm = normalize_text(row['filename'])
            orig_norm = normalize_text(row['original_name'])
            folder_norm = normalize_text(row['folder'])
            
            if search_norm in file_norm or search_norm in orig_norm or search_norm in folder_norm:
                files.append({
                    'filename':      row['filename'],
                    'original_name': row['original_name'],
                    'size':          row['size'],
                    'upload_date':   row['upload_date'],
                    'path':          f"/uploads/{row['id']}",
                    'relative_path': row['id'],
                    'folder':        row['folder'],
                    'isStarred':     bool(row['is_starred']),
                    'tags':          json.loads(row['tags']) if row['tags'] else []
                })
                if len(files) >= 200:
                    break
        conn.close()

        return jsonify({
            'success': True,
            'path':    rel_path,
            'folders': folders,
            'files':   files,
            'is_search': True
        }), 200

    abs_path = safe_join(UPLOAD_FOLDER, rel_path) if rel_path else os.path.abspath(UPLOAD_FOLDER)

    if abs_path is None or not os.path.isdir(abs_path):
        return jsonify({'error': 'Path not found'}), 404

    folders = []
    files   = []
    
    conn = get_db()
    cursor = conn.execute('SELECT id, is_starred, tags FROM files WHERE folder = ?', (rel_path,))
    db_metadata = {row['id']: dict(row) for row in cursor.fetchall()}

    for entry in sorted(os.listdir(abs_path)):
        # Skip trash and hidden
        if entry.startswith('.'):
            continue
        entry_abs = os.path.join(abs_path, entry)
        entry_rel = os.path.join(rel_path, entry).replace('\\', '/') if rel_path else entry

        if os.path.isdir(entry_abs):
            f_info = folder_info(entry_abs, entry_rel)
            f_info['size'] = get_folder_size(conn, entry_rel)
            folders.append(f_info)
        elif os.path.isfile(entry_abs):
            f_info = file_info(entry_abs, rel_path)
            meta = db_metadata.get(entry_rel, {})
            f_info['isStarred'] = bool(meta.get('is_starred', False))
            tags_raw = meta.get('tags')
            try:
                f_info['tags'] = json.loads(tags_raw) if tags_raw else []
            except Exception:
                f_info['tags'] = []
            files.append(f_info)
            
    conn.close()

    return jsonify({
        'success': True,
        'path':    rel_path,
        'folders': folders,
        'files':   files,
    }), 200

# ── Legacy /api/files (compat) ────────────────────────────
@app.route('/api/files', methods=['GET'])
def list_files():
    """Returns a flat list of ALL files across all folders, used for recent activities."""
    try:
        files = []
        for root, dirs, filenames in os.walk(UPLOAD_FOLDER):
            dirs[:] = [d for d in dirs if d != '.trash' and not d.startswith('.')]
            for entry in filenames:
                if entry.startswith('.'):
                    continue
                fp = os.path.join(root, entry)
                rel_dir = os.path.relpath(root, UPLOAD_FOLDER).replace('\\', '/')
                if rel_dir == '.':
                    rel_dir = ''
                files.append(file_info(fp, rel_dir))
                
        files.sort(key=lambda x: x['upload_date'], reverse=True)
        return jsonify({'success': True, 'files': files, 'count': len(files)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Upload ─────────────────────────────────────────────────
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    # Optional folder destination
    folder = request.form.get('folder', '').strip('/')

    try:
        # Check for duplicates first
        target_dir = safe_join(UPLOAD_FOLDER, folder) if folder else os.path.abspath(UPLOAD_FOLDER)
        if target_dir and os.path.exists(target_dir):
            target_filename = secure_filename(file.filename)
            for existing_file in os.listdir(target_dir):
                if not existing_file.startswith('.'):
                    if original_name(existing_file) == target_filename:
                        return jsonify({'error': 'El archivo ya existe'}), 409

        filename  = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename  = timestamp + filename

        if folder:
            dest_dir = safe_join(UPLOAD_FOLDER, folder)
            if dest_dir is None:
                return jsonify({'error': 'Invalid folder path'}), 400
            os.makedirs(dest_dir, exist_ok=True)
        else:
            dest_dir = os.path.abspath(UPLOAD_FOLDER)

        filepath = os.path.join(dest_dir, filename)
        file.save(filepath)
        rel = os.path.join(folder, filename).replace('\\', '/') if folder else filename

        return jsonify({
            'success':       True,
            'filename':      filename,
            'original_name': file.filename,
            'size':          os.path.getsize(filepath),
            'upload_date':   datetime.now().isoformat(),
            'path':          f'/uploads/{rel}',
            'folder':        folder,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Delete (legacy & bulk) ─────────────────────────────────
@app.route('/api/files/bulk-delete', methods=['POST'])
def bulk_delete_files():
    data = request.get_json() or {}
    files = data.get('files', [])
    if not files:
        return jsonify({'error': 'No files provided'}), 400
        
    for filename in files:
        try:
            fp = safe_join(UPLOAD_FOLDER, filename)
            if fp and os.path.exists(fp):
                trash_abs = safe_join(TRASH_FOLDER, filename)
                if not trash_abs: continue
                meta_abs  = trash_abs + '.meta.json'
                
                # Create trash directories if needed
                os.makedirs(os.path.dirname(trash_abs), exist_ok=True)
                
                shutil.move(fp, trash_abs)
                with open(meta_abs, 'w', encoding='utf-8') as f:
                    json.dump({'original_path': filename, 'trash_date': datetime.now().isoformat()}, f)
        except Exception as e:
            print(f"Error moving {filename} to trash: {e}")
            
    return jsonify({'success': True}), 200

@app.route('/api/files/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    try:
        fp = safe_join(UPLOAD_FOLDER, filename)
        if fp is None or not os.path.exists(fp):
            return jsonify({'error': 'File not found'}), 404
        
        # Move to trash instead of permanent removal
        trash_abs = safe_join(TRASH_FOLDER, filename)
        if not trash_abs:
            return jsonify({'error': 'Invalid path'}), 400
            
        os.makedirs(os.path.dirname(trash_abs), exist_ok=True)
        meta_abs  = trash_abs + '.meta.json'
        orig_path = filename
        
        shutil.move(fp, trash_abs)
        with open(meta_abs, 'w', encoding='utf-8') as f:
            json.dump({'original_path': orig_path, 'trash_date': datetime.now().isoformat()}, f)
            
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── mkdir ──────────────────────────────────────────────────
@app.route('/api/mkdir', methods=['POST'])
def mkdir():
    """POST {path: 'FolderName'} or 'ParentFolder/Child'"""
    data = request.get_json() or {}
    raw  = data.get('path', '').strip().strip('/')
    if not raw:
        return jsonify({'error': 'path required'}), 400

    # Sanitize each component
    parts    = [secure_filename(p) for p in raw.replace('\\', '/').split('/') if p]
    abs_path = safe_join(UPLOAD_FOLDER, *parts)
    if abs_path is None:
        return jsonify({'error': 'Invalid path'}), 400

    try:
        os.makedirs(abs_path, exist_ok=True)
        return jsonify({'success': True, 'path': '/'.join(parts)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── rmdir ──────────────────────────────────────────────────
@app.route('/api/rmdir', methods=['DELETE'])
def rmdir():
    """DELETE /api/rmdir?path=FolderName"""
    rel = request.args.get('path', '').strip('/')
    if not rel:
        return jsonify({'error': 'path required'}), 400
    abs_path = safe_join(UPLOAD_FOLDER, rel)
    if abs_path is None or not os.path.isdir(abs_path):
        return jsonify({'error': 'Folder not found'}), 404
    try:
        folder_name = os.path.basename(abs_path)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        trash_name = timestamp + folder_name
        trash_abs = os.path.join(TRASH_FOLDER, trash_name)
        meta_abs = trash_abs + '.meta.json'

        # Get all metadata for files in this folder
        conn = get_db()
        cursor = conn.execute('SELECT id, tags, is_starred FROM files WHERE folder = ? OR folder LIKE ?', (rel, rel + '/%'))
        file_meta = {}
        for row in cursor.fetchall():
            file_meta[row['id']] = {'tags': row['tags'], 'is_starred': row['is_starred']}
        conn.close()

        shutil.move(abs_path, trash_abs)
        with open(meta_abs, 'w', encoding='utf-8') as f:
            json.dump({
                'original_path': rel,
                'trash_date': datetime.now().isoformat(),
                'type': 'directory',
                'file_meta': file_meta
            }, f)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── rename_folder ──────────────────────────────────────────
@app.route('/api/rename_folder', methods=['POST'])
def rename_folder():
    """POST {path, new_name}"""
    data = request.get_json() or {}
    path = data.get('path', '').strip('/')
    new_name = data.get('new_name', '').strip('/')

    if not path or not new_name:
        return jsonify({'error': 'path and new_name required'}), 400

    if '/' in new_name or '\\' in new_name:
        return jsonify({'error': 'Invalid folder name'}), 400

    src_abs = safe_join(UPLOAD_FOLDER, path)

    parent_dir = os.path.dirname(path)
    dest_rel = os.path.join(parent_dir, new_name) if parent_dir else new_name
    dest_abs = safe_join(UPLOAD_FOLDER, dest_rel)

    if src_abs is None or not os.path.isdir(src_abs):
        return jsonify({'error': 'Folder not found'}), 404
    if dest_abs is None:
        return jsonify({'error': 'Invalid destination'}), 400
    if os.path.exists(dest_abs):
        return jsonify({'error': 'Ya existe una carpeta con ese nombre.'}), 400

    try:
        os.rename(src_abs, dest_abs)
        
        # Preserve metadata in DB
        conn = get_db()
        cursor = conn.execute('SELECT id, folder FROM files WHERE folder = ? OR folder LIKE ?', (path, path + '/%'))
        for row in cursor.fetchall():
            old_id = row['id']
            old_folder = row['folder']
            new_folder = dest_rel + old_folder[len(path):]
            new_id = new_folder + '/' + os.path.basename(old_id) if new_folder else os.path.basename(old_id)
            conn.execute('UPDATE files SET id = ?, folder = ? WHERE id = ?', (new_id, new_folder, old_id))
        conn.commit()
        conn.close()

        # Update pins
        pins = load_pins()
        new_pins = {}
        pins_changed = False
        for p_path, p_meta in pins.items():
            if p_path == path or p_path.startswith(path + '/'):
                new_p_path = dest_rel + p_path[len(path):]
                new_pins[new_p_path] = {'path': new_p_path, 'name': p_meta.get('name'), 'type': p_meta.get('type')}
                pins_changed = True
            else:
                new_pins[p_path] = p_meta
        if pins_changed:
            save_pins(new_pins)

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Move file ──────────────────────────────────────────────
@app.route('/api/move', methods=['POST'])
def move_file():
    """POST form or json {target, destination}"""
    data = request.get_json() or {}
    target = request.form.get('target', data.get('target', '')).strip('/')
    destination = request.form.get('destination', data.get('destination', '')).strip('/')

    if not target:
        return jsonify({'error': 'target required'}), 400

    src_abs = safe_join(UPLOAD_FOLDER, target)
    if src_abs is None or not os.path.exists(src_abs):
        return jsonify({'error': 'Source file not found'}), 404

    dest_dir = safe_join(UPLOAD_FOLDER, destination) if destination else os.path.abspath(UPLOAD_FOLDER)
    if dest_dir is None:
        return jsonify({'error': 'Invalid destination'}), 400

    filename = os.path.basename(target)
    os.makedirs(dest_dir, exist_ok=True)
    dest_abs = os.path.join(dest_dir, filename)

    try:
        shutil.move(src_abs, dest_abs)
        rel = os.path.join(destination, filename).replace('\\', '/') if destination else filename
        
        # Preserve metadata in DB
        old_id = target
        new_id = rel
        conn = get_db()
        conn.execute('UPDATE files SET id = ?, folder = ? WHERE id = ?', (new_id, destination, old_id))
        conn.commit()
        conn.close()
        
        # Update pins
        pins = load_pins()
        new_pins = {}
        pins_changed = False
        for p_path, p_meta in pins.items():
            if p_path == old_id or p_path.startswith(old_id + '/'):
                new_p_path = new_id + p_path[len(old_id):]
                new_pins[new_p_path] = {'path': new_p_path, 'name': p_meta.get('name'), 'type': p_meta.get('type')}
                pins_changed = True
            else:
                new_pins[p_path] = p_meta
        if pins_changed:
            save_pins(new_pins)
        
        return jsonify({'success': True, 'new_path': f'/uploads/{rel}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# ── Star File ─────────────────────────────────────────────
@app.route('/api/star', methods=['POST'])
def star_file():
    """POST {id}"""
    data = request.get_json() or {}
    file_id = data.get('id', '')
    
    if not file_id:
        return jsonify({'error': 'id required'}), 400
        
    conn = get_db()
    cursor = conn.execute('SELECT is_starred FROM files WHERE id = ?', (file_id,))
    row = cursor.fetchone()
    
    if not row:
        # If file/folder isn't in db yet, let's just insert it and set it to starred (1)
        conn.execute('INSERT INTO files (id, is_starred) VALUES (?, ?)', (file_id, 1))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'isStarred': True})
        
    new_status = 1 if row['is_starred'] == 0 else 0
    conn.execute('UPDATE files SET is_starred = ? WHERE id = ?', (new_status, file_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'is_starred': bool(new_status)}), 200

# ── Update Tags ───────────────────────────────────────────
@app.route('/api/tags', methods=['POST'])
def update_tags():
    """POST {id, tags: []}"""
    data = request.get_json() or {}
    file_id = data.get('id', '')
    tags = data.get('tags', [])
    
    if not file_id:
        return jsonify({'error': 'id required'}), 400
        
    tags_json = json.dumps(tags)
        
    conn = get_db()
    cursor = conn.execute('SELECT tags FROM files WHERE id = ?', (file_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.execute('INSERT INTO files (id, tags) VALUES (?, ?)', (file_id, tags_json))
    else:
        conn.execute('UPDATE files SET tags = ? WHERE id = ?', (tags_json, file_id))
        
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'tags': tags}), 200


# ── Download ZIP ──────────────────────────────────────────
@app.route('/api/download_zip', methods=['POST'])
def download_zip():
    """POST {ids: ['file1.pdf', 'folder1/']}"""
    data = request.get_json(silent=True) or {}
    ids = data.get('ids', [])
    if not ids and 'ids' in request.form:
        import json
        import unicodedata
        try:
            ids = json.loads(request.form['ids'])
        except Exception:
            ids = request.form['ids'].split(',')
            
    if not ids:
        return jsonify({'error': 'No ids provided'}), 400
        
    download_name = data.get('download_name') or request.form.get('download_name') or 'descarga_masiva.zip'
        
    import tempfile
    import zipfile
    
    memory_file = tempfile.TemporaryFile()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_id in ids:
            file_id = file_id.strip('/')
            abs_path = safe_join(UPLOAD_FOLDER, file_id)
            if not abs_path or not os.path.exists(abs_path):
                continue
            
            base_name = os.path.basename(file_id)
            
            if os.path.isdir(abs_path):
                for root, _, files in os.walk(abs_path):
                    for file in files:
                        filepath = os.path.join(root, file)
                        local_path = os.path.relpath(filepath, abs_path)
                        arcname = os.path.join(base_name, local_path).replace('\\', '/')
                        zf.write(filepath, arcname)
            else:
                zf.write(abs_path, base_name)
                
    memory_file.seek(0)
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=download_name
    )


# ── Rename File ───────────────────────────────────────────
@app.route('/api/rename', methods=['POST'])
def rename_file():
    """POST {filename, folder, new_filename}"""
    data = request.get_json() or {}
    
    # Custom sanitize to allow spaces/accents but prevent traversal
    def sanitize(n): return n.replace('/', '').replace('\\', '').strip()
    
    filename = sanitize(data.get('filename', ''))
    folder = data.get('folder', '').strip('/')
    new_filename = sanitize(data.get('new_filename', ''))

    if not filename or not new_filename:
        return jsonify({'error': 'filename and new_filename required'}), 400

    src_prefix = ""
    parts = filename.split('_')
    if len(parts) >= 3 and len(parts[0]) == 8 and len(parts[1]) == 6:
        src_prefix = parts[0] + "_" + parts[1] + "_"

    _, orig_ext = os.path.splitext(filename)
    _, new_ext = os.path.splitext(new_filename)
    if orig_ext and not new_ext:
        new_filename += orig_ext

    final_new_filename = src_prefix + new_filename if not new_filename.startswith(src_prefix) else new_filename

    src_abs = safe_join(UPLOAD_FOLDER, folder, filename) if folder else safe_join(UPLOAD_FOLDER, filename)
    dest_abs = safe_join(UPLOAD_FOLDER, folder, final_new_filename) if folder else safe_join(UPLOAD_FOLDER, final_new_filename)

    if src_abs is None or not os.path.exists(src_abs):
        return jsonify({'error': 'Source file not found'}), 404
    if dest_abs is None:
        return jsonify({'error': 'Invalid destination'}), 400
    if os.path.exists(dest_abs):
        return jsonify({'error': 'Ya existe un archivo con ese nombre.'}), 400

    try:
        os.rename(src_abs, dest_abs)
        
        # Preserve metadata in DB
        old_id = os.path.join(folder, filename).replace('\\', '/') if folder else filename
        new_id = os.path.join(folder, final_new_filename).replace('\\', '/') if folder else final_new_filename
        conn = get_db()
        conn.execute('UPDATE files SET id = ?, filename = ?, original_name = ? WHERE id = ?', (new_id, final_new_filename, original_name(final_new_filename), old_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'new_filename': final_new_filename}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Copy File (Duplicate) ──────────────────────────────────
@app.route('/api/copy', methods=['POST'])
def copy_file():
    """POST {filename, folder} — duplicates file in same directory with _copia suffix"""
    data = request.get_json() or {}
    filename = secure_filename(data.get('filename', ''))
    folder = data.get('folder', '').strip('/')

    if not filename:
        return jsonify({'error': 'filename required'}), 400

    src_abs = safe_join(UPLOAD_FOLDER, folder, filename) if folder else safe_join(UPLOAD_FOLDER, filename)
    if src_abs is None or not os.path.exists(src_abs):
        return jsonify({'error': 'Source file not found'}), 404

    # Build duplicate name
    name_part, ext = os.path.splitext(filename)
    new_name = name_part + "_copia" + ext
    counter = 2
    while os.path.exists(safe_join(UPLOAD_FOLDER, folder, new_name) if folder else safe_join(UPLOAD_FOLDER, new_name)):
        new_name = f"{name_part}_copia_{counter}{ext}"
        counter += 1

    dest_abs = safe_join(UPLOAD_FOLDER, folder, new_name) if folder else safe_join(UPLOAD_FOLDER, new_name)

    try:
        shutil.copy2(src_abs, dest_abs)
        return jsonify({'success': True, 'new_filename': new_name}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Trash: send to trash ───────────────────────────────────
@app.route('/api/trash', methods=['POST'])
def send_to_trash():
    """POST {filename, folder}  — moves file to .trash"""
    data     = request.get_json() or {}
    filename = secure_filename(data.get('filename', ''))
    folder   = data.get('folder', '').strip('/')

    if not filename:
        return jsonify({'error': 'filename required'}), 400

    src_abs = safe_join(UPLOAD_FOLDER, folder, filename) if folder else safe_join(UPLOAD_FOLDER, filename)
    if src_abs is None or not os.path.exists(src_abs):
        return jsonify({'error': 'File not found'}), 404

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
    trash_filename = timestamp + filename
    trash_abs  = os.path.join(TRASH_FOLDER, trash_filename)
    meta_abs   = trash_abs + '.meta.json'
    orig_path  = os.path.join(folder, filename).replace('\\', '/') if folder else filename

    conn = get_db()
    cursor = conn.execute('SELECT tags, is_starred FROM files WHERE id = ?', (orig_path,))
    row = cursor.fetchone()
    conn.close()
    
    meta_data = {'original_path': orig_path, 'trash_date': datetime.now().isoformat(), 'type': 'file'}
    if row:
        meta_data['file_meta'] = {orig_path: {'tags': row['tags'], 'is_starred': row['is_starred']}}

    try:
        shutil.move(src_abs, trash_abs)
        with open(meta_abs, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Trash: list ────────────────────────────────────────────
@app.route('/api/trash', methods=['GET'])
def list_trash():
    items = []
    try:
        for entry in os.listdir(TRASH_FOLDER):
            if entry.endswith('.meta.json') or entry.startswith('.'):
                continue
            abs_path = os.path.join(TRASH_FOLDER, entry)
            is_dir = os.path.isdir(abs_path)
            if not is_dir and not os.path.isfile(abs_path):
                continue
            meta_path = abs_path + '.meta.json'
            orig_path = entry
            trash_date = ''
            item_type = 'directory' if is_dir else 'file'
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, encoding='utf-8') as f:
                        meta = json.load(f)
                    orig_path  = meta.get('original_path', entry)
                    trash_date = meta.get('trash_date', '')
                    if 'type' in meta:
                        item_type = meta['type']
                except Exception:
                    pass

            if is_dir:
                # Calculate total size of files inside this dir recursively
                dir_size = 0
                for root, dirs, files in os.walk(abs_path):
                    for f in files:
                        try:
                            dir_size += os.path.getsize(os.path.join(root, f))
                        except Exception:
                            pass
                size = dir_size
            else:
                try:
                    size = os.path.getsize(abs_path)
                except Exception:
                    size = 0

            items.append({
                'filename':      entry,
                'original_name': original_name(entry),
                'original_path': orig_path,
                'size':          size,
                'trash_date':    trash_date,
                'is_dir':        is_dir,
                'type':          item_type
            })
        items.sort(key=lambda x: x['trash_date'], reverse=True)
        return jsonify({'success': True, 'items': items, 'count': len(items)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Trash: permanent delete (single & bulk) ──
@app.route('/api/trash/bulk', methods=['DELETE'])
def bulk_permanent_delete():
    data = request.get_json() or {}
    files = data.get('files', [])
    if not files:
        return jsonify({'error': 'No files provided'}), 400
        
    for filename in files:
        try:
            abs_path = safe_join(TRASH_FOLDER, filename)
            if not abs_path: continue
            meta_abs = abs_path + '.meta.json'
            if os.path.exists(abs_path):
                if os.path.isdir(abs_path):
                    shutil.rmtree(abs_path)
                else:
                    os.remove(abs_path)
                if os.path.exists(meta_abs):
                    os.remove(meta_abs)
        except Exception as e:
            print(f"Error deleting {filename} permanently: {e}")
            
    return jsonify({'success': True}), 200

# ── Trash: permanent delete ────────────────────────────────
@app.route('/api/trash/<path:filename>', methods=['DELETE'])
def permanent_delete(filename):
    abs_path = safe_join(TRASH_FOLDER, filename)
    if not abs_path: return jsonify({'error': 'Invalid path'}), 400
    meta_abs = abs_path + '.meta.json'
    if not os.path.exists(abs_path):
        return jsonify({'error': 'Not in trash'}), 404
    try:
        if os.path.isdir(abs_path):
            shutil.rmtree(abs_path)
        else:
            os.remove(abs_path)
        if os.path.exists(meta_abs):
            os.remove(meta_abs)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Trash: restore ─────────────────────────────────────────
@app.route('/api/trash/<path:filename>/restore', methods=['POST'])
def restore_from_trash(filename):
    abs_path = safe_join(TRASH_FOLDER, filename)
    if not abs_path: return jsonify({'error': 'Invalid path'}), 400
    meta_abs = abs_path + '.meta.json'

    if not os.path.exists(abs_path):
        return jsonify({'error': 'Not in trash'}), 404

    orig_path = filename  # fallback
    if os.path.exists(meta_abs):
        try:
            with open(meta_abs, encoding='utf-8') as f:
                meta = json.load(f)
            orig_path = meta.get('original_path', filename)
        except Exception:
            pass

    dest_abs = safe_join(UPLOAD_FOLDER, orig_path)
    if dest_abs is None:
        dest_abs = os.path.join(UPLOAD_FOLDER, filename)

    if os.path.exists(dest_abs):
        return jsonify({'error': 'Ya existe un archivo o carpeta con el mismo nombre en la ruta de destino.'}), 400

    try:
        os.makedirs(os.path.dirname(dest_abs), exist_ok=True)
        shutil.move(abs_path, dest_abs)
        
        file_meta = {}
        if os.path.exists(meta_abs):
            try:
                with open(meta_abs, encoding='utf-8') as f:
                    meta = json.load(f)
                file_meta = meta.get('file_meta', {})
            except Exception:
                pass
            os.remove(meta_abs)

        if file_meta:
            conn = get_db()
            for fid, fm in file_meta.items():
                tags = fm.get('tags', '[]')
                is_starred = fm.get('is_starred', 0)
                conn.execute('''INSERT OR REPLACE INTO files (id, filename, original_name, size, upload_date, folder, tags, is_starred)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                             (fid, os.path.basename(fid), original_name(os.path.basename(fid)), 0, datetime.now().isoformat(), os.path.dirname(fid).replace('\\', '/'), tags, is_starred))
            conn.commit()
            conn.close()

        is_dir = os.path.isdir(dest_abs)
        restored_files = []
        if is_dir:
            for root, dirs, files in os.walk(dest_abs):
                for f in files:
                    if f.lower().endswith('.pdf'):
                        file_abs_path = os.path.join(root, f)
                        file_rel_path = os.path.relpath(file_abs_path, UPLOAD_FOLDER).replace('\\', '/')
                        restored_files.append({
                            'relative_path': file_rel_path,
                            'original_name': original_name(f)
                        })

        return jsonify({
            'success': True,
            'restored_to': orig_path,
            'is_dir': is_dir,
            'restored_files': restored_files
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Storage Info ───────────────────────────────────────────
@app.route('/api/storage-info', methods=['GET'])
def storage_info():
    try:
        total_size = 0
        file_count = 0
        folder_count = 0
        types = {
            'pdf': {'size': 0, 'count': 0},
            'img': {'size': 0, 'count': 0},
            'doc': {'size': 0, 'count': 0},
            'xl': {'size': 0, 'count': 0},
            'other': {'size': 0, 'count': 0}
        }
        
        folder_sizes = {}

        for root, dirs, files in os.walk(UPLOAD_FOLDER):
            # Exclude trash from storage count
            dirs[:] = [d for d in dirs if d != '.trash']
            folder_count += len(dirs)
            
            for f in files:
                if f.startswith('.'): continue
                fp = os.path.join(root, f)
                size = os.path.getsize(fp)
                total_size += size
                file_count += 1
                
                rel_path = os.path.relpath(root, UPLOAD_FOLDER)
                if rel_path != '.':
                    top_folder = rel_path.split(os.sep)[0]
                    folder_sizes[top_folder] = folder_sizes.get(top_folder, 0) + size
                
                ext = f.split('.')[-1].lower() if '.' in f else ''
                if ext == 'pdf':
                    types['pdf']['size'] += size
                    types['pdf']['count'] += 1
                elif ext in ['png','jpg','jpeg','gif','webp','svg']:
                    types['img']['size'] += size
                    types['img']['count'] += 1
                elif ext in ['doc','docx','txt']:
                    types['doc']['size'] += size
                    types['doc']['count'] += 1
                elif ext in ['xls','xlsx','csv']:
                    types['xl']['size'] += size
                    types['xl']['count'] += 1
                else:
                    types['other']['size'] += size
                    types['other']['count'] += 1
                    
        top_folders_list = sorted([{"name": k, "size": v} for k, v in folder_sizes.items()], key=lambda x: x["size"], reverse=True)[:5]

        return jsonify({
            'success':       True,
            'total_files':   file_count,
            'total_folders': folder_count,
            'total_size':    total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'max_size_mb':   100,
            'categories':    types,
            'top_folders':   top_folders_list
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Compress files into a ZIP ──────────────────────────────────
@app.route('/api/files/compress', methods=['POST'])
def compress_files():
    import io
    import zipfile
    try:
        data = request.json or {}
        file_paths = data.get('files', [])
        if not file_paths:
            return jsonify({'error': 'No se especificaron archivos.'}), 400
        
        # Create an in-memory zip file
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for path in file_paths:
                # Resolve relative path inside UPLOAD_FOLDER
                cleaned_path = path.replace('/uploads/', '', 1).replace('uploads/', '', 1)
                safe_path = safe_join(UPLOAD_FOLDER, cleaned_path)
                if safe_path and os.path.isfile(safe_path):
                    # Keep its directory structure relative to uploads folder
                    arcname = os.path.relpath(safe_path, UPLOAD_FOLDER)
                    # Strip timestamp from filename for the ZIP archive
                    folder_path, file_name = os.path.split(arcname)
                    arcname = os.path.join(folder_path, original_name(file_name)) if folder_path else original_name(file_name)
                    zipf.write(safe_path, arcname)
        
        memory_file.seek(0)
        response = send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='descarga_dashq_compreso.zip'
        )
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Cache-Control'] = 'no-store, max-age=0'
        return response
    except Exception as e:
        print("Error al comprimir archivos:", e)
        return jsonify({'error': str(e)}), 500

# ── Ollama proxy ───────────────────────────────────────────
@app.route('/api/ollama/models', methods=['GET'])
def list_ollama_models():
    try:
        req = urllib.request.Request('http://localhost:11434/api/tags')
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))
            return jsonify({'success': True, 'models': [m['name'].split(':')[0] for m in data.get('models', [])]}), 200
    except Exception:
        return jsonify({'success': False, 'models': [], 'error': 'Ollama no está iniciado.'}), 200

@app.route('/api/ollama/generate', methods=['POST'])
def generate_ollama():
    try:
        body     = request.get_json()
        req_data = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(
            'http://localhost:11434/api/generate',
            data=req_data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=45) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return jsonify({'success': True, 'response': res_data.get('response', '')}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ── Pin system ───────────────────────────────────────────


def load_pins():
    if os.path.exists(PINS_FILE):
        with open(PINS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_pins(pins):
    with open(PINS_FILE, 'w', encoding='utf-8') as f:
        json.dump(pins, f, ensure_ascii=False, indent=2)

@app.route('/api/pins', methods=['GET'])
def get_pins():
    pins = load_pins()
    dirty = False
    keys_to_remove = []
    
    # Auto-cleanup: remove pins that no longer exist
    for path in pins.keys():
        abs_path = safe_join(UPLOAD_FOLDER, path)
        if not abs_path or not os.path.exists(abs_path):
            keys_to_remove.append(path)
            
    for k in keys_to_remove:
        del pins[k]
        dirty = True
        
    if dirty:
        save_pins(pins)
        
    return jsonify(list(pins.values()))

@app.route('/api/pins', methods=['POST'])
def add_pin():
    data = request.get_json() or {}
    path = data.get('path')
    if not path: return jsonify({'error': 'No path provided'}), 400
    pins = load_pins()
    if path not in pins:
        pins[path] = data
        save_pins(pins)
    return jsonify({'success': True, 'pins': pins})

@app.route('/api/pins', methods=['DELETE'])
def remove_pin():
    data = request.get_json() or {}
    path = data.get('path')
    if not path: return jsonify({'error': 'No path provided'}), 400
    pins = load_pins()
    if path in pins:
        del pins[path]
        save_pins(pins)
    return jsonify({'success': True, 'pins': pins})

@app.route('/api/pins/reorder', methods=['POST'])
def reorder_pins():
    data = request.get_json() or {}
    new_order = data.get('order', [])
    pins = load_pins()
    new_pins = {}
    for path in new_order:
        if path in pins:
            new_pins[path] = pins[path]
    for path, meta in pins.items():
        if path not in new_pins:
            new_pins[path] = meta
    save_pins(new_pins)
    return jsonify({'success': True, 'pins': new_pins})


# ── Share system ───────────────────────────────────────────
SHARES_FILE = os.path.join(BASE_DATA_DIR, 'shares.json')

def load_shares():
    if os.path.exists(SHARES_FILE):
        with open(SHARES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_shares(shares):
    with open(SHARES_FILE, 'w', encoding='utf-8') as f:
        json.dump(shares, f, ensure_ascii=False, indent=2)

@app.route('/api/share', methods=['POST'])
def create_share():
    """POST {path, name, type} -> {token, url}"""
    data = request.get_json() or {}
    path = data.get('path', '').strip('/')
    import urllib.parse
    path = urllib.parse.unquote(path)
    name = data.get('name', path.split('/')[-1])
    name = urllib.parse.unquote(name)
    item_type = data.get('type', 'file')  # 'file' | 'folder'

    if not path:
        return jsonify({'error': 'path required'}), 400

    token = secrets.token_urlsafe(16)
    shares = load_shares()
    shares[token] = {
        'path': path,
        'name': name,
        'type': item_type,
        'created_at': datetime.now().isoformat(),
        'token': token
    }
    save_shares(shares)
    return jsonify({'token': token, 'url': f'/s/{token}'}), 200

@app.route('/api/share', methods=['GET'])
def list_shares():
    return jsonify(list(load_shares().values())), 200

@app.route('/api/share/<token>', methods=['DELETE'])
def revoke_share(token):
    shares = load_shares()
    if token not in shares:
        return jsonify({'error': 'Not found'}), 404
    del shares[token]
    save_shares(shares)
    return jsonify({'success': True}), 200

@app.route('/s/<token>')
def access_share(token):
    """Public share link — serve file or zip folder."""
    shares = load_shares()
    share = shares.get(token)
    if not share:
        return '<h2>Enlace no válido o expirado.</h2>', 404

    path = share['path']
    name = share['name']
    item_type = share.get('type', 'file')

    if item_type == 'folder':
        # Zip the entire folder and serve it
        folder_abs = safe_join(UPLOAD_FOLDER, path)
        if folder_abs is None or not os.path.isdir(folder_abs):
            return '<h2>Carpeta no encontrada.</h2>', 404
        import tempfile
        mem = tempfile.TemporaryFile()
        with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(folder_abs):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    arcname = os.path.relpath(fpath, folder_abs)
                    zf.write(fpath, arcname)
        mem.seek(0)
        response = send_file(mem, mimetype='application/zip',
                         as_attachment=True,
                         download_name=f'{name}.zip')
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Cache-Control'] = 'no-store, max-age=0'
        return response
    else:
        # Serve the file directly
        cleaned = path.replace('uploads/', '', 1)
        parts = cleaned.split('/')
        filename = parts[-1]
        subfolder = '/'.join(parts[:-1]) if len(parts) > 1 else ''
        abs_path = safe_join(UPLOAD_FOLDER, subfolder, filename) if subfolder else safe_join(UPLOAD_FOLDER, filename)
        if abs_path is None or not os.path.isfile(abs_path):
            return '<h2>Archivo no encontrado.</h2>', 404
        response = send_file(abs_path, as_attachment=True, download_name=name)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Cache-Control'] = 'no-store, max-age=0'
        return response

# ── System Version ─────────────────────────────────────────
@app.route('/api/system/version', methods=['GET'])
def system_version():
    """GET /api/system/version — Return current version, last update date, and history."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(project_root, 'config', 'dashq.apy')
    history_path = os.path.join(project_root, 'data', 'update_history.json')
    
    version = '1.0.0'
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            version = config.get('version', '1.0.0')
    except Exception:
        pass
    
    history = []
    try:
        with open(history_path, 'r', encoding='utf-8') as f:
            history = json.load(f)
    except Exception:
        pass

    # Ensure latest updates are returned first, with automatic numbering in the frontend.
    history.sort(key=lambda item: item.get('date', ''), reverse=True)
    last_update = history[0]['date'] if history else None
    
    return jsonify({
        'version': version,
        'last_update': last_update,
        'history': history[:20]  # Last 20 updates
    }), 200

# ── Local System Updates (Electron) ──────────────────────
@app.route('/api/system/update/upload', methods=['POST'])
def upload_local_update():
    """Upload latest.yml and installer for local auto-updater"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    filename = secure_filename(file.filename)
    if not (filename.endswith('.yml') or filename.endswith('.exe') or filename.endswith('.blockmap')):
        return jsonify({'error': 'Formato no permitido'}), 400
        
    file_path = os.path.join(UPDATES_FOLDER, filename)
    file.save(file_path)
    return jsonify({'status': 'success'})

@app.route('/api/updates/<path:filename>')
def serve_update_file(filename):
    """Serve the update files to Electron"""
    return send_from_directory(UPDATES_FOLDER, filename)

@app.route('/api/system/download-installer', methods=['GET'])
def download_installer():
    """Descargar el instalador de la app de escritorio directamente desde la web"""
    if not os.path.exists(UPDATES_FOLDER):
        return 'No se encontraron actualizaciones compiladas. Haz clic en "Compilar Todo" primero.', 404
        
    exes = [f for f in os.listdir(UPDATES_FOLDER) if f.endswith('.exe') and 'uninstaller' not in f]
    if not exes:
        return 'No hay instaladores (.exe) disponibles. Haz clic en "Compilar Todo" primero.', 404
        
    latest_exe = max(exes, key=lambda x: os.path.getmtime(os.path.join(UPDATES_FOLDER, x)))
    return send_from_directory(UPDATES_FOLDER, latest_exe, as_attachment=True)

# ── System Update ──────────────────────────────────────────
@app.route('/api/system/push-update', methods=['POST'])
def system_push_update():
    """
    POST /api/system/push-update
    Lee el archivo dashq_server_patch.zip local y lo envía vía POST a la IP destino.
    """
    import requests
    data = request.json or {}
    target = data.get('target_ip')
    if not target:
        return jsonify({'error': 'Falta target_ip'}), 400
        
    if not target.startswith('http'):
        target = f'http://{target}'
    
    # Check if target has port (http://ip:port) - simple check
    from urllib.parse import urlparse
    parsed = urlparse(target)
    if not parsed.port:
        target = f"{target}:5000"
        
    patch_path = os.path.join(UPDATES_FOLDER, 'dashq_server_patch.zip')
    if not os.path.exists(patch_path):
        return jsonify({'error': 'Parche del servidor no encontrado. Haz clic en "Compilar Todo" primero para generarlo.'}), 404
        
    target_url = f"{target}/api/system/update"
    
    try:
        with open(patch_path, 'rb') as f:
            files = {'update_file': ('dashq_server_patch.zip', f, 'application/zip')}
            resp = requests.post(target_url, files=files, timeout=30)
            
        if resp.status_code == 200:
            return jsonify({'success': True, 'msg': 'Actualización inyectada. El nodo remoto se está reiniciando.'})
        else:
            return jsonify({'error': f'El nodo remoto devolvió error: {resp.text}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error de conexión con {target}: {str(e)}'}), 500

@app.route('/api/system/update', methods=['POST'])
def system_update():
    """
    POST /api/system/update
    Upload a ZIP file containing system updates. Extracted into the project root,
    protecting all user data (uploads, trash, pins, shares, etc).
    """
    if 'update_file' not in request.files:
        return jsonify({'error': 'Falta el archivo de actualización (update_file)'}), 400
        
    file = request.files['update_file']
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
        
    if not file.filename.lower().endswith('.zip'):
        return jsonify({'error': 'Solo se permiten archivos comprimidos ZIP'}), 400
    
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    zip_path = os.path.join(project_root, 'temp_update.zip')
    history_path = os.path.join(project_root, 'data', 'update_history.json')
    
    file.save(zip_path)
    
    # Protected paths — NEVER overwrite these
    protected_prefixes = (
        'data/uploads/', 'data/trash/', 'data\\uploads\\', 'data\\trash\\',
        'uploads/', 'trash/',
    )
    protected_files = (
        'data/pins.json', 'data/shares.json', 'data/update_history.json',
        'temp_update.zip',
    )
    
    try:
        # Read incoming version from the ZIP's config file
        incoming_version = None
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.infolist():
                if member.filename.replace('\\', '/').endswith('config/dashq.apy'):
                    try:
                        with zip_ref.open(member) as cfg:
                            incoming_config = json.loads(cfg.read().decode('utf-8'))
                            incoming_version = incoming_config.get('version', 'desconocida')
                    except Exception:
                        pass
                    break
        
        # We start the update process in the background so the request doesn't timeout
        import threading
        
        def background_update_task():
            try:
                staging_dir = os.path.join(project_root, 'temp_update_staging')
                if os.path.exists(staging_dir):
                    shutil.rmtree(staging_dir, ignore_errors=True)
                os.makedirs(staging_dir, exist_ok=True)
                
                extracted_count = 0
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    for member in zip_ref.infolist():
                        member_path = member.filename.replace('\\', '/')
                        
                        if member.is_dir(): continue
                        
                        skip = False
                        for prefix in protected_prefixes:
                            if member_path.startswith(prefix) or prefix in member_path:
                                skip = True; break
                        for pf in protected_files:
                            if member_path.endswith(pf):
                                skip = True; break
                        if skip: continue
                        if member_path.startswith('.') or '/.' in member_path: continue
                        if 'node_modules/' in member_path or '__pycache__/' in member_path or member_path.endswith('.pyc'): continue
                        
                        target_path = os.path.abspath(os.path.join(staging_dir, member.filename))
                        if not target_path.startswith(os.path.abspath(staging_dir)): continue
                        
                        os.makedirs(os.path.dirname(target_path), exist_ok=True)
                        with zip_ref.open(member) as source, open(target_path, 'wb') as target:
                            target.write(source.read())
                        extracted_count += 1
                        
                frontend_updated = False
                for root, dirs, files_in_dir in os.walk(staging_dir):
                    for file_name in files_in_dir:
                        staging_file_path = os.path.join(root, file_name)
                        rel_path = os.path.relpath(staging_file_path, staging_dir)
                        dest_file_path = os.path.join(project_root, rel_path)
                        os.makedirs(os.path.dirname(dest_file_path), exist_ok=True)
                        shutil.copy2(staging_file_path, dest_file_path)
                        if 'src/react-frontend/' in rel_path.replace('\\', '/'):
                            frontend_updated = True

                mirror_dirs = ['src', 'config']
                for m_dir in mirror_dirs:
                    live_dir = os.path.join(project_root, m_dir)
                    if not os.path.exists(live_dir): continue
                    for r, d, fs in os.walk(live_dir):
                        for fname in fs:
                            live_file_path = os.path.join(r, fname)
                            if '__pycache__' in live_file_path or fname.endswith('.pyc'): continue
                            rel_path = os.path.relpath(live_file_path, project_root)
                            rel_path_unix = rel_path.replace('\\', '/')
                            if 'node_modules/' in rel_path_unix or 'dist/' in rel_path_unix or '.vite/' in rel_path_unix: continue
                            stage_file_path = os.path.join(staging_dir, rel_path)
                            if not os.path.exists(stage_file_path):
                                try: os.remove(live_file_path)
                                except: pass
                            
                shutil.rmtree(staging_dir, ignore_errors=True)
                
                if frontend_updated:
                    import subprocess
                    frontend_dir = os.path.join(project_root, 'src', 'react-frontend')
                    if os.name == 'nt':
                        subprocess.Popen(['cmd.exe', '/c', 'npm install && npm run build'], cwd=frontend_dir, creationflags=subprocess.CREATE_NO_WINDOW)
                    else:
                        subprocess.Popen(['sh', '-c', 'npm install && npm run build'], cwd=frontend_dir, start_new_session=True)
                    
                history = []
                try:
                    with open(history_path, 'r', encoding='utf-8') as f:
                        history = json.load(f)
                except: pass
                
                current_version = incoming_version or 'desconocida'
                history.insert(0, {
                    'version': current_version,
                    'date': datetime.now().isoformat(),
                    'files_updated': extracted_count,
                    'source_file': file.filename,
                    'status': 'success'
                })
                history = history[:50]
                os.makedirs(os.path.dirname(history_path), exist_ok=True)
                with open(history_path, 'w', encoding='utf-8') as f:
                    json.dump(history, f, indent=2, ensure_ascii=False)
                
                try: os.remove(zip_path)
                except: pass
                
            except Exception as e:
                print(f"Error in background update: {e}")
                if os.path.exists(zip_path):
                    try: os.remove(zip_path)
                    except: pass
        
        threading.Thread(target=background_update_task).start()
        
        current_version = incoming_version or 'desconocida'
        return jsonify({
            'success': True,
            'message': f'Actualización v{current_version} iniciada en segundo plano.',
            'files_updated': 0,
            'version': current_version
        }), 200
        
    except Exception as e:
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
            except Exception:
                pass
        return jsonify({'error': f'Error de descompresión: {str(e)}'}), 500

# ── Export# ── System Maintenance ───────────────────────────────────────
@app.route('/api/system/export-db', methods=['GET'])
def export_db():
    if not os.path.exists(DB_PATH):
        return jsonify({'error': 'No database found'}), 404
    return send_file(DB_PATH, as_attachment=True, download_name=f'dashq_db_backup_{datetime.now().strftime("%Y%m%d")}.db')

@app.route('/api/system/build-all', methods=['GET'])
def system_build_all():
    """
    GET /api/system/build-all
    Ejecuta el script de compilación global (build_all.py) y emite los logs en tiempo real vía SSE.
    """
    def generate():
        import subprocess
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        script_path = os.path.join(project_root, 'build_all.py')
        
        if not os.path.exists(script_path):
            yield f"data: [ERROR] Script {script_path} no encontrado\n\n"
            yield "data: [DONE]\n\n"
            return

        process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=project_root
        )

        for line in iter(process.stdout.readline, ''):
            # Escapar saltos de línea para el formato SSE
            clean_line = line.replace('\n', '<br>')
            yield f"data: {clean_line}\n\n"
            
        process.wait()
        yield f"data: [DONE]\n\n"

    from flask import Response
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/system/export', methods=['GET'])
def system_export():
    """
    GET /api/system/export
    Compile the entire system code (excluding user data) into a downloadable ZIP.
    """
    import io
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    mem = io.BytesIO()
    
    # Directories to completely skip
    skip_dirs = {
        'node_modules', '__pycache__', '.git', '.gemini', '.agents',
        'temp_jsdom_test', '.vscode', '.idea'
    }
    
    # Relative paths (from project root) to skip
    skip_paths = {
        'data/uploads', 'data/trash', 'data/thumbnails', 'data/updates'
    }
    
    # Files to skip
    skip_files = {
        'data/pins.json', 'data/shares.json', 'data/update_history.json',
        'data/dashq.db', 'temp_update.zip',
    }
    
    # Auto-increment version before zipping
    version = '1.0.0'
    config_path = os.path.join(project_root, 'config', 'dashq.apy')
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                version = config_data.get('version', '1.0.0')
            
            import re
            match = re.match(r'v?(\d+)\.(\d+)\.(\d+)', version)
            if match:
                major, minor, patch = match.groups()
                new_version = f"v{major}.{minor}.{int(patch) + 1}"
            else:
                new_version = version + "-updated"
                
            config_data['version'] = new_version
            version = new_version
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=4)
    except Exception as e:
        print("Error bumping version:", e)

    try:
        file_count = 0
        with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, filenames in os.walk(project_root):
                # Calculate relative directory path
                rel_dir = os.path.relpath(root, project_root).replace('\\', '/')
                if rel_dir == '.':
                    rel_dir = ''
                
                # Skip blacklisted directories
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                
                # Skip data/uploads and data/trash
                if rel_dir in skip_paths or any(rel_dir.startswith(sp + '/') for sp in skip_paths):
                    dirs.clear()
                    continue
                
                for fname in filenames:
                    # Build relative file path
                    rel_file = os.path.join(rel_dir, fname).replace('\\', '/') if rel_dir else fname
                    
                    # Skip blacklisted files
                    if rel_file in skip_files:
                        continue
                    
                    # Skip hidden files, compiled files, temp zips, map files
                    if fname.startswith('.') or fname.endswith('.pyc'):
                        continue
                    if fname == 'temp_update.zip':
                        continue
                    # Skip source maps (large, not needed for deployment)
                    if fname.endswith('.js.map'):
                        continue
                    
                    fpath = os.path.join(root, fname)
                    zf.write(fpath, rel_file)
                    file_count += 1
                    
        mem.seek(0)
        
        # Version already bumped and read above
        
        download_name = f'dashq_sistema_v{version}.zip'
        
        response = send_file(mem, mimetype='application/zip',
                         as_attachment=True,
                         download_name=download_name)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Cache-Control'] = 'no-store, max-age=0'
        return response
    except Exception as e:
        return jsonify({'error': f'Error al compilar el ZIP: {str(e)}'}), 500

# ── Security Headers ─────────────────────────────────────────────
@app.after_request
def add_security_headers(response):
    """Add standard security headers to prevent browser download trust warnings."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Trust localhost downloads natively
    response.headers['Referrer-Policy'] = 'no-referrer-when-downgrade'
    return response

@app.route('/api/files/<file_id>/download', methods=['GET'])
def download_file_by_id(file_id):
    conn = get_db()
    cursor = conn.execute('SELECT filename, original_name FROM files WHERE id = ?', (file_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        # Fallback for attached files
        if os.path.exists(os.path.join(REGISTROS_FOLDER, file_id)):
            return send_from_directory(REGISTROS_FOLDER, file_id, as_attachment=False)
        elif os.path.exists(os.path.join(UPLOAD_FOLDER, file_id)):
            return send_from_directory(UPLOAD_FOLDER, file_id, as_attachment=False)
        return "File not found", 404
    
    return send_from_directory(
        UPLOAD_FOLDER, 
        row['filename'],
        as_attachment=False, # Allow browser to view inline (important for PDF viewer)
        download_name=row['original_name']
    )

# ── Error handlers ───────────────────────────────────────────────




@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large (max 100 MB)'}), 413

# ── Main ───────────────────────────────────────────────────
# ── Update File (overwrite existing) ───────────────────────
@app.route('/api/update_file', methods=['POST'])
def update_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    
    # We expect a relative path like 'Folder/File.xlsx' or 'File.xlsx'
    rel_path = request.form.get('path', '').strip('/')
    if not rel_path:
        return jsonify({'error': 'No path provided'}), 400

    try:
        abs_path = safe_join(UPLOAD_FOLDER, rel_path)
        if abs_path is None:
            return jsonify({'error': 'Invalid path'}), 400

        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        file.save(abs_path)
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Metadata API ───────────────────────────────────────────
@app.route('/api/metadata', methods=['POST'])
def update_metadata():
    data = request.json
    file_id = data.get('id')
    is_starred = data.get('isStarred')
    tags = data.get('tags')
    
    if not file_id:
        return jsonify({'error': 'Missing file id'}), 400
        
    conn = get_db()
    cursor = conn.execute('SELECT id FROM files WHERE id = ?', (file_id,))
    if not cursor.fetchone():
        conn.execute('INSERT INTO files (id) VALUES (?)', (file_id,))
        
    if is_starred is not None:
        conn.execute('UPDATE files SET is_starred = ? WHERE id = ?', (1 if is_starred else 0, file_id))
    
    if tags is not None:
        conn.execute('UPDATE files SET tags = ? WHERE id = ?', (json.dumps(tags), file_id))
        
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# --- NOTES / LIBRARY API ---

@app.route('/api/notes', methods=['GET'])
def get_notes():
    file_id = request.args.get('file_id')
    note_type = request.args.get('type')
    
    conn = get_db()
    query = 'SELECT * FROM notes'
    params = []
    
    if file_id:
        query += ' WHERE file_id = ?'
        params.append(file_id)
    elif note_type:
        query += ' WHERE type = ?'
        params.append(note_type)
        
    query += ' ORDER BY created_at DESC'
    
    cursor = conn.execute(query, params)
    notes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Parse JSON fields
    for n in notes:
        try:
            n['linked_files'] = json.loads(n['linked_files'])
        except Exception:
            n['linked_files'] = []
            
    return jsonify(notes)

@app.route('/api/notes', methods=['POST'])
def create_note():
    note_id = str(uuid.uuid4())
    attached_file_id = None
    
    if request.content_type and request.content_type.startswith('multipart/form-data'):
        data = request.form
        linked_files_raw = data.get('linked_files', '[]')
        try:
            linked_files = json.loads(linked_files_raw)
        except Exception:
            linked_files = []
            
            # Handle file upload if present
        if 'file' in request.files and request.files['file'].filename:
            file = request.files['file']
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            
            os.makedirs(REGISTROS_FOLDER, exist_ok=True)
            file_path = os.path.join(REGISTROS_FOLDER, filename)
            file.save(file_path)
            
            attached_file_id = filename 
    else:
        data = request.json
        linked_files = data.get('linked_files', [])
        
    file_id = data.get('file_id', '')
    title = data.get('title', '')
    content = data.get('content', '')
    note_type = data.get('type', 'general')
    created_by = data.get('created_by', 'Usuario')
    record_number = data.get('record_number', '')
    record_year = data.get('record_year', '')
    tracking_code = data.get('tracking_code', '').strip()
    created_at = datetime.now().isoformat()
    
    conn = get_db()
    
    # Auto-generate tracking_code if empty
    if not tracking_code:
        import random
        import string
        while True:
            tracking_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            cursor = conn.execute('SELECT id FROM notes WHERE tracking_code = ?', (tracking_code,))
            if not cursor.fetchone():
                break
        
    conn.execute(
        'INSERT INTO notes (id, file_id, linked_files, title, content, type, created_by, created_at, record_number, record_year, attached_file_id, tracking_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (note_id, file_id, json.dumps(linked_files), title, content, note_type, created_by, created_at, record_number, record_year, attached_file_id, tracking_code)
    )
    conn.commit()
    
    cursor = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    new_note = dict(cursor.fetchone())
    conn.close()
    
    try:
        new_note['linked_files'] = json.loads(new_note['linked_files'])
    except:
        new_note['linked_files'] = []
        
    return jsonify(new_note)

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    conn = get_db()
    cursor = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Note not found'}), 404
        
    if request.content_type and request.content_type.startswith('multipart/form-data'):
        data = request.form
        try:
            linked_files = json.loads(data.get('linked_files', '[]'))
        except:
            linked_files = None
    else:
        data = request.json or {}
        linked_files = data.get('linked_files')
        
    title = data.get('title')
    content = data.get('content')
    
    updates = []
    params = []
    
    if title is not None:
        updates.append('title = ?')
        params.append(title)
    if content is not None:
        updates.append('content = ?')
        params.append(content)
    if linked_files is not None:
        updates.append('linked_files = ?')
        params.append(json.dumps(linked_files))
        
    # Handle file upload if present
    if 'file' in request.files and request.files['file'].filename:
        # Purge old file if exists
        old_file_id = existing['attached_file_id']
        if old_file_id:
            old_path = os.path.join(REGISTROS_FOLDER, old_file_id)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    print(f"Error purging old file: {e}")
            # Also clean up from UPLOAD_FOLDER and db just in case it was a previous upload
            old_path_up = os.path.join(UPLOAD_FOLDER, old_file_id)
            if os.path.exists(old_path_up):
                try:
                    os.remove(old_path_up)
                except Exception: pass
            conn.execute('DELETE FROM files WHERE id = ?', (old_file_id,))
            
        # Save new file
        file = request.files['file']
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        
        os.makedirs(REGISTROS_FOLDER, exist_ok=True)
        file_path = os.path.join(REGISTROS_FOLDER, filename)
        file.save(file_path)
        
        attached_file_id = filename
        
        updates.append('attached_file_id = ?')
        params.append(attached_file_id)

    if updates:
        params.append(note_id)
        query = 'UPDATE notes SET ' + ', '.join(updates) + ' WHERE id = ?'
        conn.execute(query, params)
        conn.commit()
        
    cursor = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    updated_note = dict(cursor.fetchone())
    conn.close()
    
    try:
        updated_note['linked_files'] = json.loads(updated_note['linked_files'])
    except:
        updated_note['linked_files'] = []
        
    return jsonify(updated_note)

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    conn = get_db()
    
    # 1. Check for attached file
    cursor = conn.execute('SELECT attached_file_id FROM notes WHERE id = ?', (note_id,))
    row = cursor.fetchone()
    if row and row['attached_file_id']:
        attached_file_id = row['attached_file_id']
        
        f_cursor = conn.execute('SELECT filename FROM files WHERE id = ?', (attached_file_id,))
        f_row = f_cursor.fetchone()
        if f_row:
            filename = f_row['filename']
            try:
                fp = safe_join(UPLOAD_FOLDER, filename)
                if fp and os.path.exists(fp):
                    trash_abs = safe_join(TRASH_FOLDER, filename)
                    os.makedirs(os.path.dirname(trash_abs), exist_ok=True)
                    shutil.move(fp, trash_abs)
                    
                    meta_abs = trash_abs + '.meta.json'
                    with open(meta_abs, 'w', encoding='utf-8') as mf:
                        json.dump({'original_path': filename, 'trash_date': datetime.now().isoformat()}, mf)
            except Exception:
                pass
                
            conn.execute('DELETE FROM files WHERE id = ?', (attached_file_id,))
            
    conn.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})
@app.route('/api/system/tunnel', methods=['GET'])
def get_tunnel():
    global TUNNEL_URL
    import socket
    local_ip = '127.0.0.1'
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    return jsonify({
        'url': TUNNEL_URL,
        'local_ip': f"http://{local_ip}:5000"
    })


@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(project_root, 'config', 'dashq.apy')
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except Exception:
        config_data = {}
        
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if 'gemini_api_key' in data:
            config_data['gemini_api_key'] = data['gemini_api_key']
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=4)
        return jsonify({'status': 'success'})
    
    return jsonify(config_data)

@app.route('/api/chat', methods=['POST'])
def api_chat():
    import urllib.parse
    data = request.get_json(silent=True) or {}
    message = data.get('message', '')
    file_id = urllib.parse.unquote(data.get('file_id', ''))
    
    if not message or not file_id:
        return jsonify({'error': 'Message or file_id missing'}), 400
        
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(project_root, 'config', 'dashq.apy')
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            api_key = json.load(f).get('gemini_api_key', '')
    except Exception:
        api_key = ''
        
    if not api_key:
        return jsonify({'error': 'Falta la API Key de Gemini. Configurala en la pestana Configuracion.'}), 401
        
    try:
        import google.generativeai as genai
        import fitz  # PyMuPDF
    except ImportError:
        return jsonify({'error': 'Faltan dependencias de IA. (google-generativeai, PyMuPDF)'}), 500
        
    try:
        pdf_path = os.path.join(UPLOAD_FOLDER, file_id)
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF not found'}), 404
            
        doc = fitz.open(pdf_path)
        pdf_text = ""
        for page_num in range(min(20, len(doc))):
            page = doc.load_page(page_num)
            pdf_text += f"\n--- Page {page_num+1} ---\n"
            pdf_text += page.get_text()
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-3.5-flash')
        
        prompt = f"Sistema: Eres un asistente documental inteligente de DashQ. Analiza el siguiente extracto del documento y responde la pregunta del usuario de forma concisa y profesional en Espanol.\n\nDocumento:\n{pdf_text[:100000]}\n\nPregunta del Usuario: {message}"
        
        response = model.generate_content(prompt)
        return jsonify({'response': response.text})
    except Exception as e:
        print("AI Error:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Inicializando base de datos SQLite...")
    init_db()
    sync_db_with_disk()
    print("Sincronización completa.")
    

    import subprocess

    TUNNEL_URL = None
    TUNNEL_PROCESS = None
    
    def run_localtunnel():
        global TUNNEL_URL, TUNNEL_PROCESS
        if TUNNEL_PROCESS is not None:
            return
        try:
            import urllib.request
            print("[*] Iniciando túnel HTTPS de alta velocidad (Cloudflare)...")
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            bin_dir = os.path.join(project_root, 'bin')
            if getattr(sys, 'frozen', False):
                install_dir = os.path.abspath(os.path.join(os.path.dirname(sys.executable), '..', '..'))
                bin_dir = os.path.join(install_dir, 'bin')
            if not os.path.exists(bin_dir):
                os.makedirs(bin_dir, exist_ok=True)
            cloudflared_path = os.path.join(bin_dir, 'cloudflared.exe')
            if not os.path.exists(cloudflared_path):
                print("[*] Descargando motor Cloudflare... (solo la primera vez)")
                urllib.request.urlretrieve("https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe", cloudflared_path)
            
            TUNNEL_PROCESS = subprocess.Popen(
                [cloudflared_path, "tunnel", "--url", "http://127.0.0.1:5000"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            for line in iter(TUNNEL_PROCESS.stderr.readline, ''):
                if '.trycloudflare.com' in line:
                    parts = line.split('https://')
                    if len(parts) > 1:
                        url = 'https://' + parts[1].split()[0].strip()
                        TUNNEL_URL = url
                        print("\n==================================================")
                        print(f"[*] TUNEL SEGURO CREADO (CLOUDFLARE): {url}")
                        print("==================================================\n")
        except Exception as e:
            print(f"[!] Error al iniciar túnel: {e}")

@app.route('/api/system/tunnel/start', methods=['POST'])
def start_tunnel():
    global TUNNEL_PROCESS, TUNNEL_URL
    if TUNNEL_PROCESS is not None:
        return jsonify({'status': 'already_running'})
    threading.Thread(target=run_localtunnel, daemon=True).start()
    return jsonify({'status': 'success'})

@app.route('/api/system/tunnel/stop', methods=['POST'])
def stop_tunnel():
    global TUNNEL_PROCESS, TUNNEL_URL
    if TUNNEL_PROCESS is not None:
        try:
            # En Windows podemos matar el proceso de forma agresiva para asegurar que cloudflared termine
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(TUNNEL_PROCESS.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                TUNNEL_PROCESS.terminate()
            TUNNEL_PROCESS = None
            TUNNEL_URL = None
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    return jsonify({'status': 'success'})

@app.route('/api/system/open-folder', methods=['POST'])
def open_system_folder():
    try:
        if sys.platform == 'win32':
            os.startfile(UPLOAD_FOLDER)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
            

if __name__ == '__main__':
    try:
        threading.Thread(target=run_localtunnel, daemon=True).start()
    except Exception:
        pass
    
    print('+' + '-'*60 + '+')
    print('|  DashQ API Backend                                        |')
    print('|  http://127.0.0.1:5000                                    |')
    print('+' + '-'*60 + '+')
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
