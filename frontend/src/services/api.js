import { API_BASE_URL } from '../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  verifyToken: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return response.json();
  }
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

const getAuthHeadersOnly = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const attachmentsAPI = {
  upload: async (file, { entityType, entityId, description } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (entityType) formData.append('entity_type', entityType);
    if (entityId) formData.append('entity_id', entityId);
    if (description) formData.append('description', description);

    const response = await fetch(`${API_BASE_URL}/attachments/`, {
      method: 'POST',
      headers: getAuthHeadersOnly(),
      body: formData,
    });

    return { response, data: await response.json() };
  },

  list: async ({ entityType, entityId, page = 1, limit = 100 } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (entityType) params.set('entity_type', entityType);
    if (entityId) params.set('entity_id', entityId);

    const response = await fetch(`${API_BASE_URL}/attachments/?${params}`, {
      headers: getAuthHeadersOnly(),
    });

    return { response, data: await response.json() };
  },

  delete: async (attachmentId) => {
    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getAuthHeadersOnly(),
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  },

  deleteByEntity: async (entityType, entityId) => {
    const { response, data } = await attachmentsAPI.list({ entityType, entityId });

    if (!response.ok) {
      return { success: false, data };
    }

    const attachments = data.attachments || [];
    await Promise.all(attachments.map((attachment) => attachmentsAPI.delete(attachment.id)));

    return { success: true };
  },

  download: async (attachmentId) => {
    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
      headers: getAuthHeadersOnly(),
    });

    return response;
  },

  fetchBlob: async (attachmentId) => {
    const response = await attachmentsAPI.download(attachmentId);

    if (!response.ok) {
      throw new Error('Failed to load attachment');
    }

    return response.blob();
  },

  triggerDownload: async (attachment) => {
    const response = await attachmentsAPI.download(attachment.id);

    if (!response.ok) {
      throw new Error('Failed to download attachment');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.original_filename || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
