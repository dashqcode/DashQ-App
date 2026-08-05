import os
import subprocess
import sys
import shutil
import zipfile
import json
import re

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_DIR = os.path.join(ROOT_DIR, 'src', 'react-frontend')
ELECTRON_DIR = os.path.join(ROOT_DIR, 'src', 'electron-app')
UPDATES_DIR = os.path.join(ROOT_DIR, 'data', 'updates')

def run_cmd(cmd, cwd):
    print(f"\n>>> Ejecutando: {cmd} en {os.path.basename(cwd)}\n", flush=True)
    process = subprocess.Popen(cmd, cwd=cwd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in iter(process.stdout.readline, ''):
        print(line, end='', flush=True)
    process.wait()
    if process.returncode != 0:
        print(f"\n[ERROR] El comando falló con código {process.returncode}")
        sys.exit(1)

def sync_versions():
    print("\n=== Sincronizando Versiones ===", flush=True)
    conca_apy_path = os.path.join(ROOT_DIR, 'config', 'conca.apy')
    try:
        with open(conca_apy_path, 'r', encoding='utf-8') as f:
            conca_config = json.load(f)
        version_str = conca_config.get('version', 'v1.0.0').replace('v', '').replace('V', '')
        
        for app_dir, name in [(REACT_DIR, 'React Frontend'), (ELECTRON_DIR, 'Electron App')]:
            pkg = os.path.join(app_dir, 'package.json')
            if os.path.exists(pkg):
                with open(pkg, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get('version') != version_str:
                    data['version'] = version_str
                    with open(pkg, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                    print(f"[SYNC] {name} actualizado a v{version_str}")
    except Exception as e:
        print(f"[WARN] Error al sincronizar versiones: {e}")

def create_server_patch():
    print("\n=== Creando Paquete del Servidor (Push OTA) ===", flush=True)
    patch_path = os.path.join(UPDATES_DIR, "dashq_server_patch.zip")
    
    skip_dirs = {
        'node_modules', '__pycache__', '.git', '.gemini', '.agents',
        'temp_jsdom_test', '.vscode', '.idea'
    }
    skip_paths = {
        'data/uploads', 'data/trash', 'data/thumbnails', 'data/updates'
    }
    skip_files = {
        'data/pins.json', 'data/shares.json', 'data/update_history.json',
        'data/conca.db', 'temp_update.zip', 'dashq_server_patch.zip'
    }

    try:
        file_count = 0
        with zipfile.ZipFile(patch_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, filenames in os.walk(ROOT_DIR):
                rel_dir = os.path.relpath(root, ROOT_DIR).replace('\\', '/')
                if rel_dir == '.': rel_dir = ''
                
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                
                if rel_dir in skip_paths or any(rel_dir.startswith(sp + '/') for sp in skip_paths):
                    dirs.clear()
                    continue
                
                for fname in filenames:
                    rel_file = os.path.join(rel_dir, fname).replace('\\', '/') if rel_dir else fname
                    if rel_file in skip_files: continue
                    if fname.startswith('.') or fname.endswith('.pyc') or fname == 'temp_update.zip' or fname.endswith('.js.map'): continue
                    
                    fpath = os.path.join(root, fname)
                    zf.write(fpath, rel_file)
                    file_count += 1
                    
        print(f"[OK] Paquete del servidor creado: dashq_server_patch.zip ({file_count} archivos)", flush=True)
    except Exception as e:
        print(f"[ERROR] Fallo al crear el paquete del servidor: {e}")

def main():
    sync_versions()
    os.makedirs(UPDATES_DIR, exist_ok=True)
    print("\n=== Iniciando Compilación Total (Servidor + Desktop) ===", flush=True)
    if not os.path.exists(UPDATES_DIR):
        os.makedirs(UPDATES_DIR)

    # 1. Build React
    run_cmd("npm run build", cwd=REACT_DIR)

    # 2. Build Electron (includes win and mac potentially, generates .exe and latest.yml)
    process = subprocess.Popen("npm run build", cwd=ELECTRON_DIR, shell=True)
    process.wait()

    if process.returncode != 0:
        print("[ERROR] La compilación de Electron falló.")
    else:
        print("\n=== Compilación Exitosa. Empaquetando Actualización OTA ===")
        # Publish OTA files by copying them to data/updates
        source_dist = os.path.join(ROOT_DIR, 'src', 'electron-app', 'dist')
        for file in os.listdir(source_dist):
            if (file.endswith('.yml') or file.endswith('.exe')) and 'uninstaller' not in file:
                shutil.copy2(os.path.join(source_dist, file), os.path.join(UPDATES_DIR, file))
                print(f"[OTA] Publicado y listo para descarga: {file}")

    # 3. Copy to OTA updates folder
    instalador_dir = os.path.join(ROOT_DIR, 'Instalador')
    published = 0
    if os.path.exists(instalador_dir):
        for f in os.listdir(instalador_dir):
            if f.endswith('.exe') or f.endswith('.yml') or f.endswith('.blockmap'):
                src = os.path.join(instalador_dir, f)
                dst = os.path.join(UPDATES_DIR, f)
                shutil.copy2(src, dst)
                print(f"[OTA] Publicado: {f}", flush=True)
                published += 1
                
    # 4. Create Server Patch
    create_server_patch()
    published += 1 # Contamos el patch del servidor
    
    if published > 0:
        print(f"\n=== ¡Finalizado! Se publicaron {published} archivos de actualización. ===", flush=True)
    else:
        print("\n=== Finalizado con advertencia: No se encontraron instaladores para publicar. ===", flush=True)

if __name__ == '__main__':
    # Force unbuffered output for SSE
    sys.stdout.reconfigure(line_buffering=True)
    main()
