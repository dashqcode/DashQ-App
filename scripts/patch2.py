import sys
import os

with open('c:/Users/alexs/Documents/FILE/src/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unicodedata import if missing
if 'import unicodedata' not in content:
    content = content.replace('import json', 'import json\nimport unicodedata')

target = '''        conn = get_db()
        like_query = f"%{search_query}%"
        cursor = conn.execute(\'\'\'
            SELECT * FROM files 
            WHERE filename LIKE ? OR original_name LIKE ? OR folder LIKE ?
            ORDER BY filename ASC
            LIMIT 200
        \'\'\', (like_query, like_query, like_query))
        
        for row in cursor.fetchall():
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
        conn.close()
        
        search_lower = search_query.lower()
        for root, dirs, _ in os.walk(UPLOAD_FOLDER):
            dirs[:] = [d for d in dirs if d != '.trash' and not d.startswith('.')]
            for d in dirs:
                if search_lower in d.lower():
                    rel_dir = os.path.relpath(os.path.join(root, d), UPLOAD_FOLDER).replace('\\\\', '/')
                    if rel_dir == '.': rel_dir = ''
                    folders.append({
                        'id': rel_dir,
                        'name': d,
                        'parentId': os.path.dirname(rel_dir).replace('\\\\', '/') if '/' in rel_dir or '\\\\' in rel_dir else ''
                    })'''

replacement = '''        def normalize_text(text):
            if not text: return ""
            return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower()

        conn = get_db()
        cursor = conn.execute('SELECT * FROM files ORDER BY filename ASC')
        search_norm = normalize_text(search_query)
        
        for row in cursor.fetchall():
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
        conn.close()'''

if target in content:
    content = content.replace(target, replacement)
    with open('c:/Users/alexs/Documents/FILE/src/backend/server.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
