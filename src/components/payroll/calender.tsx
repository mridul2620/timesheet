import { useState, useEffect } from "react"
import styles from "./calender.module.css"

interface CalendarProps {
  selectedDate: Date;
  endDate: Date | null;
  onChange: (date: Date) => void;
  isDateRange: boolean;
}

export default function Calendar({ selectedDate, endDate, onChange, isDateRange }: CalendarProps) {
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const days = document.getElementsByClassName(styles.day);
      for (let i = 0; i < days.length; i++) {
        const day = days[i] as HTMLElement;
        const rect = day.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.sqrt(x * x + y * y);
        const intensity = Math.max(0, 1 - distance / 150); // Adjust fade effect range
  
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
  

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Check if a date is within the selected range
  const isInRange = (date: Date) => {
    if (!isDateRange || !endDate) return false;
    
    const checkDate = date.getTime();
    const start = new Date(selectedDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    
    return checkDate > start && checkDate < end;
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const isSelected = selectedDate.toDateString() === date.toDateString();
    const isEndDate = endDate && endDate.toDateString() === date.toDateString();
    const isInSelectedRange = isInRange(date);
    const isToday = new Date().toDateString() === date.toDateString();

    days.push(
      <button
        key={day}
        onClick={() => {
          onChange(date);
          setUserChangedMonth(false);
        }}
        className={`
          ${styles.day} 
          ${isSelected ? styles.selected : ""} 
          ${isEndDate ? styles.endDate : ""}
          ${isInSelectedRange ? styles.inRange : ""}
          ${isToday ? styles.today : ""}
        `}
      >
        {day}
      </button>
    );
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setUserChangedMonth(true);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setUserChangedMonth(true);
  };

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
  );
}