import sys
import os

# Add the project directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI app
from backend.main import app

# Create the WSGI application for Passenger
from a2wsgi import ASGIMiddleware
application = ASGIMiddleware(app)
