import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, CheckCircle, AlertTriangle, X } from "lucide-react";
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
  weekStartDate: string;
  entries: TimeEntry[];
  workDescription: string;
  timesheetStatus?: string;
  dayStatus?: { [key: string]: string };
};

type User = {
  name: string;
  username: string;
  email: string;
  role: string;
  designation: string;
};

type DialogData = {
  show: boolean;
  title: string;
  message: string;
  isError: boolean;
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
  const [submitting, setSubmitting] = useState(false);
  const [isWeekEditable, setIsWeekEditable] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [currentTimesheetId, setCurrentTimesheetId] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [dialogData, setDialogData] = useState<DialogData>({
    show: false,
    title: "",
    message: "",
    isError: false,
  });

  const getWeekDates = (date: Date) => {
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1); // Get Monday of the week
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

  // Show dialog with message
  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialogData({
      show: true,
      title,
      message,
      isError,
    });
  };

  // Close dialog
  const closeDialog = () => {
    setDialogData({
      ...dialogData,
      show: false,
    });
  };

  // Initialize or update default day statuses when week changes
  useEffect(() => {
    // Only create new day statuses if there isn't already data for this week
    if (Object.keys(dayStatus).length === 0) {
      const newDayStatus: { [key: string]: string } = {};
      weekDates.forEach((date) => {
        const dayStr = date.toISOString().split("T")[0];
        const dayOfWeek = date.getDay();
        newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
      });
      setDayStatus(newDayStatus);
    }
  }, [weekDates]);

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
        showDialog("Error", "User information is missing", true);
        return;
      }

      const hasEntries = entries.some((entry) =>
        Object.values(entry.hours).some((h) => h !== "")
      );

      if (!hasEntries) {
        showDialog("Error", "Please add at least one time entry", true);
        return;
      }

      // Show loader while submitting
      setSubmitting(true);

      // Ensure we have day status for all days in the week
      const updatedDayStatus = { ...dayStatus };
      weekDates.forEach((date) => {
        const dayStr = date.toISOString().split("T")[0];
        if (!updatedDayStatus[dayStr]) {
          const dayOfWeek = date.getDay();
          updatedDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
        }
      });

      // Prepare the timesheet data
      const timesheetData = {
        username: user.username,
        entries: entries.filter((entry) =>
          Object.values(entry.hours).some((h) => h !== "")
        ),
        workDescription,
        dayStatus: updatedDayStatus, // Ensure we're sending complete day status
      };

      let response;
      
      if (timesheetStatus === "rejected" && currentTimesheetId) {
        // Update existing rejected timesheet
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_UPDATE_TIMESHEET_API || '/api/timesheet/update'}/${currentTimesheetId}`,
          timesheetData
        );
        
        if (response.data.success) {
          showDialog("Success", "Timesheet updated and resubmitted successfully!");
          // Keep the timesheet data but make it non-editable
          setTimesheetStatus("unapproved");
          setIsWeekEditable(false);
          
          // Refresh data to get the updated state from the server
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", "Failed to update timesheet. Please try again.", true);
        }
      } else {
        // Submit new timesheet
        const newTimesheetData = {
          ...timesheetData,
          weekStartDate: weekDates[0].toISOString().split("T")[0],
          timesheetStatus: "unapproved"
        };
        
        response = await axios.post(
          process.env.NEXT_PUBLIC_SUBMIT_API as string,
          newTimesheetData
        );

        if (response.data.message === "Timesheet submitted successfully") {
          showDialog("Success", "Timesheet submitted successfully!");
          setIsWeekEditable(false);
          setTimesheetStatus("unapproved");
          
          // Refresh data to get the saved state from the server
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", "Failed to submit timesheet. Please try again.", true);
        }
      }
    } catch (error) {
      console.error("Error submitting/updating timesheet:", error);
      if (axios.isAxiosError(error)) {
        showDialog(
          "Error", 
          `Failed to submit timesheet: ${error.response?.data?.message || "An unknown error occurred"}`,
          true
        );
      } else {
        showDialog("Error", "An error occurred while submitting the timesheet.", true);
      }
    } finally {
      setSubmitting(false);
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

  const fetchTimesheetForCurrentWeek = async () => {
    if (!user?.username) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${user.username}`
      );

      if (response.data.success) {
        const weekDaysArray = weekDates.map(date => date.toISOString().split('T')[0]);
        setWeekStartDate(weekDaysArray[0]);
        
        // First try to find by weekStartDate matching the Monday of selected week
        let relevantTimesheet = response.data.timesheets.find((timesheet: Timesheet) => {
          // Get Monday of the selected week
          const selectedWeekMonday = weekDates[0].toISOString().split('T')[0];
          return timesheet.weekStartDate === selectedWeekMonday;
        });
        
        // If not found by weekStartDate, try to find by any entry with hours in this week
        if (!relevantTimesheet) {
          relevantTimesheet = response.data.timesheets.find((timesheet: Timesheet) => {
            // Check if this timesheet has any entries with hours in the selected week
            return timesheet.entries.some((entry: TimeEntry) => {
              return Object.keys(entry.hours).some(dateStr => 
                weekDaysArray.includes(dateStr)
              );
            });
          });
        }

        if (relevantTimesheet) {
          // Timesheet exists for this week
          setCurrentTimesheetId(relevantTimesheet._id);
          
          // If timesheet is rejected, make it editable
          if (relevantTimesheet.timesheetStatus === "rejected") {
            setIsWeekEditable(true);
          } else {
            setIsWeekEditable(false);
          }
          
          setEntries(
            relevantTimesheet.entries.map((entry: TimeEntry) => ({
              ...entry,
              hours: entry.hours || {},
            }))
          );
          setWorkDescription(relevantTimesheet.workDescription || "");
          
          // Handle case where dayStatus may be missing in the API response
          if (relevantTimesheet.dayStatus) {
            setDayStatus(relevantTimesheet.dayStatus);
          } else {
            // Create default day statuses if needed
            const newDayStatus: { [key: string]: string } = {};
            weekDates.forEach((date) => {
              const dayStr = date.toISOString().split("T")[0];
              const dayOfWeek = date.getDay();
              newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
            });
            setDayStatus(newDayStatus);
          }
          
          setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved");
        } else {
          // No timesheet for this week, reset everything
          setCurrentTimesheetId("");
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
      showDialog("Error", "Failed to fetch timesheet data. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheetForCurrentWeek();
  }, [selectedDate, user?.username]);

  // Dialog component
  const Dialog = () => {
    if (!dialogData.show) return null;
    
    return (
      <div className={styles.dialogOverlay}>
        <div className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <div className={styles.dialogTitle}>
              {dialogData.isError ? (
                <AlertTriangle size={24} className={styles.dialogIconError} />
              ) : (
                <CheckCircle size={24} className={styles.dialogIconSuccess} />
              )}
              <h3>{dialogData.title}</h3>
            </div>
            <button className={styles.dialogCloseButton} onClick={closeDialog}>
              <X size={18} />
            </button>
          </div>
          <div className={styles.dialogBody}>
            <p>{dialogData.message}</p>
          </div>
          <div className={styles.dialogFooter}>
            <button 
              className={`${styles.dialogButton} ${dialogData.isError ? styles.dialogButtonError : styles.dialogButtonSuccess}`} 
              onClick={closeDialog}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <Loader message="Loading timesheet..." />;
  if (submitting) return <Loader message="Submitting timesheet..." />;

  return (
    <div className={styles.container}>
      <Header title="Timesheet" user={user} />
      
      <Dialog />
      
      <div className={styles.tableContainer}>
        {timesheetStatus === "rejected" && (
          <div className={styles.rejectionBanner}>
            <span>This timesheet was rejected. Please make the necessary corrections and resubmit.</span>
          </div>
        )}
        
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
                  const currentStatus = dayStatus[dayStr] || defaultStatus;

                  return (
                    <td key={dayStr}>
                      <select
                        value={currentStatus}
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
            {timesheetStatus === "rejected" ? "Resubmit for approval" : "Submit for approval"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomepageContent;