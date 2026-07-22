from flask import Blueprint, current_app, jsonify, request, send_file

from models import get_db
from models.attachment import AttachmentModel
from models.auth import token_required
from models.user import normalize_user_type

attachments_bp = Blueprint('attachments', __name__)


def _get_attachment_model():
    return AttachmentModel(get_db(), current_app.config['UPLOAD_FOLDER'])


def _can_access_attachment(current_user, attachment):
    user_type = normalize_user_type(current_user.get('user_type'))
    if user_type in ['ADMIN', 'COO']:
        return True

    uploaded_by = attachment.get('uploaded_by')
    return uploaded_by and str(uploaded_by) == str(current_user['_id'])


def _parse_form_metadata():
    return {
        'entity_type': request.form.get('entity_type', '').strip(),
        'entity_id': request.form.get('entity_id', '').strip(),
        'description': request.form.get('description', '').strip(),
    }


@attachments_bp.route('/', methods=['GET'])
@token_required
def get_attachments(current_user):
    try:
        attachment_model = _get_attachment_model()

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))

        filters = {
            'uploaded_by': request.args.get('uploaded_by'),
            'entity_type': request.args.get('entity_type'),
            'entity_id': request.args.get('entity_id'),
            'search': request.args.get('search'),
        }
        filters = {key: value for key, value in filters.items() if value}

        user_type = normalize_user_type(current_user.get('user_type'))
        if user_type not in ['ADMIN', 'COO']:
            filters['uploaded_by'] = str(current_user['_id'])

        attachments, total = attachment_model.get_all_attachments(filters, page, limit)
        serialized_attachments = [
            attachment_model.serialize_attachment(attachment)
            for attachment in attachments
        ]

        return jsonify({
            'attachments': serialized_attachments,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit else 0,
            },
        }), 200

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@attachments_bp.route('/<attachment_id>', methods=['GET'])
@token_required
def get_attachment(current_user, attachment_id):
    try:
        attachment_model = _get_attachment_model()
        attachment = attachment_model.get_attachment_by_id(attachment_id)

        if not attachment:
            return jsonify({'message': 'Attachment not found'}), 404

        if not _can_access_attachment(current_user, attachment):
            return jsonify({'message': 'Unauthorized'}), 403

        return jsonify({
            'attachment': attachment_model.serialize_attachment(attachment),
        }), 200

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@attachments_bp.route('/<attachment_id>/download', methods=['GET'])
@token_required
def download_attachment(current_user, attachment_id):
    try:
        attachment_model = _get_attachment_model()
        attachment = attachment_model.get_attachment_by_id(attachment_id)

        if not attachment:
            return jsonify({'message': 'Attachment not found'}), 404

        if not _can_access_attachment(current_user, attachment):
            return jsonify({'message': 'Unauthorized'}), 403

        file_path = attachment_model.get_file_path(attachment)
        if not file_path or not file_path.exists():
            return jsonify({'message': 'Attachment file not found'}), 404

        return send_file(
            file_path,
            mimetype=attachment.get('mime_type') or 'application/octet-stream',
            as_attachment=True,
            download_name=attachment.get('original_filename') or file_path.name,
        )

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@attachments_bp.route('/', methods=['POST'])
@token_required
def create_attachment(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'file is required'}), 400

        file_storage = request.files['file']
        if not file_storage or not file_storage.filename:
            return jsonify({'message': 'file is required'}), 400

        attachment_model = _get_attachment_model()
        attachment_id = attachment_model.create_attachment(
            file_storage,
            _parse_form_metadata(),
            str(current_user['_id']),
        )

        new_attachment = attachment_model.get_attachment_by_id(attachment_id)

        return jsonify({
            'message': 'Attachment uploaded successfully',
            'attachment': attachment_model.serialize_attachment(new_attachment),
        }), 201

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@attachments_bp.route('/<attachment_id>', methods=['PUT'])
@token_required
def update_attachment(current_user, attachment_id):
    try:
        attachment_model = _get_attachment_model()
        attachment = attachment_model.get_attachment_by_id(attachment_id)

        if not attachment:
            return jsonify({'message': 'Attachment not found'}), 404

        if not _can_access_attachment(current_user, attachment):
            return jsonify({'message': 'Unauthorized'}), 403

        update_data = _parse_form_metadata()
        file_storage = request.files.get('file')

        success = attachment_model.update_attachment(
            attachment_id,
            update_data,
            file_storage=file_storage,
        )

        if success:
            updated_attachment = attachment_model.get_attachment_by_id(attachment_id)
            return jsonify({
                'message': 'Attachment updated successfully',
                'attachment': attachment_model.serialize_attachment(updated_attachment),
            }), 200

        return jsonify({'message': 'No changes made'}), 200

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@attachments_bp.route('/<attachment_id>', methods=['DELETE'])
@token_required
def delete_attachment(current_user, attachment_id):
    try:
        attachment_model = _get_attachment_model()
        attachment = attachment_model.get_attachment_by_id(attachment_id)

        if not attachment:
            return jsonify({'message': 'Attachment not found'}), 404

        if not _can_access_attachment(current_user, attachment):
            return jsonify({'message': 'Unauthorized'}), 403

        success = attachment_model.delete_attachment(attachment_id)

        if success:
            return jsonify({'message': 'Attachment deleted successfully'}), 200

        return jsonify({'message': 'Failed to delete attachment'}), 500

    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500
