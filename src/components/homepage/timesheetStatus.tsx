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
  // Helper function to get default day status
  const getDefaultDayStatus = (date: Date): string => {
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? "not-working" : "working";
  };

  return (
    <tr className={styles.statusRow}>
      <td colSpan={3} className={styles.statusLabel}>Status</td>
      {weekDates.map((date) => {
        const dayStr = date.toISOString().split("T")[0];
        const currentStatus = dayStatus[dayStr] || getDefaultDayStatus(date);

        return (
          <td key={dayStr} className={styles.statusCell}>
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
      <td className={styles.statusSpacerTotal}></td>
      <td className={styles.statusSpacerAction}></td>
    </tr>
  );
};

export default StatusRow;