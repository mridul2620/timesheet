import { useState, useEffect } from "react"
import styles from "./Calendar.module.css"

interface CalendarProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export default function Calendar({ selectedDate, onChange }: CalendarProps) {
  // Initialize currentMonth based on selectedDate
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  
  // This flag tracks when a user manually changes months
  const [userChangedMonth, setUserChangedMonth] = useState(false)

  // Only update currentMonth when selectedDate changes AND user hasn't manually changed months
  useEffect(() => {
    if (!userChangedMonth) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
    // Reset the flag when the effect runs
    return () => setUserChangedMonth(false);
  }, [selectedDate]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.emptyDay} />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const isSelected = selectedDate.toDateString() === date.toDateString()
    const isToday = new Date().toDateString() === date.toDateString()

    days.push(
      <button
        key={day}
        onClick={() => {
          onChange(date)
          // Clear the flag when a date is selected
          setUserChangedMonth(false)
        }}
        className={`${styles.day} ${isSelected ? styles.selected : ""} ${isToday ? styles.today : ""}`}
      >
        {day}
      </button>,
    )
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    setUserChangedMonth(true)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    setUserChangedMonth(true)
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={previousMonth} className={styles.navButton}>
          &lt;
        </button>
        <div className={styles.monthYear}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button onClick={nextMonth} className={styles.navButton}>
          &gt;
        </button>
      </div>
      <div className={styles.weekdays}>
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      <div className={styles.days}>{days}</div>
    </div>
  )
}