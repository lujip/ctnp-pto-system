import mimetypes
import uuid
from datetime import datetime
from pathlib import Path

from bson import ObjectId
from werkzeug.utils import secure_filename


class AttachmentModel:
    def __init__(self, db, upload_folder):
        self.collection = db['attachments']
        self.upload_folder = Path(upload_folder)

    def _ensure_upload_folder(self):
        self.upload_folder.mkdir(parents=True, exist_ok=True)

    def _build_stored_filename(self, original_filename):
        safe_name = secure_filename(original_filename) or 'file'
        return f"{uuid.uuid4().hex}_{safe_name}"

    def create_attachment(self, file_storage, attachment_data, uploaded_by):
        self._ensure_upload_folder()

        original_filename = file_storage.filename or 'file'
        stored_filename = self._build_stored_filename(original_filename)
        file_path = self.upload_folder / stored_filename

        file_storage.save(file_path)

        mime_type = (
            file_storage.content_type
            or mimetypes.guess_type(original_filename)[0]
            or 'application/octet-stream'
        )

        attachment = {
            'original_filename': original_filename,
            'stored_filename': stored_filename,
            'mime_type': mime_type,
            'size': file_path.stat().st_size,
            'uploaded_by': ObjectId(uploaded_by),
            'entity_type': attachment_data.get('entity_type', ''),
            'entity_id': (
                ObjectId(attachment_data['entity_id'])
                if attachment_data.get('entity_id')
                else None
            ),
            'description': attachment_data.get('description', ''),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

        result = self.collection.insert_one(attachment)
        return str(result.inserted_id)

    def get_all_attachments(self, filters=None, page=1, limit=10):
        query = {}

        if filters:
            if filters.get('uploaded_by'):
                query['uploaded_by'] = ObjectId(filters['uploaded_by'])
            if filters.get('entity_type'):
                query['entity_type'] = filters['entity_type']
            if filters.get('entity_id'):
                query['entity_id'] = ObjectId(filters['entity_id'])
            if filters.get('search'):
                search_term = filters['search']
                query['$or'] = [
                    {'original_filename': {'$regex': search_term, '$options': 'i'}},
                    {'description': {'$regex': search_term, '$options': 'i'}},
                ]

        skip = (page - 1) * limit
        attachments = list(
            self.collection.find(query).sort('created_at', -1).skip(skip).limit(limit)
        )
        total = self.collection.count_documents(query)

        return attachments, total

    def get_attachment_by_id(self, attachment_id):
        try:
            return self.collection.find_one({'_id': ObjectId(attachment_id)})
        except Exception:
            return None

    def get_file_path(self, attachment):
        if not attachment:
            return None
        return self.upload_folder / attachment['stored_filename']

    def update_attachment(self, attachment_id, update_data, file_storage=None):
        try:
            attachment = self.get_attachment_by_id(attachment_id)
            if not attachment:
                return False

            update_fields = {}
            allowed_fields = ['entity_type', 'entity_id', 'description']

            for field in allowed_fields:
                if field in update_data:
                    if field == 'entity_id':
                        update_fields[field] = (
                            ObjectId(update_data[field]) if update_data[field] else None
                        )
                    else:
                        update_fields[field] = update_data[field]

            if file_storage and file_storage.filename:
                self._ensure_upload_folder()

                old_path = self.get_file_path(attachment)
                if old_path and old_path.exists():
                    old_path.unlink()

                original_filename = file_storage.filename
                stored_filename = self._build_stored_filename(original_filename)
                file_path = self.upload_folder / stored_filename
                file_storage.save(file_path)

                update_fields['original_filename'] = original_filename
                update_fields['stored_filename'] = stored_filename
                update_fields['mime_type'] = (
                    file_storage.content_type
                    or mimetypes.guess_type(original_filename)[0]
                    or 'application/octet-stream'
                )
                update_fields['size'] = file_path.stat().st_size

            if not update_fields:
                return False

            update_fields['updated_at'] = datetime.utcnow()

            result = self.collection.update_one(
                {'_id': ObjectId(attachment_id)},
                {'$set': update_fields},
            )

            return result.modified_count > 0
        except Exception:
            return False

    def delete_attachment(self, attachment_id):
        try:
            attachment = self.get_attachment_by_id(attachment_id)
            if not attachment:
                return False

            file_path = self.get_file_path(attachment)
            if file_path and file_path.exists():
                file_path.unlink()

            result = self.collection.delete_one({'_id': ObjectId(attachment_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    def serialize_attachment(self, attachment):
        if not attachment:
            return None

        return {
            'id': str(attachment['_id']),
            'original_filename': attachment.get('original_filename', ''),
            'mime_type': attachment.get('mime_type', ''),
            'size': attachment.get('size', 0),
            'uploaded_by': (
                str(attachment['uploaded_by']) if attachment.get('uploaded_by') else None
            ),
            'entity_type': attachment.get('entity_type', ''),
            'entity_id': (
                str(attachment['entity_id']) if attachment.get('entity_id') else None
            ),
            'description': attachment.get('description', ''),
            'created_at': (
                attachment.get('created_at').isoformat()
                if attachment.get('created_at')
                else None
            ),
            'updated_at': (
                attachment.get('updated_at').isoformat()
                if attachment.get('updated_at')
                else None
            ),
        }
