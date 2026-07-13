from bson import ObjectId
from datetime import datetime
from models.user import normalize_user_type

class PTOModel:
    def __init__(self, db):
        self.collection = db['pto_requests']
        self.leave_types_collection = db['leave_types']
    
    def create_request(self, request_data):
        user_data = request_data.get('user_data', {})
        user_type = normalize_user_type(user_data.get('user_type', 'EMPLOYEE'))
        employee_id = ObjectId(request_data['employee_id'])
        now = datetime.utcnow()
        
        pto_request = {
            "requester_id": employee_id,
            "employee_id": employee_id,
            "requester_name": user_data.get('full_name', ''),
            "requester_email": user_data.get('email', ''),
            "department": user_data.get('department', ''),
            "employee_number": user_data.get('employee_id', ''),
            
            "leave_type": request_data['leave_type'],
            "start_date": request_data['start_date'],
            "end_date": request_data['end_date'],
            "total_days": request_data['total_days'],
            "leave_dates": request_data.get('leave_dates', []),
            "reason": request_data.get('reason', ''),
            
            "status": "PENDING",
            "approval_status": {
                "supervisor": "PENDING",
                "manager": "PENDING",
                "admin": "PENDING",
                "coo": "PENDING"
            },
            
            "submitted_date": now,
            
            "approved_by_supervisor": None,
            "supervisor_approved_date": None,
            "supervisor_comments": None,
            
            "approved_by_manager": None,
            "manager_approved_date": None,
            "manager_comments": None,
            
            "approved_by_admin": None,
            "admin_approved_date": None,
            "admin_comments": None,
            
            "approved_by_coo": None,
            "coo_approved_date": None,
            "coo_comments": None,
            
            "rejection_reason": None,
            "rejected_by": None,
            "rejected_date": None,
            
            "created_at": now,
            "updated_at": now
        }

        if user_type == 'SUPERVISOR':
            pto_request['approval_status']['supervisor'] = 'APPROVED'
            pto_request['approved_by_supervisor'] = employee_id
            pto_request['supervisor_approved_date'] = now
        elif user_type == 'MANAGER':
            pto_request['approval_status']['supervisor'] = 'APPROVED'
            pto_request['approved_by_supervisor'] = employee_id
            pto_request['supervisor_approved_date'] = now
            pto_request['approval_status']['manager'] = 'APPROVED'
            pto_request['approved_by_manager'] = employee_id
            pto_request['manager_approved_date'] = now
        
        result = self.collection.insert_one(pto_request)
        return str(result.inserted_id)
    
    def get_all_requests(self, filters=None, page=1, limit=10):
        query = {}
        
        if filters:
            if filters.get('employee_id'):
                query['employee_id'] = ObjectId(filters['employee_id'])
            if filters.get('status'):
                query['status'] = filters['status'].upper()
            if filters.get('leave_type'):
                query['leave_type'] = filters['leave_type']
            if filters.get('start_date'):
                query['start_date'] = {'$gte': filters['start_date']}
            if filters.get('end_date'):
                query['end_date'] = {'$lte': filters['end_date']}
        
        skip = (page - 1) * limit
        requests = list(self.collection.find(query).sort('submitted_date', -1).skip(skip).limit(limit))
        total = self.collection.count_documents(query)
        
        return requests, total

    def get_calendar_requests(self, start_date=None, end_date=None):
        query = {'status': {'$in': ['APPROVED', 'PENDING']}}

        if start_date and end_date:
            start = self._parse_calendar_date(start_date)
            end = self._parse_calendar_date(end_date)
            if start and end:
                query['start_date'] = {'$lte': end}
                query['end_date'] = {'$gte': start}

        return list(self.collection.find(query).sort('start_date', 1))

    def _parse_calendar_date(self, value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).replace(tzinfo=None)
    
    def get_request_by_id(self, request_id):
        try:
            return self.collection.find_one({'_id': ObjectId(request_id)})
        except:
            return None
    
    def update_request(self, request_id, update_data):
        try:
            update_fields = {}
            
            allowed_fields = ['leave_type', 'start_date', 'end_date', 'total_days', 'reason']
            
            for field in allowed_fields:
                if field in update_data:
                    update_fields[field] = update_data[field]
            
            update_fields['updated_at'] = datetime.utcnow()
            
            result = self.collection.update_one(
                {'_id': ObjectId(request_id)},
                {'$set': update_fields}
            )
            
            return result.modified_count > 0
        except:
            return False
    
    def update_request_status(self, request_id, approver_role, action, approver_id=None, comments=None):
        try:
            update_fields = {'updated_at': datetime.utcnow()}
            
            if action.upper() == 'APPROVE':
                if approver_role.upper() == 'SUPERVISOR':
                    update_fields['approved_by_supervisor'] = ObjectId(approver_id) if approver_id else None
                    update_fields['supervisor_approved_date'] = datetime.utcnow()
                    update_fields['supervisor_comments'] = comments
                    update_fields['approval_status.supervisor'] = 'APPROVED'
                    
                elif approver_role.upper() == 'MANAGER':
                    update_fields['approved_by_manager'] = ObjectId(approver_id) if approver_id else None
                    update_fields['manager_approved_date'] = datetime.utcnow()
                    update_fields['manager_comments'] = comments
                    update_fields['approval_status.manager'] = 'APPROVED'
                    
                elif approver_role.upper() == 'ADMIN':
                    update_fields['approved_by_admin'] = ObjectId(approver_id) if approver_id else None
                    update_fields['admin_approved_date'] = datetime.utcnow()
                    update_fields['admin_comments'] = comments
                    update_fields['approval_status.admin'] = 'APPROVED'
                
                elif approver_role.upper() == 'COO':
                    update_fields['approved_by_coo'] = ObjectId(approver_id) if approver_id else None
                    update_fields['coo_approved_date'] = datetime.utcnow()
                    update_fields['coo_comments'] = comments
                    update_fields['approval_status.coo'] = 'APPROVED'
                
                pto_request = self.collection.find_one({'_id': ObjectId(request_id)})
                approval_status = pto_request.get('approval_status', {})
                supervisor_status = update_fields.get('approval_status.supervisor', approval_status.get('supervisor'))
                manager_status = update_fields.get('approval_status.manager', approval_status.get('manager'))
                admin_status = update_fields.get('approval_status.admin', approval_status.get('admin'))
                coo_status = update_fields.get('approval_status.coo', approval_status.get('coo'))
                
                if (
                    supervisor_status == 'APPROVED'
                    and manager_status == 'APPROVED'
                    and admin_status == 'APPROVED'
                    and coo_status == 'APPROVED'
                ):
                    update_fields['status'] = 'APPROVED'
                else:
                    update_fields['status'] = 'PENDING'
                    
            elif action.upper() == 'REJECT':
                update_fields['status'] = 'REJECTED'
                update_fields['rejected_by'] = ObjectId(approver_id) if approver_id else None
                update_fields['rejected_date'] = datetime.utcnow()
                update_fields['rejection_reason'] = comments
                
                if approver_role.upper() == 'SUPERVISOR':
                    update_fields['approval_status.supervisor'] = 'REJECTED'
                elif approver_role.upper() == 'MANAGER':
                    update_fields['approval_status.manager'] = 'REJECTED'
                elif approver_role.upper() == 'ADMIN':
                    update_fields['approval_status.admin'] = 'REJECTED'
                elif approver_role.upper() == 'COO':
                    update_fields['approval_status.coo'] = 'REJECTED'
            
            result = self.collection.update_one(
                {'_id': ObjectId(request_id)},
                {'$set': update_fields}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating request status: {str(e)}")
            return False
    
    def delete_request(self, request_id):
        try:
            result = self.collection.delete_one({'_id': ObjectId(request_id)})
            return result.deleted_count > 0
        except:
            return False
    
    def get_leave_types(self):
        leave_types = list(self.leave_types_collection.find())
        if not leave_types:
            default_types = [
                {
                    "name": "Vacation",
                    "code": "VAC",
                    "description": "Vacation Leave",
                    "default_days": 15,
                    "requires_approval": True,
                    "advance_notice_days": 7,
                    "status": "ACTIVE"
                },
                {
                    "name": "Sick",
                    "code": "SICK",
                    "description": "Sick Leave",
                    "default_days": 15,
                    "requires_approval": True,
                    "advance_notice_days": 0,
                    "status": "ACTIVE"
                },
                {
                    "name": "Emergency",
                    "code": "EMRG",
                    "description": "Emergency Leave",
                    "default_days": 5,
                    "requires_approval": True,
                    "advance_notice_days": 0,
                    "status": "ACTIVE"
                },
                {
                    "name": "Personal",
                    "code": "PERS",
                    "description": "Personal Leave",
                    "default_days": 5,
                    "requires_approval": True,
                    "advance_notice_days": 3,
                    "status": "ACTIVE"
                }
            ]
            self.leave_types_collection.insert_many(default_types)
            leave_types = list(self.leave_types_collection.find())
        
        return leave_types

    def _format_datetime(self, value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value.isoformat() + 'Z'
        return value
    
    def serialize_request(self, request):
        if not request:
            return None
        
        leave_dates = request.get('leave_dates', [])
        if leave_dates and isinstance(leave_dates[0], datetime):
            leave_dates = [self._format_datetime(d) for d in leave_dates]
        elif leave_dates:
            leave_dates = [
                self._format_datetime(d) if isinstance(d, datetime) else d
                for d in leave_dates
            ]
        
        return {
            'id': str(request['_id']),
            'requester_id': str(request.get('requester_id', request.get('employee_id'))),
            'employee_id': str(request['employee_id']),
            'requester_name': request.get('requester_name', ''),
            'requester_email': request.get('requester_email', ''),
            'department': request.get('department', ''),
            'employee_number': request.get('employee_number', ''),
            
            'leave_type': request.get('leave_type', ''),
            'start_date': self._format_datetime(request.get('start_date')),
            'end_date': self._format_datetime(request.get('end_date')),
            'total_days': request.get('total_days', 0),
            'leave_dates': leave_dates,
            'reason': request.get('reason', ''),
            
            'status': request.get('status', 'PENDING'),
            'approval_status': request.get('approval_status', {
                'supervisor': 'PENDING',
                'manager': 'PENDING',
                'admin': 'PENDING',
                'coo': 'PENDING'
            }),
            
            'submitted_date': request.get('submitted_date').isoformat() if request.get('submitted_date') else None,
            
            'approved_by_supervisor': str(request['approved_by_supervisor']) if request.get('approved_by_supervisor') else None,
            'supervisor_approved_date': request.get('supervisor_approved_date').isoformat() if request.get('supervisor_approved_date') else None,
            'supervisor_comments': request.get('supervisor_comments', ''),
            
            'approved_by_manager': str(request['approved_by_manager']) if request.get('approved_by_manager') else None,
            'manager_approved_date': request.get('manager_approved_date').isoformat() if request.get('manager_approved_date') else None,
            'manager_comments': request.get('manager_comments', ''),
            
            'approved_by_admin': str(request['approved_by_admin']) if request.get('approved_by_admin') else None,
            'admin_approved_date': request.get('admin_approved_date').isoformat() if request.get('admin_approved_date') else None,
            'admin_comments': request.get('admin_comments', ''),
            
            'approved_by_coo': str(request['approved_by_coo']) if request.get('approved_by_coo') else None,
            'coo_approved_date': request.get('coo_approved_date').isoformat() if request.get('coo_approved_date') else None,
            'coo_comments': request.get('coo_comments', ''),
            
            'rejection_reason': request.get('rejection_reason', ''),
            'rejected_by': str(request['rejected_by']) if request.get('rejected_by') else None,
            'rejected_date': request.get('rejected_date').isoformat() if request.get('rejected_date') else None,
            
            'created_at': request.get('created_at').isoformat() if request.get('created_at') else None,
            'updated_at': request.get('updated_at').isoformat() if request.get('updated_at') else None
        }
    
    def serialize_leave_type(self, leave_type):
        if not leave_type:
            return None
        
        return {
            'id': str(leave_type['_id']),
            'name': leave_type.get('name', ''),
            'code': leave_type.get('code', ''),
            'description': leave_type.get('description', ''),
            'default_days': leave_type.get('default_days', 0),
            'requires_approval': leave_type.get('requires_approval', True),
            'advance_notice_days': leave_type.get('advance_notice_days', 0),
            'status': leave_type.get('status', 'ACTIVE')
        }
