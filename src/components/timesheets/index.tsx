import React, { useState, useEffect } from "react";
import styles from "./index.module.css";

type User = {
    name: string;
    username: string;
    email: string;
    designation: string;
  };

const TimesheetsPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.success) {
        setUser(parsedData.user);
      }
    }
  }, []);

    return (
        <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.heading}>Timesheet Approvals</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userRole}>{user?.designation}</span>
          </div>
        </div>
      </header>
      </div>
    );
};

export default TimesheetsPage;