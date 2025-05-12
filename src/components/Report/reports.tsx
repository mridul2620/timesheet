"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./reports.module.css";
import Header from "../Header/header";
import Loader from "../Loader/loader";
import Calendar from "../Calender";
import { useRouter } from 'next/navigation';
import { Printer } from "lucide-react";

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
  status?: string;
}

interface WeekTimesheet {
    weekStart: Date;
    weekEnd: Date;
    timesheet: {
      entries: TimeEntry[];
      workDescription: string;
      dayStatus: { [key: string]: string };
    };
    weekDates: Date[];
  }

const ReportsPage = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [monthTimesheets, setMonthTimesheets] = useState<WeekTimesheet[]>([]);

  useEffect(() => {
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.success) {
        setUser(parsedData.user);
      }
    }
  }, []);

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
    fetchTimesheet();
  }, [selectedDate, user?.username]);

  const fetchTimesheet = async () => {
    if (!user?.username) return;
    setLoading(true);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${user.username}`
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
          setTimesheetStatus(relevantTimesheet.timesheetStatus || "unapproved");
        } else {
          setEntries([{
            project: "",
            subject: "",
            hours: {}
          }]);
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

        // Organize timesheets by weeks for the current month
        organizeMonthTimesheets(response.data.timesheets);
      }
    } catch (error) {
      console.error("Error fetching timesheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const organizeMonthTimesheets = (timesheets: any[]) => {
    // Get the current month and year from selected date
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    // Find the first day of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    
    // Find the last day of the month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Collect all weeks in the month
    const weeks: WeekTimesheet[] = [];
    let weekStart = new Date(firstDay);
    
    // Adjust to start from Monday if it's not already
    if (weekStart.getDay() !== 1) {
      const offset = weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1;
      weekStart.setDate(weekStart.getDate() - offset);
    }
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDates.push(date);
      }

      const weekTimesheet = timesheets.find((timesheet: any) => {
        return timesheet.entries.some((entry: any) => {
          return Object.keys(entry.hours || {}).some((date) => {
            const entryDate = new Date(date);
            return entryDate >= weekStart && entryDate <= weekEnd;
          });
        });
      });
      
      if (weekTimesheet) {
        weeks.push({
          weekStart: new Date(weekStart),
          weekEnd: new Date(weekEnd),
          timesheet: {
            entries: weekTimesheet.entries.map((entry: any) => ({
              project: entry.project || "",
              subject: entry.subject || "",
              hours: entry.hours || {}
            })),
            workDescription: weekTimesheet.workDescription || "",
            dayStatus: weekTimesheet.dayStatus || {}
          },
          weekDates
        });
      } else {
        const defaultDayStatus: { [key: string]: string } = {};
        weekDates.forEach((date: Date) => {
          const dayStr = date.toISOString().split("T")[0];
          const dayOfWeek = date.getDay();
          defaultDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
        });
        
        weeks.push({
          weekStart: new Date(weekStart),
          weekEnd: new Date(weekEnd),
          timesheet: {
            entries: [{
              project: "",
              subject: "",
              hours: {}
            }],
            workDescription: "",
            dayStatus: defaultDayStatus
          },
          weekDates
        });
      }
      
      // Move to next week
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    setMonthTimesheets(weeks);
  };

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

  // This is the modified handlePrint function with the copyright footer implementation
const handlePrint = () => {
  // Get the current month and year
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  // Determine first and last day of the month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  
  // Create a hidden iframe for printing
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);
  
  // Get current CSS to preserve styling
  const stylesheets = Array.from(document.styleSheets);
  let cssText = '';
  
  // Extract CSS from all stylesheets
  stylesheets.forEach(stylesheet => {
    try {
      const rules = stylesheet.cssRules || stylesheet.rules;
      for (let i = 0; i < rules.length; i++) {
        cssText += rules[i].cssText + '\n';
      }
    } catch (e) {
      // Some stylesheets might be from different origins and can't be accessed
      console.log('Could not access stylesheet', e);
    }
  });
  
  // Start building print document
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Monthly Timesheet Report - ${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDate)}</title>
      <style>
        ${cssText}
        
        /* Print-specific styles */
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
        
        body {
          font-family: "Inter", sans-serif;
          background-color: #0c1e35;
          color: #fff;
          padding: 1cm;
        }
        
        .page {
          page-break-after: always;
          margin-bottom: 3cm; /* Extra space for footer */
          position: relative;
          padding-bottom: 2cm;
        }
        
        .page-header {
          text-align: center;
          font-size: 18px;
          margin-bottom: 0.5cm;
          font-weight: bold;
        }
        
        .user-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1cm;
          padding: 0.5cm;
          background-color: #1a2b4a;
          border-radius: 5px;
        }
        
        .info-item {
          font-size: 14px;
        }
        
        .info-label {
          font-weight: bold;
          margin-right: 0.5cm;
        }
        
        /* Make table rows consistent height */
        .${styles.table} td {
          padding: 10px;
          height: 20px;
        }
        
        /* Make sure content fits on one page */
        .${styles.tableContainer} {
          width: 100%;
          margin: 0;
          overflow: visible;
        }
        
        /* Remove extra padding */
        .${styles.container} {
          padding: 0;
        }
        
        /* Footer styles */
        .footer {
          position: fixed;
          bottom: 1cm;
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 12px;
          color: #333;
        }
        
        .copyright {
          font-size: 12px;
          margin-bottom: 4px;
          font-weight: 400;
        }
        
        .confidential {
          font-size: 12px;
          font-style: italic;
        }
        
        /* Hide calendar section */
        .calendar-section {
          display: none;
        }
      </style>
    </head>
    <body>
  `;
  
  // Function to generate a week table
  const generateWeekTable = (startDate: Date) => {
    // Calculate week dates
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDays.push(date);
    }
    
    // Find timesheet for this week
    const weekStart = weekDays[0].toISOString().split('T')[0];
    const weekEnd = weekDays[6].toISOString().split('T')[0];
    
    const relevantTimesheet = monthTimesheets.find(week => {
      const weekStartDate = week.weekStart.toISOString().split('T')[0];
      return weekStartDate === weekStart;
    });
    
    if (!relevantTimesheet) return '';
    
    const weekTimesheet = relevantTimesheet.timesheet;
    const weekEntries = weekTimesheet.entries;
    const weekDescription = weekTimesheet.workDescription;
    const weekDayStatus = weekTimesheet.dayStatus;
    
    // Calculate total hours for the week
    const totalHours = weekEntries.reduce((total: number, entry: TimeEntry) => {
      const entryTotal = Object.values(entry.hours || {}).reduce((sum: number, hours: string) => {
        return sum + Number.parseFloat(hours || "0");
      }, 0);
      return total + entryTotal;
    }, 0);
    
    // Format week header
    const weekHeader = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDays[0])} - ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDays[6])}`;
    
    // Generate table HTML
    let tableHTML = `
      <div class="page">
        <div class="page-header">Weekly Timesheet: ${weekHeader}</div>
        
        <div class="user-info">
          <div class="info-item">
            <span class="info-label">Name:</span>
            <span>${user?.name || user?.username || "Employee"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Hours:</span>
            <span>${totalHours.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="${styles.tableContainer}">
          <table class="${styles.table}">
            <thead>
              <tr>
                <th>Projects</th>
                <th>Subject</th>
                ${weekDays.map((date: Date) => `
                  <th>${formatDate(date)}</th>
                `).join('')}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Add project entries
    weekEntries.forEach((entry: TimeEntry) => {
      const rowTotal = Object.values(entry.hours || {}).reduce((total: number, hours: string) => {
        return total + Number.parseFloat(hours || "0");
      }, 0);
      
      tableHTML += `
        <tr>
          <td>${entry.project || ""}</td>
          <td>${entry.subject || ""}</td>
          ${weekDays.map((date: Date) => {
            const dayStr = date.toISOString().split('T')[0];
            const hours = entry.hours?.[dayStr] || "";
            return `
              <td>
                <div class="${styles.readOnlyHourInput}">${hours}</div>
              </td>
            `;
          }).join('')}
          <td class="${styles.totalCell}">${rowTotal.toFixed(2)}</td>
        </tr>
      `;
    });
    
    // Add total row
    tableHTML += `
      <tr class="${styles.totalRow}">
        <td colspan="2">Total</td>
        ${weekDays.map((date: Date) => {
          const dayStr = date.toISOString().split('T')[0];
          const dayTotal = weekEntries.reduce((total: number, entry: TimeEntry) => {
            const hours = Number.parseFloat(entry.hours?.[dayStr] || "0");
            return total + hours;
          }, 0);
          
          return `<td class="${styles.totalCell}">${dayTotal.toFixed(2)}</td>`;
        }).join('')}
        
        <td class="${styles.totalCell}">${totalHours.toFixed(2)}</td>
      </tr>
    `;
    
    // Add status row
    tableHTML += `
      <tr class="${styles.statusRow}">
        <td colspan="2">Status</td>
        ${weekDays.map((date: Date) => {
          const dayStr = date.toISOString().split('T')[0];
          const status = weekDayStatus?.[dayStr] || 
            (date.getDay() === 0 || date.getDay() === 6 ? "holiday" : "working");
          
          return `
            <td>
              <div class="${styles.readOnlyInput}">${status}</div>
            </td>
          `;
        }).join('')}
        <td></td>
      </tr>
    `;
    
    // Close table and add description
    tableHTML += `
            </tbody>
          </table>
          
          <div class="${styles.descriptionContainer}">
            <h3 class="${styles.descriptionHeading}">Work Description</h3>
            <div class="${styles.descriptionTextarea}">${weekDescription || ""}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="copyright">© Chartsign ${new Date().getFullYear()}</div>
          <div class="confidential">This document is confidential and intended for authorized use only. All rights reserved</div>
        </div>
      </div>
    `;
    
    return tableHTML;
  };
  
  // Generate all weeks in the month
  let currentDate = new Date(firstDay);
  // Go back to the Monday before or on the first day of month
  if (currentDate.getDay() !== 1) { // If not Monday
    currentDate.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
  }
  
  // Loop through weeks until past end of month
  while (currentDate <= lastDay) {
    printContent += generateWeekTable(currentDate);
    // Move to next Monday
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  // Finish print content
  printContent += `
    </body>
    </html>
  `;
  
  // Write to iframe and print
  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(printContent);
    frameDoc.close();
    
    // Use timeout to ensure content is fully loaded
    setTimeout(() => {
      try {
        printFrame.contentWindow?.print();
        // Remove the iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 500);
      } catch (error) {
        console.error('Printing failed', error);
        document.body.removeChild(printFrame);
      }
    }, 500);
  }
};

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <Header 
        title="Reports" 
        user={user}
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
          <div className={styles.actionContainer}>
            <button 
              className={styles.printButton}
              onClick={handlePrint}
            >
              <Printer className={styles.printIcon} size={18} />
              Print Monthly Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;