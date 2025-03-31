import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./homepage.module.css";
import Calendar from "../Calender";
import Loader from "../Loader/loader";
import Header from "../Header/header";
import BarChartComponent from "../Charts/barchart";
import PieChartComponent from "../Charts/piechart";
import Dialog from "./dialog";
import TimesheetRow from "./timesheetRow";
import StatusRow from "./timesheetStatus";
import TimesheetService from "./timesheetservive";
import { TimeEntry, User, Project, Subject, DailyHours, ProjectHours, DialogData, Client } from "./timesheetTypes";

const HomepageContent: React.FC = () => {
  const projectColors = [
    "#3b82f6", "#22d3ee", "#f97316", "#a855f7", "#06b6d4", 
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
  ];
  

  const getInitialEntries = (): TimeEntry[] => {
    return Array(3).fill(null).map((_, index) => ({
      id: String(index + 1),
      client: "",
      project: "",
      subject: "",
      hours: {},
    }));
  };
  

  const [entries, setEntries] = useState<TimeEntry[]>(getInitialEntries());
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isWeekEditable, setIsWeekEditable] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [currentTimesheetId, setCurrentTimesheetId] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [hasTimesheetData, setHasTimesheetData] = useState(false);
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  const [projectHoursData, setProjectHoursData] = useState<ProjectHours[]>([]);
  const [dialogData, setDialogData] = useState<DialogData>({
    show: false,
    title: "",
    message: "",
    isError: false,
  });
  const [dataNotFound, setDataNotFound] = useState(false);

  const weekDates = useMemo(() => 
    TimesheetService.getWeekDates(selectedDate), 
    [selectedDate]
  );

  const formatHoursAndMinutes = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialogData({ show: true, title, message, isError });
  };

  const closeDialog = () => {
    setDialogData(prev => ({ ...prev, show: false }));
  };

  const initializeDefaultDayStatus = useCallback(() => {
    setDayStatus(TimesheetService.initializeDayStatus(weekDates));
  }, [weekDates]);

  const resetToDefaultValues = useCallback(() => {
    setCurrentTimesheetId("");
    setIsWeekEditable(true);
    setEntries(getInitialEntries()); 
    setWorkDescription("");
    setTimesheetStatus("unapproved");
    setHasTimesheetData(false);
    initializeDefaultDayStatus();
    setDataNotFound(false);
  }, [initializeDefaultDayStatus]);

  const calculateDailyHoursData = useCallback(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const abbreviations = ["S", "M", "T", "W", "T", "F", "S"];
    
    const dailyData: DailyHours[] = weekDates.map((date, index) => {
      const dayStr = date.toISOString().split("T")[0];
      const dayHours = entries.reduce((total, entry) => {
        const hours = Number.parseFloat(entry.hours[dayStr] || "0");
        return total + hours;
      }, 0);

      return {
        day: days[date.getDay()],
        abbreviation: abbreviations[date.getDay()],
        hours: dayHours
      };
    });

    setDailyHoursData(dailyData);
  }, [weekDates, entries]);

  const calculateProjectHoursData = useCallback(() => {
    const projectDataMap = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.project) {
        const projectHours = Object.values(entry.hours).reduce((total, hours) => {
          return total + Number.parseFloat(hours || "0");
        }, 0);

        if (projectHours > 0) {
          const currentHours = projectDataMap.get(entry.project) || 0;
          projectDataMap.set(entry.project, currentHours + projectHours);
        }
      }
    });

    const projectData: ProjectHours[] = Array.from(projectDataMap).map(([project, hours], index) => ({
      project,
      hours,
      color: projectColors[index % projectColors.length]
    }));

    setProjectHoursData(projectData);
  }, [entries, projectColors]);

  const calculateDayTotal = useCallback((date: Date) => {
    const dayStr = date.toISOString().split("T")[0];
    return entries.reduce((total, entry) => {
      const hours = Number.parseFloat(entry.hours[dayStr] || "0");
      return total + hours;
    }, 0);
  }, [entries]);

  const calculateRowTotal = useCallback((entry: TimeEntry) => {
    return Object.values(entry.hours).reduce((total, hours) => {
      return total + Number.parseFloat(hours || "0");
    }, 0);
  }, []);

  const calculateWeekTotal = useCallback(() => {
    return entries.reduce((total, entry) => {
      return total + calculateRowTotal(entry);
    }, 0);
  }, [entries, calculateRowTotal]);

  useEffect(() => {
    if (user && clients.length > 0) {
      const filtered = clients.filter(client => 
        client.assignedTo.length === 0 || client.assignedTo.includes(user.name)
      );
      setFilteredClients(filtered);
    }
  }, [user, clients]);
  
  
  const handleClientChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, client: value } : entry
      )
    );
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
        client: "",
        project: "",
        subject: "",
        hours: {},
      },
    ]);
  };

  const deleteRow = (entryId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const fetchTimesheetForCurrentWeek = useCallback(async () => {
    if (!user?.username) return;

    try {
      setLoading(true);
      setDataNotFound(false);
      
      const weekStartDateStr = weekDates[0].toISOString().split('T')[0];
      setWeekStartDate(weekStartDateStr);
      
      const timesheet = await TimesheetService.getTimesheetForWeek(user.username, weekStartDateStr);
      
      if (timesheet) {
        setCurrentTimesheetId(timesheet._id);
        setIsWeekEditable(timesheet.timesheetStatus === "rejected");
        
        setEntries(
          timesheet.entries.map((entry: TimeEntry) => ({
            ...entry,
            hours: entry.hours || {},
          }))
        );
        setWorkDescription(timesheet.workDescription || "");
        
        if (timesheet.dayStatus) {
          setDayStatus(timesheet.dayStatus);
        } else {
          initializeDefaultDayStatus();
        }
        
        setTimesheetStatus(timesheet.timesheetStatus || "unapproved");
        setHasTimesheetData(true);
      } else {
        resetToDefaultValues();
      }
    } catch (error) {
      resetToDefaultValues();
      // We won't show errors for new users without timesheet data
    } finally {
      setLoading(false);
    }
  }, [user?.username, weekDates, initializeDefaultDayStatus, resetToDefaultValues]);

  // Submit timesheet
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
      
      // Validate work description
      if (!workDescription || workDescription.trim() === '') {
        showDialog("Error", "Please add a work description", true);
        return;
      }
  
      setSubmitting(true);
  
      const updatedDayStatus = { ...dayStatus };
      weekDates.forEach((date) => {
        const dayStr = date.toISOString().split("T")[0];
        if (!updatedDayStatus[dayStr]) {
          const dayOfWeek = date.getDay();
          updatedDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
        }
      });
  
      const timesheetData = {
        username: user.username,
        entries: entries.filter((entry) =>
          Object.values(entry.hours).some((h) => h !== "")
        ),
        workDescription,
        dayStatus: updatedDayStatus,
      };
  
      let response;
      
      if (timesheetStatus === "rejected" && currentTimesheetId) {
        response = await TimesheetService.updateTimesheet(currentTimesheetId, timesheetData);
        
        if (response.success) {
          showDialog("Success", response.message);
          setTimesheetStatus("unapproved");
          setIsWeekEditable(false);
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", response.message, true);
        }
      } else {
        const newTimesheetData = {
          ...timesheetData,
          weekStartDate: weekDates[0].toISOString().split("T")[0],
          timesheetStatus: "unapproved"
        };
        
        response = await TimesheetService.submitTimesheet(newTimesheetData);
  
        if (response.success) {
          showDialog("Success", response.message);
          setIsWeekEditable(false);
          setTimesheetStatus("unapproved");
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", response.message, true);
        }
      }
    } catch (error) {
      showDialog("Error", "An error occurred while submitting the timesheet.", true);
    } finally {
      setSubmitting(false);
    }
  };

  // Effects
  
  // Critical fix: Ensure sidebar links work regardless of timesheet data
  useEffect(() => {
    const ensureSidebarNavigationWorks = () => {
      // Add this attribute to all links to ensure click events work properly
      document.querySelectorAll('a, button').forEach(element => {
        element.setAttribute('data-navigation-enabled', 'true');
      });
    };

    // Apply the fix immediately and after any data loads
    ensureSidebarNavigationWorks();
    
    // Also set an interval to keep checking and fixing links
    const interval = setInterval(ensureSidebarNavigationWorks, 1000);
    
    return () => clearInterval(interval);
  }, [hasTimesheetData]);

  // Effect for calculating analytics data
  useEffect(() => {
    if (entries.length > 0 && entries.some(entry => entry.project)) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateProjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries, calculateDailyHoursData, calculateProjectHoursData]);

  // Effect for initializing day status
  useEffect(() => {
    if (Object.keys(dayStatus).length === 0) {
      initializeDefaultDayStatus();
    }
  }, [weekDates, dayStatus, initializeDefaultDayStatus]);

  // Effect for loading user data
  useEffect(() => {
    const userData = TimesheetService.getUserFromLocalStorage();
    if (userData) {
      setUser(userData);
    }
  }, []);

  // Effect for filtering projects
  useEffect(() => {
    if (user && projects.length > 0) {
      const filtered = projects.filter(project => 
        project.assignedTo.length === 0 || project.assignedTo.includes(user.name)
      );
      setFilteredProjects(filtered);
    }
  }, [user, projects]);

  // Effect for filtering subjects
  useEffect(() => {
    if (user && subjects.length > 0) {
      const filtered = subjects.filter(subject => 
        !subject.assignedTo || 
        subject.assignedTo.length === 0 || 
        subject.assignedTo.includes(user.name)
      );
      setFilteredSubjects(filtered);
    }
  }, [user, subjects]);

  // Effect for fetching projects and subjects
  useEffect(() => {
  const fetchData = async () => {
    try {
      const [clientsData, projectsData, subjectsData] = await Promise.all([
        TimesheetService.fetchClients(),
        TimesheetService.fetchProjects(),
        TimesheetService.fetchSubjects(),
      ]);

      setClients(clientsData);
      setProjects(projectsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setClients([]);
      setProjects([]);
      setSubjects([]);
    }
  };

  fetchData();
}, []);

  // Effect for fetching timesheet data
  useEffect(() => {
    if (user?.username) {
      fetchTimesheetForCurrentWeek();
    } else {
      setLoading(false);
    }
  }, [selectedDate, user?.username, fetchTimesheetForCurrentWeek]);

  if (loading) return <Loader />;
  if (submitting) return <Loader message="Submitting timesheet..." />;

  return (
    <div className={styles.container}>
      <Header title="Timesheet" user={user} />
      
      <Dialog 
        show={dialogData.show}
        title={dialogData.title}
        message={dialogData.message}
        isError={dialogData.isError}
        onClose={closeDialog}
      />
      
      <div className={styles.tableContainer}>
        {timesheetStatus === "rejected" && (
          <div className={styles.rejectionBanner}>
            <span>This timesheet was rejected. Please make the necessary corrections and resubmit.</span>
            {currentTimesheetId && (
              <span className={styles.timesheetId}>ID: {currentTimesheetId}</span>
            )}
          </div>
        )}
        
        <div className={styles.gridContainer}>
          <div className={styles.calendarSection}>
            <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Subject</th>
                  <th>Projects</th>
                  {weekDates.map((date) => (
                    <th key={date.toISOString()} className={styles.weekColumn}>
                      {TimesheetService.formatDate(date)}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <TimesheetRow
                    key={entry.id}
                    entry={entry}
                    weekDates={weekDates}
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
                  {weekDates.map((date) => (
                    <td key={date.toISOString()} className={styles.totalCell}>
                      {calculateDayTotal(date).toFixed(2)}
                    </td>
                  ))}
                  <td className={styles.totalCell}>{calculateWeekTotal().toFixed(2)}</td>
                </tr>

                <StatusRow
                  weekDates={weekDates}
                  dayStatus={dayStatus}
                  isWeekEditable={isWeekEditable}
                  handleStatusChange={handleStatusChange}
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.descriptionContainer}>
          <h3 className={styles.descriptionHeading}>Work Description *</h3>
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
        
        {hasTimesheetData && (
          <div className={styles.analyticsSection}>
            <h3 className={styles.analyticsTitle}>Analytics for the week</h3>
            <div className={styles.chartsContainer}>
              <BarChartComponent dailyHoursData={dailyHoursData} />
              <PieChartComponent 
                projectHoursData={projectHoursData} 
                formatHoursAndMinutes={formatHoursAndMinutes} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomepageContent;