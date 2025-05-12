import React from "react";
import { Trash2, Save } from "lucide-react";
import styles from "./homepage.module.css";
import { TimeEntry } from "./timesheetTypes";

type TimesheetRowProps = {
  entry: TimeEntry;
  weekDates: Date[];
  isWeekEditable: boolean;
  filteredClients: any[]; 
  filteredProjects: any[];
  filteredSubjects: any[];
  handleClientChange: (entryId: string, value: string) => void;
  handleProjectChange: (entryId: string, value: string) => void;
  handleSubjectChange: (entryId: string, value: string) => void;
  handleInputChange: (entryId: string, day: string, value: string) => void;
  calculateRowTotal: (entry: TimeEntry) => number;
  deleteRow: (entryId: string) => void;
  saveRow: (entry: TimeEntry) => void;
  isSaving: { [key: string]: boolean };
  isFieldEnabled: (entry: TimeEntry, field: 'subject' | 'project' | 'hours') => boolean;
};

const TimesheetRow: React.FC<TimesheetRowProps> = ({
  entry,
  weekDates,
  isWeekEditable,
  filteredClients,
  filteredProjects,
  filteredSubjects,
  handleClientChange,
  handleProjectChange,
  handleSubjectChange,
  handleInputChange,
  calculateRowTotal,
  deleteRow,
  saveRow,
  isSaving,
  isFieldEnabled,
}) => {
  return (
    <tr key={entry.id}>
      <td>
        <select
          className={`${styles.select} ${styles.clientSelect}`}
          value={entry.client || ""}
          onChange={(e) => handleClientChange(entry.id, e.target.value)}
          disabled={!isWeekEditable}
        >
          <option value="">Select</option>
          {filteredClients.map((client) => (
            <option key={client._id} value={client.name}>
              {client.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className={styles.select}
          value={entry.subject || ""}
          onChange={(e) => handleSubjectChange(entry.id, e.target.value)}
          disabled={!isFieldEnabled(entry, 'subject')}
        >
          <option value="">Select</option>
          {filteredSubjects.map((subject) => (
            <option key={subject._id} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className={styles.select}
          value={entry.project || ""}
          onChange={(e) => handleProjectChange(entry.id, e.target.value)}
          disabled={!isFieldEnabled(entry, 'project')}
        >
          <option value="">Select</option>
          {filteredProjects.map((project) => (
            <option key={project._id} value={project.name}>
              {project.name}
            </option>
          ))}
        </select>
      </td>
      {weekDates.map((date) => {
        const dayStr = date.toISOString().split("T")[0];
        return (
          <td key={dayStr}>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={entry.hours[dayStr] || ""}
              onChange={(e) => handleInputChange(entry.id, dayStr, e.target.value)}
              disabled={!isFieldEnabled(entry, 'hours')}
              className={styles.hourInput}
            />
          </td>
        );
      })}
      <td className={styles.totalCell}>{calculateRowTotal(entry).toFixed(2)}</td>
      <td>
        <div className={styles.actionButtons}>
          <button
            onClick={() => saveRow(entry)}
            className={`${styles.saveButton} ${entry.isDraft ? styles.saved : ''} ${isSaving[entry.id] ? styles.saving : ''}`}
            disabled={!isWeekEditable || isSaving[entry.id]}
            title="Save row"
          >
            <Save size={16} />
          </button>
          <button
            onClick={() => deleteRow(entry.id)}
            className={styles.deleteButton}
            disabled={!isWeekEditable}
            title="Delete row"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TimesheetRow;