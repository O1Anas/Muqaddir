const DateTime = luxon.DateTime;

const timeToMinutes = (timeStr) => {
  const timePart = timeStr.split(" ")[0];
  const [hours, minutes] = timePart.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToHHMM = (minutes) => {
  return DateTime.fromObject({ hour: 0 })
    .plus({ minutes })
    .toFormat('HH:mm');
};

const formatGregorianDate = (dateData) => {
  if (!dateData) return "Unknown Date";
  if (dateData.readable) return dateData.readable;

  try {
    return DateTime.fromObject({
      day: parseInt(dateData.day),
      month: parseInt(dateData.month?.number || new Date().getMonth() + 1),
      year: parseInt(dateData.year || new Date().getFullYear())
    }).toFormat('dd LLLL yyyy');
  } catch (e) {
    return `${dateData.day} ${dateData.month?.en || "Unknown"} ${dateData.year || "Unknown"}`;
  }
};

const formatHijriDate = (dateData) => {
  if (!dateData) return "Unknown Date";
  if (dateData.readable) return dateData.readable;

  try {
    return `${dateData.day} ${dateData.month.en} ${dateData.year} AH`;
  } catch (e) {
    return `${dateData.day} ${dateData.month?.en || "Unknown"} ${dateData.year || "Unknown"} AH`;
  }
};

const isRamadan = (hijriMonth) => hijriMonth === 9;

// Convert full Hijri month name to abbreviated format
const getAbbreviatedHijriMonth = (monthName, monthNumber) => {
  // If we have the month number, use it directly
  if (monthNumber && !isNaN(parseInt(monthNumber))) {
    const num = parseInt(monthNumber);
    switch (num) {
      case 1: return "Muh";
      case 2: return "Saf";
      case 3: return "Ra١";
      case 4: return "Ra٢";
      case 5: return "Ju١";
      case 6: return "Ju٢";
      case 7: return "Raj";
      case 8: return "Shb";
      case 9: return "Ram";
      case 10: return "Shw";
      case 11: return "Duq";
      case 12: return "Duh";
      default: return "";
    }
  }

  // If we only have the month name, try to match it
  if (monthName) {
    const lowerName = monthName.toLowerCase();
    if (lowerName.includes("muharram")) return "Muh";
    if (lowerName.includes("safar")) return "Saf";
    if (lowerName.includes("rabi al-awwal") || lowerName.includes("rabi' al-awwal") ||
        lowerName.includes("rabie al awwal") || lowerName.includes("rabi ul awwal")) return "Ra١";
    if (lowerName.includes("rabi al-thani") || lowerName.includes("rabi' al-thani") ||
        lowerName.includes("rabie al-thani") || lowerName.includes("rabi ul thani")) return "Ra٢";
    if (lowerName.includes("jumada al-ula") || lowerName.includes("jumada al-awwal") ||
        lowerName.includes("jumada ul-ula")) return "Ju١";
    if (lowerName.includes("jumada al-akhirah") || lowerName.includes("jumada al-thani") ||
        lowerName.includes("jumada ath-thaniyah")) return "Ju٢";
    if (lowerName.includes("rajab")) return "Raj";
    if (lowerName.includes("sha'ban") || lowerName.includes("shaban") ||
        lowerName.includes("shaaban")) return "Shb";
    if (lowerName.includes("ramadan")) return "Ram";
    if (lowerName.includes("shawwal")) return "Shw";
    if (lowerName.includes("dhu al-qa'dah") || lowerName.includes("dhul qadah") ||
        lowerName.includes("dhu'l-qa'dah") || lowerName.includes("dhul-qadah")) return "Duq";
    if (lowerName.includes("dhu al-hijjah") || lowerName.includes("dhul hijjah") ||
        lowerName.includes("dhu'l-hijjah") || lowerName.includes("dhul-hijjah")) return "Duh";
  }

  // If we couldn't match, return the original name or empty string
  return monthName || "";
};

// Format Hijri date with ordinal suffix for the day
const formatHijriDateWithOrdinal = (day, monthName, monthNumber) => {
  if (!day) return "";

  // Convert day to number if it's a string
  const dayNum = parseInt(day, 10);
  if (isNaN(dayNum)) return "";

  // Function to add ordinal suffix
  const ordinal = (num) => {
    const b = num % 10;
    return num + (~~((num % 100) / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th");
  };

  // Get abbreviated month name
  const abbrevMonth = getAbbreviatedHijriMonth(monthName, monthNumber);

  return `${abbrevMonth} ${ordinal(dayNum)}`;
};

const formatDateWithOrdinal = (dateStr) => {
  // Define possible formats
  const formats = ["dd-MM-yyyy", "dd MMM yyyy", "d MMM yyyy", "dd MMMM yyyy"];

  // Try parsing the date using different formats
  let dt = null;
  for (const format of formats) {
    dt = DateTime.fromFormat(dateStr, format);
    if (dt.isValid) break;
  }

  if (!dt.isValid) return "Invalid Date"; // Fallback for unexpected formats

  // Function to add ordinal suffix
  const ordinal = (num) => {
    const b = num % 10;
    return num + (~~((num % 100) / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th");
  };

  return `${dt.toFormat("MMM")} ${ordinal(dt.day)}`; // Outputs: "Jan 1st", "Dec 25th"
};

// Timezone handling functions for prayer times

/**
 * Parse timezone information from prayer time string
 * @param {string} timeString - Prayer time string (e.g., "05:47 (EEST)" or "06:58 (+07)")
 * @returns {Object} - Object containing time and timezone info
 */
const parseTimeString = (timeString) => {
  if (!timeString) return { time: null, timezone: null };

  const parts = timeString.split(' ');
  const time = parts[0]; // HH:MM format

  let timezone = null;
  if (parts.length > 1) {
    timezone = parts[1];
    // Remove parentheses if present
    if (timezone.startsWith('(') && timezone.endsWith(')')) {
      timezone = timezone.substring(1, timezone.length - 1);
    }
  }

  return { time, timezone };
};

/**
 * Normalize prayer time to ensure smooth transitions across timezone changes
 * @param {string} timeStr - Time string in HH:MM format
 * @param {string} tzInfo - Timezone information (e.g., "EEST", "+07", "-02")
 * @param {string} dateStr - Date string in DD-MM-YYYY format
 * @param {string} metaTimezone - IANA timezone from API metadata (e.g., "Asia/Krasnoyarsk")
 * @returns {number} - Normalized time value for consistent plotting
 */
const normalizeTime = (timeStr, tzInfo, dateStr, metaTimezone) => {
  try {
    // Parse date and time components
    const [day, month, year] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create reference date (Jan 1 of the year) in the same timezone
    const referenceDate = createDateTimeWithTimezone(1, 1, year, 0, 0, tzInfo, metaTimezone);

    // Create the actual date with the prayer time
    const actualDate = createDateTimeWithTimezone(day, month, year, hours, minutes, tzInfo, metaTimezone);

    if (!referenceDate.isValid || !actualDate.isValid) {
      throw new Error('Invalid DateTime object created');
    }

    // Calculate the time difference in hours from the reference date
    // This normalizes the time across timezone changes
    const diffInHours = (actualDate.diff(referenceDate, 'hours').hours) % 24;

    // Ensure the result is between 0 and 24
    return (diffInHours + 24) % 24;
  } catch (error) {
    console.warn(`Error normalizing time ${timeStr} with timezone ${tzInfo} for date ${dateStr}:`, error);
    // Fallback to simple parsing
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  }
};

/**
 * Create a DateTime object with the specified timezone
 * @param {number} day - Day of month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} tzInfo - Timezone information (e.g., "EEST", "+07", "-02")
 * @param {string} metaTimezone - IANA timezone from API metadata
 * @returns {DateTime} - Luxon DateTime object
 */
const createDateTimeWithTimezone = (day, month, year, hour, minute, tzInfo, metaTimezone) => {
  try {
    // First try with the IANA timezone from metadata (most reliable)
    if (metaTimezone) {
      return DateTime.fromObject({
        year, month, day, hour, minute
      }, { zone: metaTimezone });
    }

    // Handle offset format like +07 or -02
    if (tzInfo && tzInfo.match(/^[+-]\d{2}$/)) {
      const offsetHours = parseInt(tzInfo);
      const offsetSign = offsetHours >= 0 ? '+' : '-';
      const offsetFormatted = `${offsetSign}${Math.abs(offsetHours).toString().padStart(2, '0')}:00`;
      return DateTime.fromObject({
        year, month, day, hour, minute
      }, { zone: `UTC${offsetFormatted}` });
    }

    // Try with the timezone string directly
    if (tzInfo) {
      try {
        return DateTime.fromObject({
          year, month, day, hour, minute
        }, { zone: tzInfo });
      } catch (e) {
        // If that fails, use local timezone
        console.warn(`Could not parse timezone ${tzInfo}, using local timezone`);
      }
    }

    // Fallback to local timezone
    return DateTime.fromObject({
      year, month, day, hour, minute
    });
  } catch (error) {
    console.warn(`Error creating DateTime with timezone:`, error);
    // Final fallback - use local timezone
    return DateTime.fromObject({
      year, month, day, hour, minute
    });
  }
};

// function isValidAddress(address) {
//   if (!address || typeof address !== 'string') {
//     return false;
//   }
//   const sanitized = address.replace(/[^\w\s,.'-]/g, '');
//   return sanitized.length > 3 && sanitized.length <= 200;
// }

// Helper function to validate coordinates
// function isValidCoordinate(lat, lon) {
//   return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
// }
