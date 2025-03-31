"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, PieChart, X } from "lucide-react";
import styles from "./timesheet.module.css";
import Header from "../Header/header";
import Loader from "../Loader/loader";
import Calendar from "../Calender";
import { useParams } from 'next/navigation';

interface TimeEntry {
  client: string; // Added client field
  project: string;
  subject: string;
  hours: { [key: string]: string };
}

interface User {
  name: string;
  username: string;
  email: string;
  role?: string;
  designation: string;
}

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

interface NotificationState {
  show: boolean;
  message: string;
}

const EmployeeTimesheet = () => {
  const params = useParams();
  const username = params?.username as string;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [relevantTimesheetId, setRelevantTimesheetId] = useState<string | null>(null);
  const [hasTimesheetData, setHasTimesheetData] = useState(false);
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  const [projectHoursData, setProjectHoursData] = useState<ProjectHours[]>([]);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: "" });

  const projectColors = [
    "#3b82f6", "#22d3ee", "#f97316", "#a855f7", "#06b6d4", 
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
  ];

  useEffect(() => {
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setAdminUser(parsedData.user);
        }
      } catch (error) {
        console.error("Error parsing admin data:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_USER_API_URL}/${username}`);
        if (response.data.success && response.data.user) {
          setSelectedEmployee(response.data.user);
          localStorage.setItem('currentEmployeeData', JSON.stringify(response.data.user));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        
        const storedEmployeeData = localStorage.getItem("currentEmployeeData");
        if (storedEmployeeData) {
          try {
            const employeeData = JSON.parse(storedEmployeeData);
            if (employeeData.username === username) {
              setSelectedEmployee(employeeData);
            }
          } catch (e) {
            console.error("Error parsing stored employee data:", e);
          }
        }
      }
    };

    fetchUserData();
  }, [username]);

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
    
    const dailyData: DailyHours[] = weekDates.map((date) => {
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

  useEffect(() => {
    const fetchTimesheet = async () => {
      if (!username) return;
      setLoading(true);

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`
        );

        if (response.data.success) {
          const relevantTimesheet = response.data.timesheets.find((timesheet: any) => {
            return timesheet.entries.some((entry: any) => {
              return Object.keys(entry.hours).some((date) => {
                const entryDate = new Date(date);
                const weekStart = getWeekDates(selectedDate)[0];
                const weekEnd = getWeekDates(selectedDate)[6];
                return entryDate >= weekStart && entryDate <= weekEnd;
              });
            });
          });

          if (relevantTimesheet) {
            setEntries(
              relevantTimesheet.entries.map((entry: any) => ({
                ...entry,
                client: entry.client || "", // Ensure client field is set
                hours: entry.hours || {},
              }))
            );
            setWorkDescription(relevantTimesheet.workDescription || "");
            setDayStatus(relevantTimesheet.dayStatus || {});
            setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved");
            setRelevantTimesheetId(relevantTimesheet._id || null);
          } else {
            setEntries([{
              client: "", // Initialize with empty client
              project: "",
              subject: "",
              hours: {}
            }]);
            setWorkDescription("");
            setTimesheetStatus("unapproved");
            setRelevantTimesheetId(null);
       
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
      } finally {
        setLoading(false);
      }
    };

    fetchTimesheet();
  }, [selectedDate, username]);

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

  const handleDateChange = (date: Date) => {
    setSelectedDate(new Date(date));
  };

  const sendEmailNotification = async (status: string) => {
    if (!selectedEmployee?.email) {
      showNotification("Unable to send notification: Email address not found");
      return;
    }

    const timesheetData = {
      entries: entries,
      weekDates: weekDates.map(date => date.toISOString()),
      dayStatus: dayStatus,
      workDescription: workDescription
    };

    try {
      const emailData = {
        userEmail: selectedEmployee.email,
        userName: selectedEmployee.name || username,
        status: status,
        startDate: weekDates[0].toISOString(),
        endDate: weekDates[6].toISOString(),
        timesheetData: timesheetData,
        adminName: adminUser?.name || 'Admin'
      };
      
      const emailApiUrl = process.env.NEXT_PUBLIC_EMAIL_API_URL as string;
      const response = await axios.post(emailApiUrl, emailData);

      if (response.data.success) {
        showNotification("The user has been notified via email.");
      } else {
        showNotification("Failed to send email: " + (response.data.message || "Unknown error"));
      }
    } catch (error: any) {
      if (error.response) {
        showNotification(`Failed to send email: ${error.response.status} - ${error.response.data.message || "Server error"}`);
      } else if (error.request) {
        showNotification("Failed to send email: No response from server");
      } else {
        showNotification(`Failed to send email: ${error.message}`);
      }
    }
  };

  const updateTimesheetStatus = async (status: string) => {
    if (!relevantTimesheetId || !username) {
      showNotification("Cannot update status: Missing timesheet ID or username");
      return;
    }
    
    setUpdatingStatus(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_TIMESHEET_STATUS}${username}/status`, 
        {
          timesheetId: relevantTimesheetId,
          status
        }
      );
      
      if (response.data.success) {
        setTimesheetStatus(status);
        await sendEmailNotification(status);
        showNotification(`Timesheet ${status} successfully`);
      }
    } catch (error) {
      console.error("Error updating timesheet status:", error);
      showNotification(`Failed to update timesheet status to ${status}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprove = () => updateTimesheetStatus("approved");
  const handleReject = () => updateTimesheetStatus("rejected");

  const showNotification = (message: string) => {
    setNotification({
      show: true,
      message: message
    });

    setTimeout(() => {
      setNotification({
        show: false,
        message: ""
      });
    }, 3000);
  };

  const closeNotification = () => {
    setNotification({
      show: false,
      message: ""
    });
  };

  const NotificationDialog = () => {
    if (!notification.show) return null;

    return (
      <div className={styles.notificationOverlay}>
        <div className={styles.notificationDialog}>
          <div className={styles.notificationHeader}>
            <span>Notification</span>
            <button 
              className={styles.closeButton}
              onClick={closeNotification}
            >
              <X size={18} />
            </button>
          </div>
          <div className={styles.notificationContent}>
            {notification.message}
          </div>
        </div>
      </div>
    );
  };

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
                  <div className={styles.barWrapper} style={{ height: '100%' }}>
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
    
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>
            <PieChart size={18} className={styles.chartIcon} />
            <h3>Projects handled</h3>
          </div>
        </div>
        <div className={styles.pieChartContainer}>
          <div className={styles.pieChart} style={{ position: 'relative' }}>
            <svg viewBox="0 0 100 100" className={styles.pieChartSvg}>
              {segments.map((segment, index) => (
                <path 
                  key={index} 
                  d={segment.path}
                  fill={segment.project.color}
                  onMouseEnter={() => setHoveredProject(segment.project.project)}
                  onMouseLeave={() => setHoveredProject(null)}
                />
              ))}
              <circle cx="50" cy="50" r="25" fill="#121f3a" />
              <text x="50" y="55" textAnchor="middle" fill="#f97316" fontSize="36" fontWeight="bold" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                {projectCount}
              </text>
            </svg>
            
            {hoveredProject && (
              <div className={styles.projectHoverLabel}>
                {hoveredProject}
              </div>
            )}
          </div>
          
          <div className={styles.pieChartLegend}>
            {projectHoursData.map((project, index) => (
              <div key={index} className={styles.legendItem}>
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

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <Header 
        title={`Timesheet - ${selectedEmployee?.name || username}`} 
        user={adminUser}
      />
      {notification.show && <NotificationDialog />}
      <div className={styles.tableContainer}>
        <div className={styles.gridContainer}>
          <div className={styles.calendarSection}>
            <Calendar 
              selectedDate={selectedDate}
              onChange={handleDateChange}
            />
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Projects</th>
                <th>Subject</th>
                {weekDates.map((date) => (
                  <th key={date.toISOString()}>{formatDate(date)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
            {entries.map((entry, index) => (
  <tr key={index}>
    <td>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={entry.client}
          className={styles.readOnlyInput}
          readOnly
          title={entry.client} // Native HTML tooltip
        />
        {entry.client && (
          <div className={styles.tooltipWrapper}>
            <span className={styles.tooltipText}>{entry.client}</span>
          </div>
        )}
      </div>
    </td>
    <td>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={entry.project}
          className={styles.readOnlyInput}
          readOnly
          title={entry.project} // Native HTML tooltip
        />
        {entry.project && (
          <div className={styles.tooltipWrapper}>
            <span className={styles.tooltipText}>{entry.project}</span>
          </div>
        )}
      </div>
    </td>
    <td>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={entry.subject}
          className={styles.readOnlyInput}
          readOnly
          title={entry.subject} // Native HTML tooltip
        />
        {entry.subject && (
          <div className={styles.tooltipWrapper}>
            <span className={styles.tooltipText}>{entry.subject}</span>
          </div>
        )}
      </div>
    </td>
    {weekDates.map((date) => {
      const dayStr = date.toISOString().split("T")[0];
      return (
        <td key={dayStr}>
          <input
            type="text"
            value={entry.hours[dayStr] || ""}
            className={styles.readOnlyHourInput}
            readOnly
          />
        </td>
      );
    })}
    <td className={styles.totalCell}>
      {calculateRowTotal(entry).toFixed(2)}
    </td>
  </tr>
))}

              <tr className={styles.totalRow}>
                <td colSpan={3}>Total</td>
                {weekDates.map((date) => (
                  <td key={date.toISOString()} className={styles.totalCell}>
                    {calculateDayTotal(date).toFixed(2)}
                  </td>
                ))}
                <td className={styles.totalCell}>{calculateWeekTotal().toFixed(2)}</td>
              </tr>

              <tr className={styles.statusRow}>
                <td colSpan={3}>Status</td>
                {weekDates.map((date) => {
                  const dayStr = date.toISOString().split("T")[0];
                  return (
                    <td key={dayStr}>
                      <input
                        type="text"
                        value={dayStatus[dayStr] || ""}
                        className={styles.readOnlyInput}
                        readOnly
                      />
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
            readOnly
            rows={4}
          />
          <div className={styles.statusActionsRow}>
            <div className={styles.timesheetStatus}>
              <span className={styles.statusLabel}>Status:</span>
              <span className={`${styles.statusValue} ${styles[timesheetStatus]}`}>
                {timesheetStatus === "approved" ? "APPROVED" : 
                timesheetStatus === "rejected" ? "REJECTED" : "UNAPPROVED"}
              </span>
            </div>
            <div className={styles.approvalActions}>
            <button 
                className={`${styles.actionButton} ${styles.rejectButton}`}
                onClick={handleReject}
                disabled={updatingStatus || timesheetStatus === 'rejected'}
              >
                Reject
              </button>
              <button 
                className={`${styles.actionButton} ${styles.approveButton}`}
                onClick={handleApprove}
                disabled={updatingStatus || timesheetStatus === 'approved'}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
        
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

export default EmployeeTimesheet;