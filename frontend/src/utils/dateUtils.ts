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

// Format time (HH:MM:SS AM/PM)
export const formatTime = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// Format date (e.g., "Jan 1, 2024" or "2024년 1월 1일")
export const formatDate = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format date (e.g., "Jan 1" or "1월 1일")
export const formatDateShort = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
};

// Format month and day (e.g., "Jan 1")
export const formatMonthDay = (date: Date, locale: string = 'en-US'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  });
};

// Format week range (e.g., "Jan 1 - Jan 7" or "Dec 30 - Jan 5, 2024")
export const formatWeekRange = (start: Date, end: Date, locale: string = 'en-US'): string => {
  if (start.getMonth() === end.getMonth()) {
    const monthStr = start.toLocaleDateString(locale, { month: 'short' });
    return `${monthStr} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${formatMonthDay(start, locale)} - ${formatMonthDay(end, locale)}`;
};

// Format due date with optional time
export const formatDueDate = (dateStr: string, timeStr?: string, locale: string = 'en-US'): string => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let dateText = '';
  if (diffDays === 0) dateText = locale === 'ko' ? '오늘' : 'Today';
  else if (diffDays === 1) dateText = locale === 'ko' ? '내일' : 'Tomorrow';
  else if (diffDays === -1) dateText = locale === 'ko' ? '어제' : 'Yesterday';
  else dateText = date.toLocaleDateString(locale);

  return timeStr ? `${dateText} ${timeStr}` : dateText;
};