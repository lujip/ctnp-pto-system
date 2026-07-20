import { useState } from 'react';
import { API_BASE_URL } from '../config/api';

export function usePtoRequestActions({ onSuccess, roleLabel = 'Approver' }) {
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveComments, setApproveComments] = useState('');
  const [approveError, setApproveError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [rejectError, setRejectError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const submitStatusUpdate = async (requestId, action, comments = '') => {
    try {
      setActionId(requestId);
      setActionType(action);

      const response = await fetch(`${API_BASE_URL}/pto/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comments }),
      });

      const data = await response.json();

      if (response.ok) {
        await onSuccess?.(data.request);
        return true;
      }

      const message = data.message || `Failed to ${action.toLowerCase()} request`;
      if (action === 'REJECT') {
        setRejectError(message);
      } else {
        setApproveError(message);
      }
      return false;
    } catch (err) {
      const message = `Unable to ${action.toLowerCase()} request. Please try again.`;
      if (action === 'REJECT') {
        setRejectError(message);
      } else {
        setApproveError(message);
      }
      console.error(`Error ${action.toLowerCase()}ing request:`, err);
      return false;
    } finally {
      setActionId(null);
      setActionType('');
    }
  };

  const handleOpenApproveModal = (request) => {
    setApproveTarget(request);
    setApproveComments('');
    setApproveError('');
    setShowApproveModal(true);
  };

  const handleCloseApproveModal = () => {
    if (actionId) return;
    setShowApproveModal(false);
    setApproveTarget(null);
    setApproveComments('');
    setApproveError('');
  };

  const handleApproveSubmit = async (event) => {
    event.preventDefault();
    if (!approveTarget) return;

    setApproveError('');
    const success = await submitStatusUpdate(
      approveTarget.id,
      'APPROVE',
      approveComments.trim()
    );

    if (success) {
      setShowApproveModal(false);
      setApproveTarget(null);
      setApproveComments('');
      setApproveError('');
    }
  };

  const handleOpenRejectModal = (request) => {
    setRejectTarget(request);
    setRejectComments('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    if (actionId) return;
    setShowRejectModal(false);
    setRejectTarget(null);
    setRejectComments('');
    setRejectError('');
  };

  const handleRejectSubmit = async (event) => {
    event.preventDefault();
    if (!rejectTarget) return;

    setRejectError('');
    const success = await submitStatusUpdate(
      rejectTarget.id,
      'REJECT',
      rejectComments.trim()
    );

    if (success) {
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectComments('');
      setRejectError('');
    }
  };

  const isActionLoading = (requestId, action) =>
    actionId === requestId && actionType === action;

  return {
    roleLabel,
    actionId,
    showApproveModal,
    approveTarget,
    approveComments,
    setApproveComments,
    approveError,
    showRejectModal,
    rejectTarget,
    rejectComments,
    setRejectComments,
    rejectError,
    handleOpenApproveModal,
    handleCloseApproveModal,
    handleApproveSubmit,
    handleOpenRejectModal,
    handleCloseRejectModal,
    handleRejectSubmit,
    isActionLoading,
  };
}
