// Formatting utilities

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatAddress = (houseNumber: string, streetName: string): string => {
  return `${houseNumber} ${streetName}`;
};

export const formatRiskLevel = (riskLevel: string): string => {
  return riskLevel.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
