import { useState, useEffect } from "react"
import styles from "./Calendar.module.css"

interface CalendarProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export default function Calendar({ selectedDate, onChange }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  const [userChangedMonth, setUserChangedMonth] = useState(false)

  useEffect(() => {
    if (!userChangedMonth) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
    return () => setUserChangedMonth(false);
  }, [selectedDate]);

  // Add mouse move effect handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const days = document.getElementsByClassName(styles.day);
      for (let i = 0; i < days.length; i++) {
        const day = days[i] as HTMLElement;
        const rect = day.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.sqrt(x * x + y * y);
        const intensity = Math.max(0, 1 - distance / 135); // Adjust fade effect range
  
        day.style.setProperty("--mouse-x", `${x + rect.width / 2}px`);
        day.style.setProperty("--mouse-y", `${y + rect.height / 2}px`);
        day.style.setProperty("--hover-opacity", intensity.toString());
      }
    };
  
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()

  // Calculate first day offset - Sunday is 0, Monday is 1, etc.
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
  // Add empty spaces for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.emptyDay} />)
  }

  // Create date buttons for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Create the exact date object for this day
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const isSelected = selectedDate.toDateString() === date.toDateString()
    const isToday = new Date().toDateString() === date.toDateString()

    days.push(
      <button
        key={day}
        onClick={() => {
          // Create a new Date with the exact date at midnight
          const exactDate = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day,
            0, 0, 0, 0
          );
          onChange(exactDate);
          setUserChangedMonth(false);
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