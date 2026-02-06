import sys
import os
import site  # <--- Essential for loading your virtualenv

# 1. FORCE SERVER TO LOAD YOUR INSTALLED LIBRARIES
# We explicitly point to the path shown in your terminal output
site.addsitedir('/home/rseivuhw/virtualenv/tts_app/3.11/lib/python3.11/site-packages')

import traceback

# 2. Force unbuffered logs (so you see errors instantly in stderr.log)
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', buffering=1)

# 3. Set the path to your backend folder
current_dir = os.path.dirname(__file__)
backend_dir = os.path.join(current_dir, 'backend')

# Add backend directory to system path so we can import main.py
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# 4. The Application Handler
def application(environ, start_response):
    try:
        # Import your FastAPI app
        from main import app
        from a2wsgi import ASGIMiddleware
        
        # Pass the request to FastAPI
        return ASGIMiddleware(app)(environ, start_response)
        
    except Exception:
        # IF IT CRASHES: Print the full error to the browser and log file
        error_msg = traceback.format_exc()
        
        # Write to log file
        print(f"CRITICAL CRASH:\n{error_msg}", file=sys.stderr)
        
        # Show on screen
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return [f"CRASH REPORT:\n{error_msg}".encode('utf-8')]