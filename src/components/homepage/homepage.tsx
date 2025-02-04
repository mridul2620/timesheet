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

      const [selectedDate, setSelectedDate] = useState(new Date());

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
    
      // Get current week's dates
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
    
      //const weekDates = getCurrentWeekDates()
    
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
    
      const handleProjectChange = (entryId: string, field: "project" | "subject", value: string) => {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  [field]: value,
                }
              : entry,
          ),
        )
      }
    
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
    
    
      return (
        <div className={styles.container}>
          <header className={styles.header}>
          <div className={styles.headerContent}>
          <h1 className={styles.logo}>TimeTrack</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>John Doe</span>
            <span className={styles.userRole}>Manager</span>
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
                      <select
                        value={entry.project}
                        onChange={(e) => handleProjectChange(entry.id, "project", e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Select project</option>
                        <option value="Project X">Project X</option>
                        <option value="Office">Office</option>
                        <option value="Vacation">Vacation</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={entry.subject}
                        onChange={(e) => handleProjectChange(entry.id, "subject", e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Select subject</option>
                        <option value="Development">Development</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Planning">Planning</option>
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
              </tbody>
            </table>
        </div>
        <div className={styles.submitWrapper}>
          <button className={styles.submitButton}>Submit for approval</button>
        </div>
        </div>
        </div>
      )
    }
  
  export default HomepageContent;