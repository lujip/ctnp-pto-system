from flask import Flask
from flask_cors import CORS
from config import Config
from models import init_db
from routes import register_blueprints

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    
    init_db(app.config['MONGO_URI'], app.config['DB_NAME'])
    
    register_blueprints(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG'],
    )
