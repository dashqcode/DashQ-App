import urllib.request
import json
import time

try:
    print(urllib.request.urlopen('http://127.0.0.1:5000/api/system/tunnel').read().decode())
    
    req = urllib.request.Request('http://127.0.0.1:5000/api/system/tunnel/stop', data=b'', method='POST')
    print('Stop:', urllib.request.urlopen(req).read().decode())
    
    time.sleep(1)
    
    req = urllib.request.Request('http://127.0.0.1:5000/api/system/tunnel/start', data=b'', method='POST')
    print('Start:', urllib.request.urlopen(req).read().decode())
    
    time.sleep(4)
    print(urllib.request.urlopen('http://127.0.0.1:5000/api/system/tunnel').read().decode())
except Exception as e:
    print(e)
