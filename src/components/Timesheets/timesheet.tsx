"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
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

  useEffect(() => {
    const fetchTimesheet = async () => {
      if (!username) return;
      setLoading(true);

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`
        );

        if (response.data.success) {
          // Using the same approach as homepage.tsx to find relevant timesheet
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
          } else {
            // Set empty timesheet
            setEntries([{
              project: "",
              subject: "",
              hours: {}
            }]);
            setWorkDescription("");
            
            // Set default day status
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
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimesheet;