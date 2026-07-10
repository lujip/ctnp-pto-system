from flask import Blueprint, request, jsonify, current_app
from models.auth import AuthModel, token_required
from models import get_db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        auth_model = AuthModel(get_db())
        user = auth_model.find_user_by_email(email)
        
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if not auth_model.verify_password(user['password'], password):
            return jsonify({'message': 'Invalid credentials'}), 401
        
        token = auth_model.generate_token(user, current_app.config['SECRET_KEY'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': auth_model.serialize_user(user)
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    auth_model = AuthModel(get_db())
    return jsonify({
        'valid': True,
        'user': auth_model.serialize_user(current_user)
    }), 200
