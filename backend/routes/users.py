from flask import Blueprint, request, jsonify, current_app
from models.user import UserModel, normalize_user_type
from models.auth import token_required
from models import get_db

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
@token_required
def get_users(current_user):
    try:
        user_model = UserModel(get_db())
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        filters = {
            'user_type': request.args.get('user_type'),
            'department': request.args.get('department'),
            'status': request.args.get('status'),
            'search': request.args.get('search'),
            'supervisor_id': request.args.get('supervisor_id'),
            'manager_id': request.args.get('manager_id'),
            'user_types': request.args.get('user_types'),
            'unassigned': request.args.get('unassigned')
        }
        
        filters = {k: v for k, v in filters.items() if v}
        
        users, total = user_model.get_all_users(filters, page, limit)
        
        serialized_users = [user_model.serialize_user(user) for user in users]
        
        for user in serialized_users:
            user.pop('password', None)
        
        return jsonify({
            'users': serialized_users,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@users_bp.route('/<user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    try:
        user_model = UserModel(get_db())
        user = user_model.get_user_by_id(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        serialized_user = user_model.serialize_user(user)
        serialized_user.pop('password', None)
        
        return jsonify({'user': serialized_user}), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@users_bp.route('/', methods=['POST'])
@token_required
def create_user(current_user):
    try:
        if normalize_user_type(current_user.get('user_type')) not in ['ADMIN', 'SUPERVISOR']:
            return jsonify({'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        user_model = UserModel(get_db())
        
        if user_model.get_user_by_email(data['email']):
            return jsonify({'message': 'Email already exists'}), 400
        
        if user_model.get_user_by_username(data['username']):
            return jsonify({'message': 'Username already exists'}), 400
        
        if not data.get('full_name'):
            data['full_name'] = f"{data['first_name']} {data.get('middle_name', '')} {data['last_name']}".strip()
        
        user_id = user_model.create_user(data)
        
        new_user = user_model.get_user_by_id(user_id)
        serialized_user = user_model.serialize_user(new_user)
        serialized_user.pop('password', None)
        
        return jsonify({
            'message': 'User created successfully',
            'user': serialized_user
        }), 201
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@users_bp.route('/<user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    try:
        user_model = UserModel(get_db())
        current_user_type = normalize_user_type(current_user.get('user_type'))

        if current_user_type == 'SUPERVISOR':
            data = request.get_json() or {}
            allowed_keys = {'supervisor_id'}

            if set(data.keys()) - allowed_keys:
                return jsonify({'message': 'Supervisors can only update supervisor assignment'}), 403

            user = user_model.get_user_by_id(user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 404

            if normalize_user_type(user.get('user_type')) != 'EMPLOYEE':
                return jsonify({'message': 'Can only assign employees'}), 403

            new_supervisor_id = data.get('supervisor_id') or ''
            current_supervisor_id = str(user.get('supervisor_id')) if user.get('supervisor_id') else ''
            my_id = str(current_user['_id'])

            if new_supervisor_id == my_id:
                if current_supervisor_id and current_supervisor_id != my_id:
                    return jsonify({'message': 'Employee is already assigned to another supervisor'}), 403
            elif new_supervisor_id == '':
                if current_supervisor_id != my_id:
                    return jsonify({'message': 'You can only remove employees from your own team'}), 403
            else:
                return jsonify({'message': 'You can only assign employees to your own team'}), 403

            data = {'supervisor_id': new_supervisor_id}
        elif current_user_type == 'MANAGER':
            data = request.get_json() or {}
            allowed_keys = {'manager_id'}

            if set(data.keys()) - allowed_keys:
                return jsonify({'message': 'Managers can only update manager assignment'}), 403

            user = user_model.get_user_by_id(user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 404

            if normalize_user_type(user.get('user_type')) not in ['EMPLOYEE', 'SUPERVISOR']:
                return jsonify({'message': 'Can only assign employees and supervisors'}), 403

            new_manager_id = data.get('manager_id') or ''
            current_manager_id = str(user.get('manager_id')) if user.get('manager_id') else ''
            my_id = str(current_user['_id'])

            if new_manager_id == my_id:
                if current_manager_id and current_manager_id != my_id:
                    return jsonify({'message': 'User is already assigned to another manager'}), 403
            elif new_manager_id == '':
                if current_manager_id != my_id:
                    return jsonify({'message': 'You can only remove members from your own department'}), 403
            else:
                return jsonify({'message': 'You can only assign members to your own department'}), 403

            data = {'manager_id': new_manager_id}
        elif current_user_type in ['ADMIN', 'COO']:
            data = request.get_json()
            user = user_model.get_user_by_id(user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 404
        else:
            return jsonify({'message': 'Unauthorized - admin access required'}), 403

        if current_user_type in ['ADMIN', 'COO']:
            if 'email' in data and data['email'] != user['email']:
                existing_user = user_model.get_user_by_email(data['email'])
                if existing_user:
                    return jsonify({'message': 'Email already exists'}), 400

            if 'username' in data and data['username'] != user['username']:
                existing_user = user_model.get_user_by_username(data['username'])
                if existing_user:
                    return jsonify({'message': 'Username already exists'}), 400

            if 'first_name' in data or 'middle_name' in data or 'last_name' in data:
                first = data.get('first_name', user.get('first_name', ''))
                middle = data.get('middle_name', user.get('middle_name', ''))
                last = data.get('last_name', user.get('last_name', ''))
                data['full_name'] = f"{first} {middle} {last}".strip()

        success = user_model.update_user(user_id, data)
        
        if success:
            updated_user = user_model.get_user_by_id(user_id)
            serialized_user = user_model.serialize_user(updated_user)
            serialized_user.pop('password', None)
            
            return jsonify({
                'message': 'User updated successfully',
                'user': serialized_user
            }), 200
        else:
            return jsonify({'message': 'No changes made'}), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@users_bp.route('/<user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    try:
        if normalize_user_type(current_user.get('user_type')) not in ['ADMIN', 'COO']:
            return jsonify({'message': 'Unauthorized - admin access required'}), 403
        
        user_model = UserModel(get_db())
        
        user = user_model.get_user_by_id(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        success = user_model.delete_user(user_id)
        
        if success:
            return jsonify({'message': 'User deleted successfully'}), 200
        else:
            return jsonify({'message': 'Failed to delete user'}), 500
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500
