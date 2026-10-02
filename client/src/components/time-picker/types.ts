export type Meridiem = "AM" | "PM";

export interface TimeValue {
  /** Formatted as "hh:mm AM/PM" (e.g. "02:30 PM") or "HH:mm" when meridiem is hidden */
  formatted: string;
  /** 12-hour hour (1-12) when meridiem is shown; otherwise 0-23 */
  hour: number;
  /** Minute (0-59) */
  minute: number;
  /** AM or PM. Always returned, even with 24h mode (derived from hours24) */
  period: Meridiem;
  /** 24-hour hour (0-23) */
  hours24: number;
}

export interface TimePickerProps {
  /** Time as "HH:mm" (24-hour). */
  value?: string;
  /** Called with "HH:mm" (24-hour) when the draft is saved. */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Minute increment between selectable values (default 1). */
  minuteStep?: number;
  /** Accessible label for the trigger (when there is no associated <Label>). */
  ariaLabel?: string;
  "aria-invalid"?: boolean;
}
