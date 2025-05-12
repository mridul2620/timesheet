import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import styles from "./homepage.module.css";
import { TimeEntry, User, Project, Subject, DailyHours, ProjectHours, DialogData, Client, DraftTimesheet, Timesheet } from "./timesheetTypes";
import StatusRow from "./timesheetStatus";
import TimesheetRow from "./timesheetRow";

interface WeekendToggleTimesheetProps {
  weekDates: Date[];
  entries: TimeEntry[];
  dayStatus: { [key: string]: string };
  isWeekEditable: boolean;
  filteredClients: Client[];
  filteredProjects: Project[];
  filteredSubjects: Subject[];
  handleClientChange: (entryId: string, value: string) => void;
  handleProjectChange: (entryId: string, value: string) => void;
  handleSubjectChange: (entryId: string, value: string) => void;
  handleInputChange: (entryId: string, day: string, value: string) => void;
  handleStatusChange: (day: string, value: string) => void;
  calculateRowTotal: (entry: TimeEntry) => number;
  calculateDayTotal: (date: Date) => number;
  calculateWeekTotal: () => number;
  deleteRow: (entryId: string) => void;
  saveRow: (entry: TimeEntry) => void;
  addNewRow: () => void;
  isSaving: { [key: string]: boolean };
  isFieldEnabled: (entry: TimeEntry, field: 'subject' | 'project' | 'hours') => boolean;
}

const WeekendToggleTimesheet: React.FC<WeekendToggleTimesheetProps> = ({
  weekDates,
  entries,
  dayStatus,
  isWeekEditable,
  filteredClients,
  filteredProjects,
  filteredSubjects,
  handleClientChange,
  handleProjectChange,
  handleSubjectChange,
  handleInputChange,
  handleStatusChange,
  calculateRowTotal,
  calculateDayTotal,
  calculateWeekTotal,
  deleteRow,
  saveRow,
  addNewRow,
  isSaving,
  isFieldEnabled
}) => {
  const [showWeekend, setShowWeekend] = useState(false);
  const formatDate = (date: Date): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getDefaultDayStatus = (date: Date): string => {
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? "not-working" : "working";
  };

  const visibleDates = useMemo(() => {
    if (showWeekend) {
      return weekDates;
    } else {
      return weekDates.filter(date => {
        const day = date.getDay();
        return day !== 0 && day !== 6;
      });
    }
  }, [weekDates, showWeekend]);

  const toggleWeekend = () => {
    setShowWeekend(prev => !prev);
  };

  return (
    <div className={`${styles.tableWrapper} ${showWeekend ? styles.expandedTable : ''}`}>
      <div className={styles.responsiveTableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.statusHeaderRow}>
              <td colSpan={3} className={styles.statusLabel}>Status</td>
              {visibleDates.map((date) => (
                <td key={date.toISOString()} className={styles.statusCell}>
                  <select
                    value={dayStatus[date.toISOString().split("T")[0]] || getDefaultDayStatus(date)}
                    onChange={(e) => handleStatusChange(date.toISOString().split("T")[0], e.target.value)}
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
              ))}
              <td className={styles.weekendButtonContainer}>
                <button 
                  onClick={toggleWeekend} 
                  className={styles.weekendToggleButton}
                  title={showWeekend ? "Hide weekend" : "Show weekend"}
                >
                  {showWeekend ? <Minus size={16} className={styles.buttonIcon}  /> : <Plus size={16} className={styles.buttonIcon} />}
                  {showWeekend ? "Weekend" : "Weekend"}
                </button>
              </td>
              <td></td>
            </tr>
            <tr>
              <th className={styles.clientColumn}>Client</th>
              <th className={styles.subjectColumn}>Subject</th>
              <th className={styles.projectColumn}>Projects</th>
              {visibleDates.map((date) => (
                <th key={date.toISOString()} className={styles.weekColumn}>
                  {formatDate(date)}
                </th>
              ))}
              <th className={styles.totalColumn}>Total</th>
              <th className={styles.actionColumn}>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <TimesheetRow
                key={entry.id}
                entry={entry}
                weekDates={visibleDates}
                isWeekEditable={isWeekEditable}
                filteredClients={filteredClients}
                filteredProjects={filteredProjects}
                filteredSubjects={filteredSubjects}
                handleClientChange={handleClientChange}
                handleProjectChange={handleProjectChange}
                handleSubjectChange={handleSubjectChange}
                handleInputChange={handleInputChange}
                calculateRowTotal={calculateRowTotal}
                deleteRow={deleteRow}
                saveRow={saveRow}
                isSaving={isSaving}
                isFieldEnabled={isFieldEnabled}
              />
            ))}

            <tr className={styles.totalRow}>
              <td>
                <button onClick={addNewRow} className={styles.button} disabled={!isWeekEditable}>
                  <Plus className={styles.buttonIcon} />
                  Project
                </button>
              </td>
              <td></td>
              <td>Total</td>
              {visibleDates.map((date) => (
                <td key={date.toISOString()} className={styles.totalCell}>
                  {calculateDayTotal(date).toFixed(2)}
                </td>
              ))}
              <td className={styles.totalCell}>{calculateWeekTotal().toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeekendToggleTimesheet;