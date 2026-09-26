'use client';

import { useState, useEffect } from 'react';

export interface OperatingStatus {
  isOpen: boolean;
  label: 'Open' | 'Closed';
  hoursText?: string;
}

export interface OperatingHoursInput {
  openingTime?: string;
  closingTime?: string;
  operatingHours?: string;
  closedDays?: string;
}

/**
 * Parses "HH:mm" string into total minutes from start of day (0 to 1439).
 */
export function timeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Checks whether a given calendar date falls on a closed day or seasonal closure period.
 */
export function isDayClosed(closedDays?: string, date: Date = new Date()): boolean {
  if (!closedDays) return false;
  const cd = closedDays.trim().toLowerCase();
  if (!cd || cd === 'none' || cd === 'null' || cd === 'n/a') return false;

  // Seasonal closures (e.g. monsoon closures in Maharashtra)
  if (cd.includes('june-sept') || cd.includes('june-september')) {
    const month = date.getMonth(); // 5 = June, 8 = September
    if (month >= 5 && month <= 8) return true;
  }

  // Day range: Monday-Saturday / Mon-Sat
  if (cd.includes('monday-saturday') || cd.includes('mon-sat')) {
    const day = date.getDay(); // 0 is Sunday, 1..6 is Mon..Sat
    if (day >= 1 && day <= 6) return true;
  }

  // Specific full day names
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[date.getDay()];
  if (cd.includes(todayName)) return true;

  // Short day names (sun, mon, tue, wed, thu, fri, sat)
  const shortNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const shortName = shortNames[date.getDay()];
  const regex = new RegExp(`\\b${shortName}\\b`, 'i');
  if (regex.test(cd)) return true;

  return false;
}

/**
 * Computes whether an experience is currently Open or Closed based on user device time.
 */
export function getOperatingStatus(
  input: OperatingHoursInput,
  userDate?: Date
): OperatingStatus {
  const now = userDate ? new Date(userDate) : new Date();
  let { openingTime, closingTime, operatingHours, closedDays } = input;

  // Fallback: extract opening and closing times from operatingHours (e.g. "18:00 - 01:00")
  if ((!openingTime || !closingTime) && operatingHours) {
    const match = operatingHours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
      openingTime = openingTime || match[1];
      closingTime = closingTime || match[2];
    }
  }

  const hoursText =
    operatingHours || (openingTime && closingTime ? `${openingTime} - ${closingTime}` : undefined);

  const opLower = (operatingHours || '').toLowerCase();
  const is24Hours =
    opLower.includes('24 hour') ||
    opLower.includes('24/7') ||
    (openingTime === '00:00' &&
      (closingTime === '23:59' || closingTime === '23:55' || closingTime === '00:00'));

  if (is24Hours) {
    const closed = isDayClosed(closedDays, now);
    return {
      isOpen: !closed,
      label: !closed ? 'Open' : 'Closed',
      hoursText: hoursText || 'Open 24 hours',
    };
  }

  // If no opening/closing time is provided, default to Open
  if (!openingTime && !closingTime) {
    return { isOpen: true, label: 'Open', hoursText };
  }

  const openM = timeStringToMinutes(openingTime);
  const closeM = timeStringToMinutes(closingTime);

  if (openM === null || closeM === null) {
    return { isOpen: true, label: 'Open', hoursText };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Case 1: Standard daytime schedule (e.g. 10:00 -> 22:00)
  if (closeM > openM) {
    const closedToday = isDayClosed(closedDays, now);
    const isOpen = !closedToday && currentMinutes >= openM && currentMinutes < closeM;
    return {
      isOpen,
      label: isOpen ? 'Open' : 'Closed',
      hoursText,
    };
  }

  // Case 2: Midnight close (e.g. 15:00 -> 00:00)
  // In a standard 24h clock, "00:00" closing time denotes midnight end-of-day (24:00 / 1440 mins)
  if (closeM === 0 && openM > 0) {
    const closedToday = isDayClosed(closedDays, now);
    const isOpen = !closedToday && currentMinutes >= openM && currentMinutes < 1440;
    return {
      isOpen,
      label: isOpen ? 'Open' : 'Closed',
      hoursText,
    };
  }

  // Case 3: Overnight schedule spanning past midnight (e.g. 18:00 -> 01:00)
  if (closeM < openM && closeM > 0) {
    // Current night window (from openingTime up to 23:59)
    if (currentMinutes >= openM) {
      const closedToday = isDayClosed(closedDays, now);
      return {
        isOpen: !closedToday,
        label: !closedToday ? 'Open' : 'Closed',
        hoursText,
      };
    }

    // Next morning spillover window (from 00:00 up to closingTime)
    if (currentMinutes < closeM) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const closedYesterday = isDayClosed(closedDays, yesterday);
      return {
        isOpen: !closedYesterday,
        label: !closedYesterday ? 'Open' : 'Closed',
        hoursText,
      };
    }

    return {
      isOpen: false,
      label: 'Closed',
      hoursText,
    };
  }

  return { isOpen: false, label: 'Closed', hoursText };
}

/**
 * React hook to reactively track user's current device clock and operating status,
 * refreshing every minute automatically.
 */
export function useOperatingStatus(input: OperatingHoursInput): OperatingStatus & { isMounted: boolean } {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<OperatingStatus>(() => getOperatingStatus(input));

  useEffect(() => {
    setMounted(true);
    setStatus(getOperatingStatus(input));

    // Update every 60 seconds to match real time accurately
    const interval = setInterval(() => {
      setStatus(getOperatingStatus(input));
    }, 60000);

    return () => clearInterval(interval);
  }, [input.openingTime, input.closingTime, input.operatingHours, input.closedDays]);

  return {
    ...status,
    isMounted: mounted,
  };
}
