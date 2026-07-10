from flask import Blueprint

def register_blueprints(app):
    from .auth import auth_bp
    from .users import users_bp
    from .pto import pto_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(pto_bp, url_prefix='/api/pto')
