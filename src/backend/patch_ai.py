import sys
import os

path = 'c:/Users/alexs/Documents/FILE/src/backend/server.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

endpoints = """
@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(project_root, 'config', 'conca.apy')
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
    data = request.get_json(silent=True) or {}
    message = data.get('message', '')
    file_id = data.get('file_id', '')
    
    if not message or not file_id:
        return jsonify({'error': 'Message or file_id missing'}), 400
        
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(project_root, 'config', 'conca.apy')
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            api_key = json.load(f).get('gemini_api_key', '')
    except Exception:
        api_key = ''
        
    if not api_key:
        return jsonify({'error': 'Falta la API Key de Gemini. Configúrala en la pestaña Configuración.'}), 401
        
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
            pdf_text += f"\\n--- Page {page_num+1} ---\\n"
            pdf_text += page.get_text()
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"Sistema: Eres un asistente documental inteligente de CONCA. Analiza el siguiente extracto del documento y responde la pregunta del usuario de forma concisa y profesional en Español.\\n\\nDocumento:\\n{pdf_text[:100000]}\\n\\nPregunta del Usuario: {message}"
        
        response = model.generate_content(prompt)
        return jsonify({'response': response.text})
    except Exception as e:
        print("AI Error:", str(e))
        return jsonify({'error': str(e)}), 500

"""

target = "if __name__ == '__main__':"
if endpoints[:15] not in content:
    content = content.replace(target, endpoints + target)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("PATCHED")
else:
    print("ALREADY PATCHED")
