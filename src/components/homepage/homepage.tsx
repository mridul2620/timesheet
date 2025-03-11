import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, CheckCircle, AlertTriangle, X, BarChart3, PieChart } from "lucide-react";
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

type DailyHours = {
  day: string;
  abbreviation: string;
  hours: number;
};

type ProjectHours = {
  project: string;
  hours: number;
  color: string;
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
  const [hasTimesheetData, setHasTimesheetData] = useState(false);
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  const [projectHoursData, setProjectHoursData] = useState<ProjectHours[]>([]);
  const [dialogData, setDialogData] = useState<DialogData>({
    show: false,
    title: "",
    message: "",
    isError: false,
  });

  const projectColors = [
    "#3b82f6", // Blue
    "#22d3ee", // Cyan
    "#f97316", // Orange
    "#a855f7", // Purple
    "#06b6d4", // Light blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Indigo
    "#ec4899", // Pink
  ];

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

  useEffect(() => {
    if (entries.length > 0 && entries[0].project) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateProjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries]);

  const calculateDailyHoursData = () => {
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

    console.log(dailyData);

    setDailyHoursData(dailyData);
  };

  const calculateProjectHoursData = () => {
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
  };

  const formatHoursAndMinutes = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialogData({
      show: true,
      title,
      message,
      isError,
    });
  };

  const closeDialog = () => {
    setDialogData({
      ...dialogData,
      show: false,
    });
  };

  useEffect(() => {
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
        response = await axios.put(
          `${process.env.NEXT_PUBLIC_UPDATE_TIMESHEET_API || '/api/timesheet/update'}/${currentTimesheetId}`,
          timesheetData
        );
        
        if (response.data.success) {
          showDialog("Success", "Timesheet updated and resubmitted successfully!");
          setTimesheetStatus("unapproved");
          setIsWeekEditable(false);
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", "Failed to update timesheet. Please try again.", true);
        }
      } else {
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

        let relevantTimesheet = response.data.timesheets.find((timesheet: Timesheet) => {
          const selectedWeekMonday = weekDates[0].toISOString().split('T')[0];
          return timesheet.weekStartDate === selectedWeekMonday;
        });
      
        if (!relevantTimesheet) {
          relevantTimesheet = response.data.timesheets.find((timesheet: Timesheet) => {
            return timesheet.entries.some((entry: TimeEntry) => {
              return Object.keys(entry.hours).some(dateStr => 
                weekDaysArray.includes(dateStr)
              );
            });
          });
        }

        if (relevantTimesheet) {
          setCurrentTimesheetId(relevantTimesheet._id);
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
          
          if (relevantTimesheet.dayStatus) {
            setDayStatus(relevantTimesheet.dayStatus);
          } else {
            const newDayStatus: { [key: string]: string } = {};
            weekDates.forEach((date) => {
              const dayStr = date.toISOString().split("T")[0];
              const dayOfWeek = date.getDay();
              newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
            });
            setDayStatus(newDayStatus);
          }
          
          setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved");
          setHasTimesheetData(true);
        } else {
          setCurrentTimesheetId("");
          setIsWeekEditable(true);
          setEntries([getInitialEntry()]);
          setWorkDescription("");
          setTimesheetStatus("unapproved");
          setHasTimesheetData(false);

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

  const BarChartComponent = () => {
    const maxHours = Math.max(...dailyHoursData.map(day => day.hours), 10);
    
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>
            <BarChart3 size={18} className={styles.chartIcon} />
            <h3>Work load report</h3>
          </div>
        </div>
        <div className={styles.barChartContainer}>
          <div className={styles.yAxis}>
            <div>{Math.round(maxHours)}h</div>
            <div>{Math.round(maxHours * 0.8)}h</div>
            <div>{Math.round(maxHours * 0.6)}h</div>
            <div>{Math.round(maxHours * 0.4)}h</div>
            <div>{Math.round(maxHours * 0.2)}h</div>
            <div>0h</div>
          </div>
          <div className={styles.barChart}>
            {dailyHoursData.map((day, index) => {
              const heightPercentage = day.hours > 0 
                ? Math.max((day.hours / maxHours) * 100, 1)
                : 0;
                
              return (
                <div key={index} className={styles.barColumn}>
                  <div 
                    className={styles.barWrapper}
                    style={{ height: '100%' }}
                  >
                    <div 
                      className={styles.bar}
                      style={{ 
                        height: `${heightPercentage}%`,
                        backgroundColor: day.hours > 0 
                          ? (index === 1 || index === 4 ? '#22d3ee' : '#3b82f6') 
                          : 'transparent'
                      }}
                    >
                      {day.hours > 0 && (
                        <span className={styles.barValue}>{day.hours}h</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.barLabel}>{day.abbreviation}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const PieChartComponent = () => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const totalHours = projectHoursData.reduce((sum, project) => sum + project.hours, 0);
  const projectCount = projectHoursData.length;
    
  let cumulativePercentage = 0;
  const segments = projectHoursData.map((project, index) => {
    const percentage = (project.hours / totalHours) * 100;
    const startAngle = cumulativePercentage;
    cumulativePercentage += percentage;
    const endAngle = cumulativePercentage;
    const startX = 50 + 40 * Math.cos((startAngle / 100) * 2 * Math.PI - Math.PI/2);
    const startY = 50 + 40 * Math.sin((startAngle / 100) * 2 * Math.PI - Math.PI/2);
    const endX = 50 + 40 * Math.cos((endAngle / 100) * 2 * Math.PI - Math.PI/2);
    const endY = 50 + 40 * Math.sin((endAngle / 100) * 2 * Math.PI - Math.PI/2);
    const largeArcFlag = percentage > 50 ? 1 : 0;
    const path = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
    return { project, percentage, path };
  });

  const getTooltipPosition = (index: number) => {
    if (index === null) return { left: 0, top: 0 };
    const segment = segments[index];
    const startPercentage = index === 0 ? 0 : segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
    const midPercentage = startPercentage + segment.percentage / 2;
    const midAngle = (midPercentage / 100) * 2 * Math.PI - Math.PI/2;
    const tooltipX = 50 + 50 * Math.cos(midAngle);
    const tooltipY = 50 + 50 * Math.sin(midAngle);
    
    return { left: `${tooltipX}%`, top: `${tooltipY}%` };
  };
  
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          <PieChart size={18} className={styles.chartIcon} />
          <h3>Projects handled</h3>
        </div>
      </div>
      <div className={styles.pieChartContainer}>
        <div className={styles.pieChart}>
          <svg viewBox="0 0 100 100" className={styles.pieChartSvg}>
            {segments.map((segment, index) => (
              <path 
                key={index} 
                d={segment.path}
                fill={segment.project.color}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                className={styles.pieSegment}
              />
            ))}
            {/* Inner circle to create donut effect */}
            <circle cx="50" cy="50" r="25" fill="#121f3a" />
            
            {/* Display the number of projects in the center */}
            <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
              {projectCount}
            </text>
            <text x="50" y="60" textAnchor="middle" fill="#b9c1d9" fontSize="10">
              Projects
            </text>
          </svg>
          
          {/* Tooltip for hovered segment */}
          {hoveredSegment !== null && (
            <div 
              className={styles.segmentTooltip} 
              style={getTooltipPosition(hoveredSegment)}
            >
              {projectHoursData[hoveredSegment].project}
            </div>
          )}
        </div>
        <div className={styles.pieChartLegend}>
          {projectHoursData.map((project, index) => (
            <div 
              key={index} 
              className={styles.legendItem}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className={styles.legendColor} style={{ backgroundColor: project.color }}></div>
              <div className={styles.legendText}>
                <div className={styles.legendTitle}>{project.project}</div>
                <div className={styles.legendValue}>{formatHoursAndMinutes(project.hours)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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

  if (loading) return <Loader />;
  if (submitting) return <Loader message="Submitting timesheet..." />;

  return (
    <div className={styles.container}>
      <Header title="Timesheet" user={user} />
      
      <Dialog />
      
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
        
        {/* Analytics section - only shown when timesheet data is available */}
        {hasTimesheetData && (
          <div className={styles.analyticsSection}>
            <h3 className={styles.analyticsTitle}>Analytics for the week</h3>
            <div className={styles.chartsContainer}>
              <BarChartComponent />
              <PieChartComponent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomepageContent;