// Helper function to extract date from Canvas API timestamp
export const extractDateFromCanvasTimestamp = (
  timestampString: string,
  clientTimezone?: string,
  clientOffset?: number
): string => {
  console.log(`\n=== Canvas Date Parsing ===`);
  console.log(`Original timestamp: ${timestampString}`);

  // Method 1: Remove Z and parse as local time
  const withoutZ = timestampString.replace(/Z$/, "");
  const localDate = new Date(withoutZ);
  const method1 = `${localDate.getFullYear()}-${String(
    localDate.getMonth() + 1
  ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

  // Method 2: Parse as UTC and extract components directly
  const utcDate = new Date(timestampString);
  const method2 = `${utcDate.getFullYear()}-${String(
    utcDate.getMonth() + 1
  ).padStart(2, "0")}-${String(utcDate.getDate()).padStart(2, "0")}`;

  // Method 3: Parse as UTC and convert to Eastern Time
  const easternDate = new Date(
    utcDate.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const method3 = `${easternDate.getFullYear()}-${String(
    easternDate.getMonth() + 1
  ).padStart(2, "0")}-${String(easternDate.getDate()).padStart(2, "0")}`;

  console.log(`Method 1 (no Z, local): ${method1}`);
  console.log(`Method 2 (UTC components): ${method2}`);
  console.log(`Method 3 (UTC->Eastern): ${method3}`);

  // For now, let's try Method 3 (proper timezone conversion)
  console.log(`Using Method 3: ${method3}`);
  console.log(`=========================\n`);

  return method3;
};

export const formatTimeFromDate = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getDateRange = (monthsBefore: number, monthsAfter: number) => {
  const today = new Date();

  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - monthsBefore);

  const endDate = new Date(today);
  endDate.setMonth(today.getMonth() + monthsAfter);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};
