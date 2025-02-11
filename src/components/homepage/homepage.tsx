// src/components/homepage/homepageContent.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons"; 
import { useRouter } from 'next/navigation'; 
import { ChevronLeft, ChevronRight, Plus, Copy, Save, Trash2 } from "lucide-react"
import styles from "./homepage.module.css"
import DatePicker from "react-datepicker";
import Calendar from "../Calender"
import "react-datepicker/dist/react-datepicker.css";
import Loader from "../Loader";

type TimeEntry = {
  id: string
  project: string
  subject: string
  hours: { [key: string]: string }
  
}
  
  const HomepageContent: React.FC = () => {
      const [entries, setEntries] = useState<TimeEntry[]>([
        {
          id: "1",
          project: "",
          subject: "",
          hours: {},
        },
      ])


      const [user, setUser] = useState<{
        name: string;
        username: string;
        email: string;
        role: string;
        designation: string;
      } | null>(null);

      useEffect(() => {
        // Retrieve user data from localStorage
        const storedData = localStorage.getItem("loginResponse");
    
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.success) {
            setUser(parsedData.user); // Set user details
          }
        }
      }, []);

      const [selectedDate, setSelectedDate] = useState(new Date());

      const [workDescription, setWorkDescription] = useState("")

      const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({})

  const getWeekDates = (date: Date) => {
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1); // Monday
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
    return weekDates;
  };

    const weekDates = getWeekDates(selectedDate);
    
      const getCurrentWeekDates = () => {
        const now = new Date()
        const currentDay = now.getDay()
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
        const monday = new Date(now.setDate(diff))
    
        const weekDates = []
        for (let i = 0; i < 7; i++) {
          const date = new Date(monday)
          date.setDate(monday.getDate() + i)
          weekDates.push(date)
        }
        return weekDates
      }
    
      const formatDate = (date: Date) => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
      }
    
      const handleInputChange = (entryId: string, day: string, value: string) => {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  hours: {
                    ...entry.hours,
                    [day]: value,
                  },
                }
              : entry,
          ),
        )
      }

      const [projects, setProjects] = useState<{ _id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsResponse = await axios.get(process.env.NEXT_PUBLIC_PROJECTS_API as string);
        const subjectsResponse = await axios.get(process.env.NEXT_PUBLIC_SUBJECTS_API as string);

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

  if (loading) return <Loader />;
    
     
    
      const addNewRow = () => {
        setEntries((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            project: "",
            subject: "",
            hours: {},
          },
        ])
      }
    
      const calculateDayTotal = (date: Date) => {
        const dayStr = date.toISOString().split("T")[0]
        return entries.reduce((total, entry) => {
          const hours = Number.parseFloat(entry.hours[dayStr] || "0")
          return total + hours
        }, 0)
      }
    
      const calculateRowTotal = (entry: TimeEntry) => {
        return Object.values(entry.hours).reduce((total, hours) => {
          return total + Number.parseFloat(hours || "0")
        }, 0)
      }
    
      const calculateWeekTotal = () => {
        return entries.reduce((total, entry) => {
          return total + calculateRowTotal(entry)
        }, 0)
      }

      const deleteRow = (entryId: string) => {
        setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      }

      const handleStatusChange = (day: string, value: string) => {
        setDayStatus((prev) => ({
          ...prev,
          [day]: value,
        }))
      }

      const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorkDescription(e.target.value)
  }
    
  const handleSubmit = async () => {
    try {
        // Validate required data
        if (!user?.username) {
            alert("User information is missing");
            return;
        }

        // Validate that at least one entry has data
        const hasEntries = entries.some(entry => Object.values(entry.hours).some(h => h !== ""));
        if (!hasEntries) {
            alert("Please add at least one time entry");
            return;
        }

        const timesheetData = {
            username: user.username,
            weekStartDate: selectedDate.toISOString().split("T")[0],
            entries: entries.filter(entry => Object.values(entry.hours).some(h => h !== "")), // Only send entries with hours
            workDescription,
            dayStatus
        };

        console.log("Submitting timesheet data:", timesheetData); // Debug log

        const response = await axios.post(process.env.NEXT_PUBLIC_SUBMIT_API as string, timesheetData);
        
        if (response.data.message === "Timesheet submitted successfully") {
            alert("Timesheet submitted successfully!");
            // Optionally reset the form or redirect
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

    
      return (
        <div className={styles.container}>
          <header className={styles.header}>
          <div className={styles.headerContent}>
          <h1 className={styles.logo}>Timesheet</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userRole}>{user?.designation}</span>
          </div>
        </div>
          </header>
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
                    <select className={styles.select}>
        <option value="">Select</option>
        {projects.length > 0 ? (
          projects.map((project) => (
            <option key={project._id} value={project.name}>
              {project.name}
            </option>
          ))
        ) : (
          <option disabled>No projects available</option>
        )}
      </select>
                    </td>
                    <td>
                    <select className={styles.select}>
        <option value="">Select</option>
        {subjects.length > 0 ? (
          subjects.map((subject) => (
            <option key={subject._id} value={subject.name}>
              {subject.name}
            </option>
          ))
        ) : (
          <option disabled>No subjects available</option>
        )}
      </select>
                    </td>
                    {weekDates.map((date) => {
                      const dayStr = date.toISOString().split("T")[0]
                      return (
                        <td key={dayStr}>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entry.hours[dayStr] || ""}
                            onChange={(e) => handleInputChange(entry.id, dayStr, e.target.value)}
                            className={styles.hourInput}
                          />
                        </td>
                      )
                    })}
                    <td className={styles.totalCell}>{calculateRowTotal(entry).toFixed(2)}</td>
                    <td>
                      <button onClick={() => deleteRow(entry.id)} className={styles.deleteButton} title="Delete row">
                      <Trash2 className={styles.buttonIcon} />
                      </button>
                     </td>
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td>
                  <button onClick={addNewRow} className={styles.button}>
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
                const dayStr = date.toISOString().split("T")[0]
                const dayOfWeek = date.getDay()
                const defaultStatus = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working"

                return (
                  <td key={dayStr}>
                    <select
                      value={dayStatus[dayStr] || defaultStatus}
                      onChange={(e) => handleStatusChange(dayStr, e.target.value)}
                      className={styles.select}
                    >
                      <option value="working">Working</option>
                      <option value="holiday">Holiday</option>
                      <option value="sick">Sick</option>
                      <option value="bank-holiday">Bank Holiday</option>
                    </select>
                  </td>
                )
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
            onChange={handleDescriptionChange}
            placeholder="Please provide a description of the work you've done this week..."
            rows={2}
          />
        </div>
        <div className={styles.submitWrapper}>
          <button className={styles.submitButton} onClick={handleSubmit}>Submit for approval</button>
        </div>
        </div>
        </div>
      )
    }
  
  export default HomepageContent;