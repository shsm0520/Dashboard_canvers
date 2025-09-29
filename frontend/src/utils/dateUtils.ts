// Utility function to format date in local timezone (YYYY-MM-DD)
// Avoids UTC conversion issues with toISOString()
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse a date string in local timezone
export const parseDateLocal = (dateString: string): Date => {
  // Remove timezone indicators and parse as local time
  const cleanDateString = dateString.replace(/Z$/, '');
  return new Date(cleanDateString);
};