export const parseBackendDateTime = (dateString) => {
  if (!dateString) return null;

  const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(dateString);
  const normalized = hasTimezone ? dateString : `${dateString}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatRequestDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatRequestDateTime = (dateString) => {
  const date = parseBackendDateTime(dateString);
  if (!date) return 'N/A';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
};

export const formatRequestDateRange = (startDate, endDate) =>
  `${formatRequestDate(startDate)} - ${formatRequestDate(endDate)}`;

export const getRequestStatusClass = (status) => status?.toLowerCase() || '';
