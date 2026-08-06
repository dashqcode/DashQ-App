import os
import sys
import zipfile
import shutil
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import cgi

PORT = 5001
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

HTML_CONTENT = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modo Rescate - CONCA</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { background-color: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 500px; width: 100%; border: 1px solid #334155; }
        h1 { color: #f87171; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 10px; }
        p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin-bottom: 30px; }
        .upload-area { border: 2px dashed #475569; border-radius: 12px; padding: 40px 20px; background-color: #0f172a; transition: all 0.3s; cursor: pointer; position: relative; }
        .upload-area:hover { border-color: #f87171; background-color: rgba(248, 113, 113, 0.05); }
        .upload-area input[type="file"] { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .btn { background-color: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; margin-top: 20px; width: 100%; transition: background 0.3s; }
        .btn:hover { background-color: #dc2626; }
        #status { margin-top: 20px; font-weight: bold; color: #22c55e; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ Modo Rescate</h1>
        <p>El servidor principal parece estar caído o corrupto. Sube un archivo ZIP de una versión anterior o un parche de recuperación para reparar el sistema.</p>
        
        <form id="uploadForm" enctype="multipart/form-data" method="post" action="/upload">
            <div class="upload-area">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div id="fileName" style="font-weight: bold; color: #cbd5e1;">Haz clic o arrastra un ZIP aquí</div>
                <input type="file" name="file" accept=".zip" required onchange="document.getElementById('fileName').innerText = this.files[0].name;">
            </div>
            <button type="submit" class="btn" onclick="document.getElementById('status').style.display='block'; document.getElementById('status').innerText='Extrayendo y reiniciando sistema...';">Reparar Sistema</button>
        </form>
        <div id="status"></div>
    </div>
</body>
</html>
"""

class RecoveryHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode('utf-8'))

    def do_POST(self):
        if self.path == '/upload':
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': self.headers['Content-Type']}
            )
            
            if 'file' not in form:
                self.send_error(400, "No file uploaded")
                return

            fileitem = form['file']
            if not fileitem.file:
                self.send_error(400, "Empty file")
                return

            zip_path = os.path.join(ROOT_DIR, "recovery_patch.zip")
            with open(zip_path, 'wb') as f:
                f.write(fileitem.file.read())

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            try:
                # Extraer ZIP
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(ROOT_DIR)
                
                os.remove(zip_path)

                response = """
                <html>
                <body style="background-color:#0f172a; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
                    <h2 style="color:#22c55e;">✅ Sistema Restaurado con Éxito</h2>
                    <p>Los archivos han sido reemplazados. Reinicia manualmente el servidor principal (ej. restart.bat) o cierra esta ventana.</p>
                </body>
                </html>
                """
                self.wfile.write(response.encode('utf-8'))
                print("Recuperación completada exitosamente.")

            except Exception as e:
                response = f"""
                <html>
                <body style="background-color:#0f172a; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
                    <h2 style="color:#ef4444;">❌ Error de Recuperación</h2>
                    <p>{str(e)}</p>
                </body>
                </html>
                """
                self.wfile.write(response.encode('utf-8'))
                print(f"Error: {str(e)}")

def run():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, RecoveryHandler)
    print(f"🛡️  Servidor de Rescate corriendo en http://0.0.0.0:{PORT}")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
