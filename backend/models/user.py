from bson import ObjectId
from datetime import datetime
from werkzeug.security import generate_password_hash

USER_TYPES = ('EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'COO')

def normalize_user_type(user_type, default='EMPLOYEE'):
    if not user_type:
        return default
    return str(user_type).strip().upper()

def resolve_full_name(user):
    if not user:
        return ''

    full_name = (user.get('full_name') or '').strip()
    if full_name:
        return full_name

    parts = [
        user.get('first_name', ''),
        user.get('middle_name', ''),
        user.get('last_name', '')
    ]
    full_name = ' '.join(part.strip() for part in parts if part and str(part).strip()).strip()
    if full_name:
        return full_name

    return user.get('name', '') or user.get('username', '') or user.get('email', '')

class UserModel:
    def __init__(self, db):
        self.collection = db['users']
    
    def create_user(self, user_data):
        user = {
            "username": user_data.get('username'),
            "email": user_data.get('email'),
            "password": generate_password_hash(user_data.get('password')),
            
            "first_name": user_data.get('first_name', ''),
            "middle_name": user_data.get('middle_name', ''),
            "last_name": user_data.get('last_name', ''),
            "full_name": user_data.get('full_name', ''),
            
            "employee_id": user_data.get('employee_id', ''),
            
            "user_type": normalize_user_type(user_data.get('user_type', 'EMPLOYEE')),
            "role": user_data.get('role', ''),
            
            "department": user_data.get('department', ''),
            "account_client": user_data.get('account_client', ''),
            
            "reports_to": user_data.get('reports_to'),
            "supervisor_id": ObjectId(user_data['supervisor_id']) if user_data.get('supervisor_id') else None,
            "manager_id": ObjectId(user_data['manager_id']) if user_data.get('manager_id') else None,
            
            "employment_type": user_data.get('employment_type', 'Fixed'),
            
            "date_hired": user_data.get('date_hired', datetime.utcnow()),
            
            "status": user_data.get('status', 'ACTIVE').upper(),
            
            "leave_balances": user_data.get('leave_balances', {
                "Vacation": 15,
                "Sick": 15,
                "Emergency": 5
            }),
            
            "pto_requests": [],
            
            "profile_picture": user_data.get('profile_picture', ''),
            
            "phone": user_data.get('phone', ''),
            "address": user_data.get('address', ''),
            
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = self.collection.insert_one(user)
        return str(result.inserted_id)
    
    def get_all_users(self, filters=None, page=1, limit=10):
        query = {}
        
        if filters:
            if filters.get('user_types'):
                types = [
                    normalize_user_type(user_type.strip())
                    for user_type in filters['user_types'].split(',')
                    if user_type.strip()
                ]
                if types:
                    query['user_type'] = {'$in': types}
            elif filters.get('user_type'):
                query['user_type'] = normalize_user_type(filters['user_type'])
            if filters.get('department'):
                query['department'] = filters['department']
            if filters.get('status'):
                query['status'] = filters['status'].upper()
            if filters.get('search'):
                search_term = filters['search']
                query['$or'] = [
                    {'full_name': {'$regex': search_term, '$options': 'i'}},
                    {'email': {'$regex': search_term, '$options': 'i'}},
                    {'employee_id': {'$regex': search_term, '$options': 'i'}}
                ]
            if filters.get('supervisor_id'):
                query['supervisor_id'] = ObjectId(filters['supervisor_id'])
            if filters.get('manager_id'):
                query['manager_id'] = ObjectId(filters['manager_id'])
            if filters.get('unassigned'):
                query['$or'] = [
                    {'supervisor_id': None},
                    {'supervisor_id': {'$exists': False}}
                ]
        
        skip = (page - 1) * limit
        users = list(self.collection.find(query).skip(skip).limit(limit))
        total = self.collection.count_documents(query)
        
        return users, total
    
    def get_user_by_id(self, user_id):
        try:
            return self.collection.find_one({'_id': ObjectId(user_id)})
        except:
            return None
    
    def get_user_by_email(self, email):
        return self.collection.find_one({'email': email})
    
    def get_user_by_username(self, username):
        return self.collection.find_one({'username': username})
    
    def update_user(self, user_id, update_data):
        try:
            update_fields = {}
            
            allowed_fields = [
                'username', 'email', 'first_name', 'middle_name', 'last_name',
                'full_name', 'employee_id', 'user_type', 'role', 'department',
                'account_client', 'reports_to', 'supervisor_id', 'manager_id',
                'employment_type', 'date_hired',
                'status', 'leave_balances', 'profile_picture', 'phone', 'address'
            ]
            
            object_id_fields = ['reports_to', 'supervisor_id', 'manager_id']
            
            for field in allowed_fields:
                if field in update_data:
                    if field in ['user_type', 'status']:
                        update_fields[field] = normalize_user_type(update_data[field]) if field == 'user_type' else update_data[field].upper()
                    elif field in object_id_fields:
                        update_fields[field] = ObjectId(update_data[field]) if update_data[field] else None
                    else:
                        update_fields[field] = update_data[field]
            
            if 'password' in update_data and update_data['password']:
                update_fields['password'] = generate_password_hash(update_data['password'])
            
            update_fields['updated_at'] = datetime.utcnow()
            
            result = self.collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': update_fields}
            )
            
            return result.modified_count > 0
        except:
            return False
    
    def delete_user(self, user_id):
        try:
            result = self.collection.delete_one({'_id': ObjectId(user_id)})
            return result.deleted_count > 0
        except:
            return False
    
    def add_pto_request(self, user_id, request_id):
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$push': {'pto_requests': ObjectId(request_id)},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except:
            return False
    
    def remove_pto_request(self, user_id, request_id):
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$pull': {'pto_requests': ObjectId(request_id)},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except:
            return False
    
    def update_leave_balance(self, user_id, leave_type, days_to_deduct):
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(user_id)},
                {
                    '$inc': {f'leave_balances.{leave_type}': -days_to_deduct},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except:
            return False
    
    def update_last_login(self, user_id):
        try:
            self.collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {'last_login': datetime.utcnow()}}
            )
            return True
        except:
            return False
    
    def serialize_user(self, user):
        if not user:
            return None
        
        return {
            'id': str(user['_id']),
            'username': user.get('username', ''),
            'email': user.get('email', ''),
            'first_name': user.get('first_name', ''),
            'middle_name': user.get('middle_name', ''),
            'last_name': user.get('last_name', ''),
            'full_name': resolve_full_name(user),
            'employee_id': user.get('employee_id', ''),
            'user_type': normalize_user_type(user.get('user_type', 'EMPLOYEE')),
            'role': user.get('role', ''),
            'department': user.get('department', ''),
            'account_client': user.get('account_client', ''),
            'reports_to': str(user['reports_to']) if user.get('reports_to') else None,
            'supervisor_id': str(user['supervisor_id']) if user.get('supervisor_id') else None,
            'manager_id': str(user['manager_id']) if user.get('manager_id') else None,
            'employment_type': user.get('employment_type', ''),
            'date_hired': user.get('date_hired').isoformat() if user.get('date_hired') else None,
            'status': user.get('status', 'ACTIVE'),
            'leave_balances': user.get('leave_balances', {}),
            'pto_requests': [str(req_id) for req_id in user.get('pto_requests', [])],
            'profile_picture': user.get('profile_picture', ''),
            'phone': user.get('phone', ''),
            'address': user.get('address', ''),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
            'updated_at': user.get('updated_at').isoformat() if user.get('updated_at') else None,
            'last_login': user.get('last_login').isoformat() if user.get('last_login') else None
        }
