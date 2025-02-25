"use client"
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"
import { User, LogOut } from "lucide-react"
import styles from "./profile.module.css"

export default function ProfilePageContent() {
  const router = useRouter()
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const [user, setUser] = useState<{
          name: string;
          username: string;
          email: string;
          role: string;
          designation: string;
        } | null>(null);
  
        useEffect(() => {
          const storedData = localStorage.getItem("loginResponse");
      
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData.success) {
              setUser(parsedData.user);
            }
          }
        }, []);

  const handleLogout = () => {
    router.push("/")
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcome}>Welcome, {user?.name}</h1>
          <p className={styles.date}>{currentDate}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <LogOut className={styles.logoutIcon} />
        </button>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            <div className={styles.avatarContainer}>
              <User className={styles.avatarIcon} />
            </div>
            <div>
              <h2 className={styles.name}>{user?.name}</h2>
              <p className={styles.email}>{user?.email}</p>
            </div>
          </div>
          <button className={styles.editButton}>Edit</button>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input type="text" placeholder="Your Full Name" className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" placeholder="Your Email Address" className={styles.input} />
          </div>

          <div className={styles.emailSection}>
            <h3>My email Address</h3>
            <div className={styles.emailItem}>
              <div className={styles.emailIcon}>
                <User size={16} />
              </div>
              <div className={styles.emailDetails}>
                <p>{user?.email}</p>
                <span>1 month ago</span>
              </div>
            </div>
            <button className={styles.addEmailButton}>+ Add Email Address</button>
          </div>
        </div>
      </div>
    </div>
  )
}

