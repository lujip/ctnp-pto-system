from flask import Blueprint, jsonify, request
from models.auth import token_required
from models.settings import SettingsModel
from models.user import normalize_user_type
from models import get_db

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/vacation-filing', methods=['GET'])
@token_required
def get_vacation_filing_settings(current_user):
    try:
        settings_model = SettingsModel(get_db())
        return jsonify({'settings': settings_model.get_vacation_filing_settings()}), 200
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500


@settings_bp.route('/vacation-filing', methods=['PATCH'])
@token_required
def update_vacation_filing_settings(current_user):
    try:
        user_type = normalize_user_type(current_user.get('user_type'))
        if user_type != 'ADMIN':
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json() or {}
        settings_model = SettingsModel(get_db())
        settings = settings_model.update_vacation_filing_settings(
            days=data.get('vacation_advance_notice_days'),
            message=data.get('vacation_rejection_message'),
        )

        return jsonify({
            'message': 'Vacation filing settings updated successfully',
            'settings': settings,
        }), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500
