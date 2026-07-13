from flask import Flask
from flask_cors import CORS
from config import Config
from models import init_db
from routes import register_blueprints

CORS_RESOURCE_OPTIONS = {
    'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allow_headers': ['Content-Type', 'Authorization'],
    'expose_headers': ['Content-Type'],
    'max_age': 86400,
}


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    if app.config['CORS_ALLOW_ALL']:
        CORS(
            app,
            resources={r'/api/*': {**CORS_RESOURCE_OPTIONS, 'origins': '*'}},
        )
    else:
        CORS(
            app,
            resources={
                r'/api/*': {
                    **CORS_RESOURCE_OPTIONS,
                    'origins': app.config['CORS_ORIGINS'],
                }
            },
        )
    
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
