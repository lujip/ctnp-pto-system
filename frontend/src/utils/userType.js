export const USER_TYPES = {
  EMPLOYEE: 'EMPLOYEE',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  COO: 'COO'
};

export const normalizeUserType = (userType, defaultType = USER_TYPES.EMPLOYEE) => {
  if (!userType) return defaultType;
  return String(userType).trim().toUpperCase();
};

export const getSidebarKey = (userType) => {
  const normalized = normalizeUserType(userType);

  if (normalized === USER_TYPES.ADMIN) {
    return 'admin';
  }

  if (normalized === USER_TYPES.COO) {
    return 'coo';
  }

  if (normalized === USER_TYPES.SUPERVISOR) {
    return 'supervisor';
  }

  if (normalized === USER_TYPES.MANAGER) {
    return 'manager';
  }

  return 'employee';
};
