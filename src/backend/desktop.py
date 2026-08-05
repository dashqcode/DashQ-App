import threading
import time
import sys
import os
import webview
from server import app

def start_server():
    # Run the Flask app on 0.0.0.0 so other devices on the network can access it
    # We disable the reloader because it doesn't work well inside a compiled executable or thread
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    # Determine the window title
    window_title = "CONCA"

    # Start the Flask server in a background daemon thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait a tiny bit to ensure the server has started accepting connections
    time.sleep(1)

    # Create and start the native webview window
    # We point it to the Flask server
    window = webview.create_window(
        title=window_title,
        url='http://127.0.0.1:5000',
        width=1280,
        height=800,
        min_size=(800, 600),
        text_select=True, # Allow text selection like a browser
    )
    
    # Start the application loop
    webview.start()
