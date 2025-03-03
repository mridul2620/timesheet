import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./homepage.module.css";
import Calendar from "../Calender";
import Loader from "../Loader/loader";
import Header from "../Header/header";

type TimeEntry = {
  id: string;
  project: string;
  subject: string;
  hours: { [key: string]: string };
};

type Timesheet = {
  _id: string;
  username: string;
  entries: TimeEntry[];
  workDescription: string;
  timesheetStatus?: string;
  dayStatus: { [key: string]: string };
};

type User = {
  name: string;
  username: string;
  email: string;
  role: string;
  designation: string;
};

const HomepageContent: React.FC = () => {
  const getInitialEntry = (): TimeEntry => ({
    id: "1",
    project: "",
    subject: "",
    hours: {},
  });

  const [entries, setEntries] = useState<TimeEntry[]>([getInitialEntry()]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  const [projects, setProjects] = useState<{ _id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWeekEditable, setIsWeekEditable] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");

  const getWeekDates = (date: Date) => {
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  };

  const formatDate = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const weekDates = getWeekDates(selectedDate);

  const calculateDayTotal = (date: Date) => {
    const dayStr = date.toISOString().split("T")[0];
    return entries.reduce((total, entry) => {
      const hours = Number.parseFloat(entry.hours[dayStr] || "0");
      return total + hours;
    }, 0);
  };

  const calculateRowTotal = (entry: TimeEntry) => {
    return Object.values(entry.hours).reduce((total, hours) => {
      return total + Number.parseFloat(hours || "0");
    }, 0);
  };

  const calculateWeekTotal = () => {
    return entries.reduce((total, entry) => {
      return total + calculateRowTotal(entry);
    }, 0);
  };

  const handleProjectChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, project: value } : entry
      )
    );
  };

  const handleSubjectChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, subject: value } : entry
      )
    );
  };

  const handleInputChange = (entryId: string, day: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, hours: { ...entry.hours, [day]: value } }
          : entry
      )
    );
  };

  const handleStatusChange = (day: string, value: string) => {
    setDayStatus((prev) => ({ ...prev, [day]: value }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorkDescription(e.target.value);
  };

  const addNewRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        project: "",
        subject: "",
        hours: {},
      },
    ]);
  };

  const deleteRow = (entryId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleSubmit = async () => {
    try {
      if (!user?.username) {
        alert("User information is missing");
        return;
      }

      const hasEntries = entries.some((entry) =>
        Object.values(entry.hours).some((h) => h !== "")
      );

      if (!hasEntries) {
        alert("Please add at least one time entry");
        return;
      }

      const timesheetData = {
        username: user.username,
        weekStartDate: selectedDate.toISOString().split("T")[0],
        entries: entries.filter((entry) =>
          Object.values(entry.hours).some((h) => h !== "")
        ),
        workDescription,
        dayStatus,
        timesheetStatus: "unapproved" // Default status for new submissions
      };

      const response = await axios.post(
        process.env.NEXT_PUBLIC_SUBMIT_API as string,
        timesheetData
      );

      if (response.data.message === "Timesheet submitted successfully") {
        alert("Timesheet submitted successfully!");
        // Set the timesheet as not editable after submission
        setIsWeekEditable(false);
        setTimesheetStatus("unapproved");
      } else {
        alert("Failed to submit timesheet. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      if (axios.isAxiosError(error)) {
        alert(`Error: ${error.response?.data?.message || "An unknown error occurred"}`);
      } else {
        alert("An error occurred while submitting the timesheet.");
      }
    }
  };

  useEffect(() => {
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.success) {
        setUser(parsedData.user);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsResponse, subjectsResponse] = await Promise.all([
          axios.get(process.env.NEXT_PUBLIC_PROJECTS_API as string),
          axios.get(process.env.NEXT_PUBLIC_SUBJECTS_API as string),
        ]);

        setProjects(projectsResponse.data?.projects || []);
        setSubjects(subjectsResponse.data?.subjects || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchTimesheet = async () => {
      if (!user?.username) return;

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${user.username}`
        );

        if (response.data.success) {
          const relevantTimesheet = response.data.timesheets.find((timesheet: Timesheet) => {
            return timesheet.entries.some((entry) => {
              return Object.keys(entry.hours).some((date) => {
                const entryDate = new Date(date);
                const weekStart = getWeekDates(selectedDate)[0];
                const weekEnd = getWeekDates(selectedDate)[6];
                return entryDate >= weekStart && entryDate <= weekEnd;
              });
            });
          });

          if (relevantTimesheet) {
            // Timesheet exists for this week
            setIsWeekEditable(false);
            setEntries(
              relevantTimesheet.entries.map((entry: { hours: any; }) => ({
                ...entry,
                hours: entry.hours || {},
              }))
            );
            setWorkDescription(relevantTimesheet.workDescription || "");
            setDayStatus(relevantTimesheet.dayStatus || {});
            
            // Set the status from the timesheet data
            setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved");
          } else {
            // No timesheet for this week, reset everything
            setIsWeekEditable(true);
            setEntries([getInitialEntry()]);
            setWorkDescription("");
            setTimesheetStatus("unapproved");

            const newDayStatus: { [key: string]: string } = {};
            weekDates.forEach((date) => {
              const dayStr = date.toISOString().split("T")[0];
              const dayOfWeek = date.getDay();
              newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
            });
            setDayStatus(newDayStatus);
          }
        }
      } catch (error) {
        console.error("Error fetching timesheet:", error);
      }
    };

    fetchTimesheet();
  }, [selectedDate, user?.username]);

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <Header title="Timesheet" user={user} />
      <div className={styles.tableContainer}>
        <div className={styles.gridContainer}>
          <div className={styles.calendarSection}>
            <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Projects</th>
                <th>Subject</th>
                {weekDates.map((date) => (
                  <th key={date.toISOString()}>{formatDate(date)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <select
                      className={styles.select}
                      value={entry.project}
                      onChange={(e) => handleProjectChange(entry.id, e.target.value)}
                      disabled={!isWeekEditable}
                    >
                      <option value="">Select</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project.name}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={styles.select}
                      value={entry.subject}
                      onChange={(e) => handleSubjectChange(entry.id, e.target.value)}
                      disabled={!isWeekEditable}
                    >
                      <option value="">Select</option>
                      {subjects.map((subject) => (
                        <option key={subject._id} value={subject.name}>
                          {subject.name}
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
                          disabled={!isWeekEditable}
                          className={styles.hourInput}
                        />
                      </td>
                    );
                  })}
                  <td className={styles.totalCell}>
                    {calculateRowTotal(entry).toFixed(2)}
                  </td>
                  <td>
                    <button
                      onClick={() => deleteRow(entry.id)}
                      className={styles.deleteButton}
                      disabled={!isWeekEditable}
                      title="Delete row"
                    >
                      <Trash2 className={styles.buttonIcon} />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className={styles.totalRow}>
                <td>
                  <button onClick={addNewRow} className={styles.button} disabled={!isWeekEditable}>
                    <Plus className={styles.buttonIcon} />
                    Project
                  </button>
                </td>
                <td>Total</td>
                {weekDates.map((date) => (
                  <td key={date.toISOString()} className={styles.totalCell}>
                    {calculateDayTotal(date).toFixed(2)}
                  </td>
                ))}
                <td className={styles.totalCell}>{calculateWeekTotal().toFixed(2)}</td>
              </tr>

              <tr className={styles.statusRow}>
                <td colSpan={2}>Status</td>
                {weekDates.map((date) => {
                  const dayStr = date.toISOString().split("T")[0];
                  const dayOfWeek = date.getDay();
                  const defaultStatus = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";

                  return (
                    <td key={dayStr}>
                      <select
                        value={dayStatus[dayStr] || defaultStatus}
                        onChange={(e) => handleStatusChange(dayStr, e.target.value)}
                        className={styles.select}
                        disabled={!isWeekEditable}
                      >
                        <option value="working">Working</option>
                        <option value="holiday">Holiday</option>
                        <option value="sick">Sick</option>
                        <option value="bank-holiday">Bank Holiday</option>
                      </select>
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.descriptionContainer}>
          <h3 className={styles.descriptionHeading}>Work Description</h3>
          <textarea
            className={styles.descriptionTextarea}
            value={workDescription}
            disabled={!isWeekEditable}
            onChange={handleDescriptionChange}
            placeholder="Please provide a description of the work you've done this week..."
            rows={2}
          />
        </div>
<div className={styles.submitWrapper}>
  {!isWeekEditable && (
    <div className={styles.timesheetStatus}>
      <span className={styles.statusLabel}>Timesheet Status:</span>
      <span className={`${styles.statusValue} ${styles[timesheetStatus]}`}>
        {timesheetStatus === "approved" ? "Approved" : 
         timesheetStatus === "rejected" ? "Rejected" : "Pending Approval"}
      </span>
    </div>
  )}
  
  <button 
    className={styles.submitButton} 
    onClick={handleSubmit} 
    disabled={!isWeekEditable}
  >
    Submit for approval
  </button>
</div>
      </div>
    </div>
  );
};

export default HomepageContent;