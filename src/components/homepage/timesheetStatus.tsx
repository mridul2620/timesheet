import React from "react";
import styles from "./homepage.module.css";

type StatusRowProps = {
  weekDates: Date[];
  dayStatus: { [key: string]: string };
  isWeekEditable: boolean;
  handleStatusChange: (day: string, value: string) => void;
};

const StatusRow: React.FC<StatusRowProps> = ({
  weekDates,
  dayStatus,
  isWeekEditable,
  handleStatusChange,
}) => {
  return (
    <tr className={styles.statusRow}>
      <td colSpan={3}>Status</td>
      {weekDates.map((date) => {
        const dayStr = date.toISOString().split("T")[0];
        const dayOfWeek = date.getDay();
        const defaultStatus = dayOfWeek === 0 || dayOfWeek === 6 ? "not-working" : "working";
        const currentStatus = dayStatus[dayStr] || defaultStatus;

        return (
          <td key={dayStr}>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(dayStr, e.target.value)}
              className={`${styles.select} ${styles.statusSelect}`}
              disabled={!isWeekEditable}
            >
              <option value="working">Working</option>
              <option value="not-working">Not Working</option>
              <option value="holiday">Holiday</option>
              <option value="sick">Sick</option>
              <option value="bank-holiday">Bank Holiday</option>
            </select>
          </td>
        );
      })}
      <td></td>
    </tr>
  );
};

export default StatusRow;