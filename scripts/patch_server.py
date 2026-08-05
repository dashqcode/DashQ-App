import os, sys

path = 'c:/Users/alexs/Documents/FILE/src/backend/server.py'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "UPLOAD_FOLDER = os.path.join(BASE_DATA_DIR, 'uploads')",
    "UPLOAD_FOLDER = os.path.join(BASE_DATA_DIR, 'uploads')\nREGISTROS_FOLDER = os.path.join(BASE_DATA_DIR, 'registros')"
)

c = c.replace(
    "os.makedirs(UPLOAD_FOLDER, exist_ok=True)\nos.makedirs(TRASH_FOLDER,  exist_ok=True)",
    "os.makedirs(UPLOAD_FOLDER, exist_ok=True)\nos.makedirs(REGISTROS_FOLDER, exist_ok=True)\nos.makedirs(TRASH_FOLDER,  exist_ok=True)"
)

# For create_note
c = c.replace(
    "            os.makedirs(UPLOAD_FOLDER, exist_ok=True)\n            file_path = os.path.join(UPLOAD_FOLDER, filename)",
    "            os.makedirs(REGISTROS_FOLDER, exist_ok=True)\n            file_path = os.path.join(REGISTROS_FOLDER, filename)"
)

# For update_note
c = c.replace(
    "        os.makedirs(UPLOAD_FOLDER, exist_ok=True)\n        file_path = os.path.join(UPLOAD_FOLDER, filename)",
    "        os.makedirs(REGISTROS_FOLDER, exist_ok=True)\n        file_path = os.path.join(REGISTROS_FOLDER, filename)"
)

# For download_file_by_id fallback
old_fallback = '''    if not row:
        # Fallback for attached files that were not added to the files table
        if os.path.exists(os.path.join(UPLOAD_FOLDER, file_id)):
            return send_from_directory(
                UPLOAD_FOLDER,
                file_id,
                as_attachment=False
            )
        return "File not found", 404'''

new_fallback = '''    if not row:
        # Fallback for attached files
        if os.path.exists(os.path.join(REGISTROS_FOLDER, file_id)):
            return send_from_directory(REGISTROS_FOLDER, file_id, as_attachment=False)
        elif os.path.exists(os.path.join(UPLOAD_FOLDER, file_id)):
            return send_from_directory(UPLOAD_FOLDER, file_id, as_attachment=False)
        return "File not found", 404'''

c = c.replace(old_fallback, new_fallback)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
