"use client";

import { type ReactNode, useState, useEffect } from "react";
import styles from "./Layout.module.css";
import Sidebar from "../Sidebar/sidebar";

type User = {
  role: string;
};

export default function MainLayout({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState("home");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <div className={styles.layout}>
      <Sidebar 
        onNavigate={handleNavigation} 
        isExpanded={isSidebarExpanded} 
        setIsExpanded={setIsSidebarExpanded} 
        activePage={currentPage}
      />
      <main className={`${styles.main} ${isSidebarExpanded ? styles.expanded : styles.collapsed}`}>
        {children}
      </main>
    </div>
  );
}