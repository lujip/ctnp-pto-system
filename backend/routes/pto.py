from flask import Blueprint, request, jsonify, current_app
from models.pto import PTOModel
from models.user import UserModel, normalize_user_type
from models.auth import token_required
from models import get_db
from datetime import datetime

pto_bp = Blueprint('pto', __name__)

@pto_bp.route('/leave-types', methods=['GET'])
@token_required
def get_leave_types(current_user):
    try:
        pto_model = PTOModel(get_db())
        leave_types = pto_model.get_leave_types()
        
        serialized_types = [pto_model.serialize_leave_type(lt) for lt in leave_types]
        
        return jsonify({'leave_types': serialized_types}), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests', methods=['GET'])
@token_required
def get_pto_requests(current_user):
    try:
        pto_model = PTOModel(get_db())
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        filters = {}
        
        user_type = normalize_user_type(current_user.get('user_type'))

        if user_type == 'EMPLOYEE':
            filters['employee_id'] = str(current_user['_id'])
        else:
            employee_id = request.args.get('employee_id')
            if employee_id:
                filters['employee_id'] = employee_id
        
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        
        if request.args.get('leave_type'):
            filters['leave_type'] = request.args.get('leave_type')
        
        requests_list, total = pto_model.get_all_requests(filters, page, limit)
        
        serialized_requests = [pto_model.serialize_request(req) for req in requests_list]
        
        return jsonify({
            'requests': serialized_requests,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests/<request_id>', methods=['GET'])
@token_required
def get_pto_request(current_user, request_id):
    try:
        pto_model = PTOModel(get_db())
        pto_request = pto_model.get_request_by_id(request_id)
        
        if not pto_request:
            return jsonify({'message': 'Request not found'}), 404
        
        user_type = normalize_user_type(current_user.get('user_type'))

        if user_type == 'EMPLOYEE' and str(pto_request['employee_id']) != str(current_user['_id']):
            return jsonify({'message': 'Unauthorized'}), 403
        
        serialized_request = pto_model.serialize_request(pto_request)
        
        return jsonify({'request': serialized_request}), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests', methods=['POST'])
@token_required
def create_pto_request(current_user):
    try:
        data = request.get_json()
        
        required_fields = ['leave_type', 'start_date', 'end_date', 'total_days']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        data['employee_id'] = str(current_user['_id'])
        
        data['user_data'] = {
            'full_name': current_user.get('full_name', ''),
            'email': current_user.get('email', ''),
            'department': current_user.get('department', ''),
            'employee_id': current_user.get('employee_id', ''),
            'user_type': current_user.get('user_type', 'EMPLOYEE')
        }
        
        try:
            data['start_date'] = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            data['end_date'] = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            
            if 'leave_dates' in data and data['leave_dates']:
                data['leave_dates'] = [
                    datetime.fromisoformat(date.replace('Z', '+00:00')) 
                    for date in data['leave_dates']
                ]
        except:
            return jsonify({'message': 'Invalid date format'}), 400
        
        pto_model = PTOModel(get_db())
        request_id = pto_model.create_request(data)
        
        user_model = UserModel(get_db())
        user_model.add_pto_request(str(current_user['_id']), request_id)
        
        new_request = pto_model.get_request_by_id(request_id)
        serialized_request = pto_model.serialize_request(new_request)
        
        return jsonify({
            'message': 'PTO request created successfully',
            'request': serialized_request
        }), 201
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests/<request_id>', methods=['PUT'])
@token_required
def update_pto_request(current_user, request_id):
    try:
        pto_model = PTOModel(get_db())
        pto_request = pto_model.get_request_by_id(request_id)
        
        if not pto_request:
            return jsonify({'message': 'Request not found'}), 404
        
        user_type = normalize_user_type(current_user.get('user_type'))

        if user_type == 'EMPLOYEE' and str(pto_request['employee_id']) != str(current_user['_id']):
            return jsonify({'message': 'Unauthorized'}), 403
        
        if pto_request['status'] != 'PENDING':
            return jsonify({'message': 'Cannot update non-pending request'}), 400
        
        data = request.get_json()
        
        if 'start_date' in data:
            try:
                data['start_date'] = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'message': 'Invalid start_date format'}), 400
        
        if 'end_date' in data:
            try:
                data['end_date'] = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'message': 'Invalid end_date format'}), 400
        
        success = pto_model.update_request(request_id, data)
        
        if success:
            updated_request = pto_model.get_request_by_id(request_id)
            serialized_request = pto_model.serialize_request(updated_request)
            
            return jsonify({
                'message': 'PTO request updated successfully',
                'request': serialized_request
            }), 200
        else:
            return jsonify({'message': 'No changes made'}), 200
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests/<request_id>/status', methods=['PATCH'])
@token_required
def update_request_status(current_user, request_id):
    try:
        user_type = normalize_user_type(current_user.get('user_type'))
        
        if user_type not in ['ADMIN', 'SUPERVISOR', 'MANAGER', 'COO']:
            return jsonify({'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        if 'action' not in data:
            return jsonify({'message': 'action is required (APPROVE or REJECT)'}), 400
        
        action = data['action'].upper()
        if action not in ['APPROVE', 'REJECT']:
            return jsonify({'message': 'Invalid action. Use APPROVE or REJECT'}), 400
        
        pto_model = PTOModel(get_db())
        pto_request = pto_model.get_request_by_id(request_id)
        
        if not pto_request:
            return jsonify({'message': 'Request not found'}), 404

        if action == 'APPROVE':
            approval_status = pto_request.get('approval_status', {})
            prior_approvals = {
                'SUPERVISOR': approval_status.get('supervisor') == 'APPROVED',
                'MANAGER': approval_status.get('manager') == 'APPROVED',
                'ADMIN': approval_status.get('admin') == 'APPROVED',
                'COO': approval_status.get('coo') == 'APPROVED'
            }

            if prior_approvals.get(user_type):
                return jsonify({'message': f'Request already approved by {user_type.lower()}'}), 400

            if pto_request.get('status') != 'PENDING':
                return jsonify({'message': 'Cannot approve a non-pending request'}), 400

            if user_type == 'MANAGER' and not prior_approvals['SUPERVISOR']:
                return jsonify({'message': 'Supervisor approval is required before manager approval'}), 400

            if user_type == 'ADMIN' and (not prior_approvals['SUPERVISOR'] or not prior_approvals['MANAGER']):
                return jsonify({'message': 'Supervisor and manager approval are required before admin approval'}), 400

            if user_type == 'COO' and (
                not prior_approvals['SUPERVISOR']
                or not prior_approvals['MANAGER']
                or not prior_approvals['ADMIN']
            ):
                return jsonify({'message': 'Supervisor, manager, and admin approval are required before COO approval'}), 400
        
        previous_status = pto_request.get('status')
        comments = data.get('comments', '')
        
        success = pto_model.update_request_status(
            request_id,
            user_type,
            action,
            str(current_user['_id']),
            comments
        )
        
        if success:
            updated_request = pto_model.get_request_by_id(request_id)
            
            if updated_request.get('status') == 'APPROVED' and previous_status != 'APPROVED':
                user_model = UserModel(get_db())
                user_model.update_leave_balance(
                    str(pto_request['employee_id']),
                    pto_request['leave_type'],
                    pto_request['total_days']
                )
            
            serialized_request = pto_model.serialize_request(updated_request)
            
            return jsonify({
                'message': f'Request {action.lower()}ed by {user_type.lower()} successfully',
                'request': serialized_request
            }), 200
        else:
            return jsonify({'message': 'Failed to update status'}), 500
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

@pto_bp.route('/requests/<request_id>', methods=['DELETE'])
@token_required
def delete_pto_request(current_user, request_id):
    try:
        pto_model = PTOModel(get_db())
        pto_request = pto_model.get_request_by_id(request_id)
        
        if not pto_request:
            return jsonify({'message': 'Request not found'}), 404
        
        user_type = normalize_user_type(current_user.get('user_type'))

        if user_type == 'EMPLOYEE' and str(pto_request['employee_id']) != str(current_user['_id']):
            return jsonify({'message': 'Unauthorized'}), 403
        
        if pto_request['status'] != 'PENDING':
            return jsonify({'message': 'Cannot delete non-pending request'}), 400
        
        success = pto_model.delete_request(request_id)
        
        if success:
            user_model = UserModel(get_db())
            user_model.remove_pto_request(str(pto_request['employee_id']), request_id)
            
            return jsonify({'message': 'Request deleted successfully'}), 200
        else:
            return jsonify({'message': 'Failed to delete request'}), 500
    
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500
