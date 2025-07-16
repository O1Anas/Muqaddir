// Function to update button icon and revert after a delay
const updateButtonIcon = (button, iconType, revertDelay = 1000, originalIconType = null) => {
    let iconSvg = '';

    // Get the current icon's dimensions if it exists
    const currentIcon = button.querySelector('svg:not(.loading-spinner)');
    
    // Store original dimensions if this is the first change
    if (!button.dataset.originalWidth) {
        button.dataset.originalWidth = currentIcon ? currentIcon.getAttribute('width') || '24' : '24';
        button.dataset.originalHeight = currentIcon ? currentIcon.getAttribute('height') || '24' : '24';
    }
    
    // Use original dimensions for consistency
    const iconWidth = button.dataset.originalWidth;
    const iconHeight = button.dataset.originalHeight;

    // Define SVG icons with template variables for width/height
    const icons = {
        download: (w, h) => `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    `,
        loading: (w, h) => `
      <svg class="loading-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="${w}" height="${h}" style="display: block;" data-icon-type="loading">
        <circle stroke-linecap="round" fill="none" stroke-dasharray="50.26548245743669 50.26548245743669" stroke="currentColor" stroke-width="8" r="32" cy="50" cx="50">
          <animateTransform values="0 50 50;360 50 50" keyTimes="0;1" dur="1s" repeatCount="indefinite" type="rotate" attributeName="transform"></animateTransform>
        </circle>
      </svg>
    `,
        checkmark: (w, h) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-icon-type="checkmark">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
    `,
        equals: (w, h) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-icon-type="equals">
        <line x1="5" y1="9" x2="19" y2="9"></line>
        <line x1="5" y1="15" x2="19" y2="15"></line>
      </svg>
    `,
        gps: (w, h) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-icon-type="gps">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    `,
        calculate: (w, h) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-16 -16 400 400" fill="currentColor"
        stroke="currentColor" stroke-width="14" data-icon-type="calculate">
        <path d="M328 16H40C18 16 0 34 0 56v256c0 22 18 40 40 40h288c22 0 40-18 40-40V56c0-22-18-40-40-40zM352 312c0 13-11 24-24 24H40c-13 0-24-11-24-24V56c0-13 11-24 24-24h288c13 0 24 11 24 24v256z" />
        <path d="M144 112h-32V80a8 8 0 0 0-16 0v32H64a8 8 0 0 0 0 16h32v32a8 8 0 0 0 16 0v-32h32a8 8 0 0 0 0-16z" />
        <path d="M296 112h-80a8 8 0 0 0 0 16h80a8 8 0 0 0 0-16z" />
        <path d="M137.6 214a8 8 0 0 0-11.2 0L104 236.8 81.6 214a8 8 0 0 0-11.2 11.2L93.2 248 70.4 270.8a8 8 0 0 0 11.2 11.2L104 259.2l22.4 22.8a8 8 0 0 0 11.2-11.2L115.2 248l22.8-22.8a8 8 0 0 0-0.4-11.2z" />
        <path d="M296 208h-80a8 8 0 0 0 0 16h80a8 8 0 0 0 0-16z" />
        <path d="M296 256h-80a8 8 0 0 0 0 16h80a8 8 0 0 0 0-16z" />
      </svg>
    `,
        save: (w, h) => `
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd"
          d="M18.1716 1C18.702 1 19.2107 1.21071 19.5858 1.58579L22.4142 4.41421C22.7893 4.78929 23 5.29799 23 5.82843V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H18.1716ZM4 3C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21L5 21L5 15C5 13.3431 6.34315 12 8 12L16 12C17.6569 12 19 13.3431 19 15V21H20C20.5523 21 21 20.5523 21 20V6.82843C21 6.29799 20.7893 5.78929 20.4142 5.41421L18.5858 3.58579C18.2107 3.21071 17.702 3 17.1716 3H17V5C17 6.65685 15.6569 8 14 8H10C8.34315 8 7 6.65685 7 5V3H4ZM17 21V15C17 14.4477 16.5523 14 16 14L8 14C7.44772 14 7 14.4477 7 15L7 21L17 21ZM9 3H15V5C15 5.55228 14.5523 6 14 6H10C9.44772 6 9 5.55228 9 5V3Z"
          fill="currentColor"></path>
      </svg>
    `
    };

    // Get the requested icon with current dimensions
    const getIconSvg = (type) => {
        const iconGenerator = icons[type];
        return typeof iconGenerator === 'function' ? iconGenerator(iconWidth, iconHeight) : '';
    };

    iconSvg = getIconSvg(iconType);

    // Store the original button content if needed for reverting
    const originalContent = button.innerHTML;
    const originalIcon = currentIcon ? currentIcon.outerHTML : '';

    // Update the button content
    if (button.querySelector('span')) {
        // If there's a span (text), preserve it
        const span = button.querySelector('span').outerHTML;
        button.innerHTML = iconSvg + span;
    } else {
        button.innerHTML = iconSvg;
    }

    // Revert after delay if specified and not a loading icon
    if (revertDelay > 0 && iconType !== 'loading' && originalIconType) {
        // Clear any existing timeouts
        if (button._revertTimeout) {
            clearTimeout(button._revertTimeout);
        }
        
        button._revertTimeout = setTimeout(() => {
            // Revert to a specific icon type with original dimensions
            const revertSvg = getIconSvg(originalIconType);
            if (button.querySelector('span')) {
                const span = button.querySelector('span').outerHTML;
                button.innerHTML = revertSvg + span;
            } else {
                button.innerHTML = revertSvg;
            }
            delete button._revertTimeout;
        }, revertDelay);
    }
};

// const DateTime = luxon.DateTime;

// const timeToMinutes = (timeStr) => {
//   const timePart = timeStr.split(" ")[0];
//   const [hours, minutes] = timePart.split(":").map(Number);
//   return hours * 60 + minutes;
// };

// const minutesToHHMM = (minutes) => {
//   return DateTime.fromObject({ hour: 0 })
//     .plus({ minutes })
//     .toFormat('HH:mm');
// };

// const formatGregorianDate = (dateData) => {
//   if (!dateData) return "Unknown Date";
//   if (dateData.readable) return dateData.readable;

//   try {
//     return DateTime.fromObject({
//       day: parseInt(dateData.day),
//       month: parseInt(dateData.month?.number || new Date().getMonth() + 1),
//       year: parseInt(dateData.year || new Date().getFullYear())
//     }).toFormat('dd LLLL yyyy');
//   } catch (e) {
//     return `${dateData.day} ${dateData.month?.en || "Unknown"} ${dateData.year || "Unknown"}`;
//   }
// };

// const formatHijriDate = (dateData) => {
//   if (!dateData) return "Unknown Date";
//   if (dateData.readable) return dateData.readable;

//   try {
//     return `${dateData.day} ${dateData.month.en} ${dateData.year} AH`;
//   } catch (e) {
//     return `${dateData.day} ${dateData.month?.en || "Unknown"} ${dateData.year || "Unknown"} AH`;
//   }
// };

// const isRamadan = (hijriMonth) => hijriMonth === 9;

// Convert full Hijri month name to abbreviated format
// const getAbbreviatedHijriMonth = (monthName, monthNumber) => {
//   // If we have the month number, use it directly
//   if (monthNumber && !isNaN(parseInt(monthNumber))) {
//     const num = parseInt(monthNumber);
//     switch (num) {
//       case 1: return "Muh";
//       case 2: return "Saf";
//       case 3: return "Ra١";
//       case 4: return "Ra٢";
//       case 5: return "Ju١";
//       case 6: return "Ju٢";
//       case 7: return "Raj";
//       case 8: return "Shb";
//       case 9: return "Ram";
//       case 10: return "Shw";
//       case 11: return "Duq";
//       case 12: return "Duh";
//       default: return "";
//     }
//   }

//   // If we only have the month name, try to match it
//   if (monthName) {
//     const lowerName = monthName.toLowerCase();
//     if (lowerName.includes("muharram")) return "Muh";
//     if (lowerName.includes("safar")) return "Saf";
//     if (lowerName.includes("rabi al-awwal") || lowerName.includes("rabi' al-awwal") ||
//         lowerName.includes("rabie al awwal") || lowerName.includes("rabi ul awwal")) return "Ra١";
//     if (lowerName.includes("rabi al-thani") || lowerName.includes("rabi' al-thani") ||
//         lowerName.includes("rabie al-thani") || lowerName.includes("rabi ul thani")) return "Ra٢";
//     if (lowerName.includes("jumada al-ula") || lowerName.includes("jumada al-awwal") ||
//         lowerName.includes("jumada ul-ula")) return "Ju١";
//     if (lowerName.includes("jumada al-akhirah") || lowerName.includes("jumada al-thani") ||
//         lowerName.includes("jumada ath-thaniyah")) return "Ju٢";
//     if (lowerName.includes("rajab")) return "Raj";
//     if (lowerName.includes("sha'ban") || lowerName.includes("shaban") ||
//         lowerName.includes("shaaban")) return "Shb";
//     if (lowerName.includes("ramadan")) return "Ram";
//     if (lowerName.includes("shawwal")) return "Shw";
//     if (lowerName.includes("dhu al-qa'dah") || lowerName.includes("dhul qadah") ||
//         lowerName.includes("dhu'l-qa'dah") || lowerName.includes("dhul-qadah")) return "Duq";
//     if (lowerName.includes("dhu al-hijjah") || lowerName.includes("dhul hijjah") ||
//         lowerName.includes("dhu'l-hijjah") || lowerName.includes("dhul-hijjah")) return "Duh";
//   }

//   // If we couldn't match, return the original name or empty string
//   return monthName || "";
// };

// Format Hijri date with ordinal suffix for the day
// const formatHijriDateWithOrdinal = (day, monthName, monthNumber) => {
//   if (!day) return "";

//   // Convert day to number if it's a string
//   const dayNum = parseInt(day, 10);
//   if (isNaN(dayNum)) return "";

//   // Function to add ordinal suffix
//   const ordinal = (num) => {
//     const b = num % 10;
//     return num + (~~((num % 100) / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th");
//   };

//   // Get abbreviated month name
//   const abbrevMonth = getAbbreviatedHijriMonth(monthName, monthNumber);

//   return `${abbrevMonth} ${ordinal(dayNum)}`;
// };

// const formatDateWithOrdinal = (dateStr) => {
//   // Define possible formats
//   const formats = ["dd-MM-yyyy", "dd MMM yyyy", "d MMM yyyy", "dd MMMM yyyy"];

//   // Try parsing the date using different formats
//   let dt = null;
//   for (const format of formats) {
//     dt = DateTime.fromFormat(dateStr, format);
//     if (dt.isValid) break;
//   }

//   if (!dt.isValid) return "Invalid Date"; // Fallback for unexpected formats

//   // Function to add ordinal suffix
//   const ordinal = (num) => {
//     const b = num % 10;
//     return num + (~~((num % 100) / 10) === 1 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th");
//   };

//   return `${dt.toFormat("MMM")} ${ordinal(dt.day)}`; // Outputs: "Jan 1st", "Dec 25th"
// };

// Timezone handling functions for prayer times

/**
 * Parse timezone information from prayer time string
 * @param {string} timeString - Prayer time string (e.g., "05:47 (EEST)" or "06:58 (+07)")
 * @returns {Object} - Object containing time and timezone info
 */
// const parseTimeString = (timeString) => {
//   if (!timeString) return { time: null, timezone: null };

//   const parts = timeString.split(' ');
//   const time = parts[0]; // HH:MM format

//   let timezone = null;
//   if (parts.length > 1) {
//     timezone = parts[1];
//     // Remove parentheses if present
//     if (timezone.startsWith('(') && timezone.endsWith(')')) {
//       timezone = timezone.substring(1, timezone.length - 1);
//     }
//   }

//   return { time, timezone };
// };

/**
 * Normalize prayer time to ensure smooth transitions across timezone changes
 * @param {string} timeStr - Time string in HH:MM format
 * @param {string} tzInfo - Timezone information (e.g., "EEST", "+07", "-02")
 * @param {string} dateStr - Date string in DD-MM-YYYY format
 * @param {string} metaTimezone - IANA timezone from API metadata (e.g., "Asia/Krasnoyarsk")
 * @returns {number} - Normalized time value for consistent plotting
 */
// const normalizeTime = (timeStr, tzInfo, dateStr, metaTimezone) => {
//   try {
//     // Parse date and time components
//     const [day, month, year] = dateStr.split('-').map(Number);
//     const [hours, minutes] = timeStr.split(':').map(Number);

//     // Create reference date (Jan 1 of the year) in the same timezone
//     const referenceDate = createDateTimeWithTimezone(1, 1, year, 0, 0, tzInfo, metaTimezone);

//     // Create the actual date with the prayer time
//     const actualDate = createDateTimeWithTimezone(day, month, year, hours, minutes, tzInfo, metaTimezone);

//     if (!referenceDate.isValid || !actualDate.isValid) {
//       throw new Error('Invalid DateTime object created');
//     }

//     // Calculate the time difference in hours from the reference date
//     // This normalizes the time across timezone changes
//     const diffInHours = (actualDate.diff(referenceDate, 'hours').hours) % 24;

//     // Ensure the result is between 0 and 24
//     return (diffInHours + 24) % 24;
//   } catch (error) {
//     console.warn(`Error normalizing time ${timeStr} with timezone ${tzInfo} for date ${dateStr}:`, error);
//     // Fallback to simple parsing
//     const [hours, minutes] = timeStr.split(':').map(Number);
//     return hours + minutes / 60;
//   }
// };

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
// const createDateTimeWithTimezone = (day, month, year, hour, minute, tzInfo, metaTimezone) => {
//   try {
//     // First try with the IANA timezone from metadata (most reliable)
//     if (metaTimezone) {
//       return DateTime.fromObject({
//         year, month, day, hour, minute
//       }, { zone: metaTimezone });
//     }

//     // Handle offset format like +07 or -02
//     if (tzInfo && tzInfo.match(/^[+-]\d{2}$/)) {
//       const offsetHours = parseInt(tzInfo);
//       const offsetSign = offsetHours >= 0 ? '+' : '-';
//       const offsetFormatted = `${offsetSign}${Math.abs(offsetHours).toString().padStart(2, '0')}:00`;
//       return DateTime.fromObject({
//         year, month, day, hour, minute
//       }, { zone: `UTC${offsetFormatted}` });
//     }

//     // Try with the timezone string directly
//     if (tzInfo) {
//       try {
//         return DateTime.fromObject({
//           year, month, day, hour, minute
//         }, { zone: tzInfo });
//       } catch (e) {
//         // If that fails, use local timezone
//         console.warn(`Could not parse timezone ${tzInfo}, using local timezone`);
//       }
//     }

//     // Fallback to local timezone
//     return DateTime.fromObject({
//       year, month, day, hour, minute
//     });
//   } catch (error) {
//     console.warn(`Error creating DateTime with timezone:`, error);
//     // Final fallback - use local timezone
//     return DateTime.fromObject({
//       year, month, day, hour, minute
//     });
//   }
// };

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
