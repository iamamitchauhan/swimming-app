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
  value?: string;
  defaultValue?: string;

  onChange?: (value: TimeValue) => void;

  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;

  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;

  /** Minute step interval (e.g. 1, 5, 15, 30). Default: 1 */
  minuteStep?: number;

  /** Show AM/PM selector (12-hour mode). When false, uses 24-hour mode. Default: true */
  showMeridiem?: boolean;

  className?: string;
  id?: string;
  name?: string;

  autoFocus?: boolean;

  onFocus?: () => void;
  onBlur?: () => void;
}
