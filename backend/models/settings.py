VACATION_REJECTION_MESSAGE_KEY = 'vacation_rejection_message'
VACATION_REJECTION_MESSAGE_FIELDS = (
    VACATION_REJECTION_MESSAGE_KEY,
    'rejection_message',
    'vacation_filing_message',
)
DEFAULT_VACATION_ADVANCE_NOTICE_DAYS = 7
DEFAULT_VACATION_REJECTION_MESSAGE = 'Must be filed 7 days before the leave date'


class SettingsModel:
    def __init__(self, db):
        self.collection = db['settings']
        self.leave_types_collection = db['leave_types']

    def _get_by_key(self, key):
        return self.collection.find_one({'key': key})

    def _get_field_from_any_doc(self, fields):
        if isinstance(fields, str):
            fields = (fields,)

        for field in fields:
            doc = self.collection.find_one({field: {'$exists': True}})
            if doc is not None and doc.get(field) is not None:
                return doc.get(field)

        return None

    def _get_vacation_leave_type(self):
        return self.leave_types_collection.find_one({
            '$or': [
                {'name': {'$regex': '^vacation$', '$options': 'i'}},
                {'code': {'$regex': '^vac$', '$options': 'i'}},
            ]
        })

    def get_vacation_advance_notice_days(self):
        leave_type = self._get_vacation_leave_type()
        if leave_type is not None and leave_type.get('advance_notice_days') is not None:
            return int(leave_type['advance_notice_days'])

        return DEFAULT_VACATION_ADVANCE_NOTICE_DAYS

    def get_vacation_rejection_message(self, days=None):
        setting = self._get_by_key(VACATION_REJECTION_MESSAGE_KEY)
        if setting and setting.get('value'):
            return str(setting['value'])

        for key in VACATION_REJECTION_MESSAGE_FIELDS:
            setting = self._get_by_key(key)
            if setting and setting.get('value'):
                return str(setting['value'])

        field_value = self._get_field_from_any_doc(VACATION_REJECTION_MESSAGE_FIELDS)
        if field_value:
            return str(field_value)

        days = days if days is not None else self.get_vacation_advance_notice_days()
        day_label = 'day' if days == 1 else 'days'
        return f'Must be filed {days} {day_label} before the leave date'

    def get_vacation_filing_settings(self):
        days = self.get_vacation_advance_notice_days()
        return {
            'vacation_advance_notice_days': days,
            'vacation_rejection_message': self.get_vacation_rejection_message(days),
        }

    def update_vacation_filing_settings(self, days=None, message=None):
        updates = {}

        if days is not None:
            days = int(days)
            if days < 0:
                raise ValueError('vacation_advance_notice_days must be zero or greater')

            leave_type = self._get_vacation_leave_type()
            if leave_type is None:
                raise ValueError('Vacation leave type not found')

            self.leave_types_collection.update_one(
                {'_id': leave_type['_id']},
                {'$set': {'advance_notice_days': days}},
            )
            updates['vacation_advance_notice_days'] = days

        if message is not None:
            message = str(message).strip()
            if not message:
                raise ValueError('vacation_rejection_message cannot be empty')

            self.collection.update_one(
                {'key': VACATION_REJECTION_MESSAGE_KEY},
                {
                    '$set': {
                        'key': VACATION_REJECTION_MESSAGE_KEY,
                        'value': message,
                    }
                },
                upsert=True,
            )
            updates['vacation_rejection_message'] = message

        return self.get_vacation_filing_settings() if updates else self.get_vacation_filing_settings()
