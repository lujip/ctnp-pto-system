from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from bson import ObjectId

from models.user import resolve_full_name, normalize_user_type

class AuthModel:
    def __init__(self, db):
        self.collection = db['users']
    
    def find_user_by_email(self, email):
        return self.collection.find_one({'email': email})

    def find_user_by_username(self, username):
        return self.collection.find_one({'username': username})
    
    def find_user_by_id(self, user_id):
        return self.collection.find_one({'_id': user_id})
    
    def verify_password(self, stored_password, provided_password):
        return check_password_hash(stored_password, provided_password)
    
    def generate_token(self, user, secret_key):
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, secret_key, algorithm='HS256')
        return token
    
    def decode_token(self, token, secret_key):
        try:
            data = jwt.decode(token, secret_key, algorithms=['HS256'])
            return data, None
        except jwt.ExpiredSignatureError:
            return None, 'Token has expired'
        except jwt.InvalidTokenError:
            return None, 'Invalid token'
    
    def serialize_user(self, user):
        user_type = normalize_user_type(user.get('user_type', 'EMPLOYEE'))
        return {
            'id': str(user['_id']),
            'email': user['email'],
            'name': user.get('name', ''),
            'full_name': resolve_full_name(user),
            'first_name': user.get('first_name', ''),
            'last_name': user.get('last_name', ''),
            'role': user.get('role', ''),
            'user_type': user_type
        }

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import current_app
        from models import get_db
        
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        auth_model = AuthModel(get_db())
        data, error = auth_model.decode_token(token, current_app.config['SECRET_KEY'])
        
        if error:
            return jsonify({'message': error}), 401
        
        try:
            user_id = ObjectId(data['user_id'])
        except:
            return jsonify({'message': 'Invalid user ID in token'}), 401
        
        current_user = auth_model.find_user_by_id(user_id)
        if not current_user:
            return jsonify({'message': 'User not found'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated
