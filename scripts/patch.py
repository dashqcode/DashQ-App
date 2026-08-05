import sys
import os

with open('c:/Users/alexs/Documents/FILE/src/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        for row in cursor.fetchall():
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

        return jsonify({'''

replacement = '''        for row in cursor.fetchall():
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

        search_lower = search_query.lower()
        for root, dirs, _ in os.walk(UPLOAD_FOLDER):
            dirs[:] = [d for d in dirs if d != '.trash' and not d.startswith('.')]
            for d in dirs:
                if search_lower in d.lower():
                    rel_dir = os.path.relpath(os.path.join(root, d), UPLOAD_FOLDER).replace('\\\\', '/')
                    if rel_dir == '.': rel_dir = ''
                    parent_id = os.path.dirname(rel_dir).replace('\\\\', '/') if '/' in rel_dir or '\\\\' in rel_dir else ''
                    folders.append({
                        'id': rel_dir,
                        'name': d,
                        'parentId': parent_id
                    })

        return jsonify({'''

if target in content:
    content = content.replace(target, replacement)
    with open('c:/Users/alexs/Documents/FILE/src/backend/server.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
