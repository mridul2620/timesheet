"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, PieChart } from "lucide-react";
import styles from "./timesheet.module.css";
import Header from "../Header/header";
import Loader from "../Loader/loader";
import Calendar from "../Calender";
import { useParams } from 'next/navigation';

interface TimeEntry {
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

interface Timesheet {
  entries: TimeEntry[];
  workDescription: string;
  dayStatus: { [key: string]: string };
  status?: string; // Added status field
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

  // Colors for project pie chart
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

  useEffect(() => {
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.success) {
        setAdminUser(parsedData.user);
      }
    }

    const fetchEmployeeDetails = async () => {
      if (!username) return;
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`);
        if (response.data.success) {
          setSelectedEmployee(response.data.user);
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
      }
    };

    if (username) {
      fetchEmployeeDetails();
    }
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

  // Calculate analytics data when entries change
  useEffect(() => {
    if (entries.length > 0 && entries[0].project) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateProjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries]);

  // Calculate daily hours for bar chart
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

    setDailyHoursData(dailyData);
  };

  // Calculate project hours for pie chart
  const calculateProjectHoursData = () => {
    const projectDataMap = new Map<string, number>();

    // Calculate total hours for each project
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

    // Convert to array format needed for chart
    const projectData: ProjectHours[] = Array.from(projectDataMap).map(([project, hours], index) => ({
      project,
      hours,
      color: projectColors[index % projectColors.length]
    }));

    setProjectHoursData(projectData);
  };

  // Format hours for display (e.g., 16h 30m)
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
                hours: entry.hours || {},
              }))
            );
            setWorkDescription(relevantTimesheet.workDescription || "");
            setDayStatus(relevantTimesheet.dayStatus || {});
            setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved"); // Updated field name
            setRelevantTimesheetId(relevantTimesheet._id || null);
          } else {
            setEntries([{
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
    // Set the selected date as a new date object
    setSelectedDate(new Date(date));
  };

  const updateTimesheetStatus = async (status: string) => {
    if (!relevantTimesheetId || !username) return;
    
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
      }
    } catch (error) {
      console.error("Error updating timesheet status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprove = () => {
    updateTimesheetStatus("approved");
  };

  const handleReject = () => {
    updateTimesheetStatus("rejected");
  };

  // Bar Chart component
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

  // Pie Chart component
  // Pie Chart component
const PieChartComponent = () => {
  const totalHours = projectHoursData.reduce((sum, project) => sum + project.hours, 0);
  const projectCount = projectHoursData.length;
  
  // Calculate the segments for the donut chart
  let cumulativePercentage = 0;
  const segments = projectHoursData.map((project, index) => {
    const percentage = (project.hours / totalHours) * 100;
    const startAngle = cumulativePercentage;
    cumulativePercentage += percentage;
    const endAngle = cumulativePercentage;
    
    // SVG Arc parameters
    const startX = 50 + 40 * Math.cos((startAngle / 100) * 2 * Math.PI - Math.PI/2);
    const startY = 50 + 40 * Math.sin((startAngle / 100) * 2 * Math.PI - Math.PI/2);
    const endX = 50 + 40 * Math.cos((endAngle / 100) * 2 * Math.PI - Math.PI/2);
    const endY = 50 + 40 * Math.sin((endAngle / 100) * 2 * Math.PI - Math.PI/2);
    
    // Arc flag is 0 for arcs less than 180 degrees, 1 for arcs greater than 180 degrees
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    // Path for the segment
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
            
            {/* Inner circle for donut effect */}
            <circle cx="50" cy="50" r="25" fill="#121f3a" />
            
            {/* Project count in the center - fixed to show correctly */}
            <text x="50" y="55" textAnchor="middle" fill="#f97316" fontSize="36" fontWeight="bold" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
              {projectCount}
            </text>
          </svg>
          
          {/* Overlay for hovered project name */}
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
                    <input
                      type="text"
                      value={entry.project}
                      className={styles.readOnlyInput}
                      readOnly
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.subject}
                      className={styles.readOnlyInput}
                      readOnly
                    />
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
                <td colSpan={2}>Total</td>
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

export default EmployeeTimesheet;