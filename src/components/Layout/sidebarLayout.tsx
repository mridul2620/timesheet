"use client";

import { type ReactNode, useState, useEffect } from "react";
import Sidebar from "../Sidebar/sidebar";
import styles from "./Layout.module.css";
import HomepageContent from "../homepage/homepage";
import ProfilePageContent from "../Profile/profile";
import PayrollPage from "../payroll/payroll";
import EmployeesPage from "../Employees/employees";

type User = {
  role: string;
};

export default function Layout({ children }: { children: ReactNode }) {
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

  const renderContent = () => {
    switch (currentPage) {
      case "home":
        return <HomepageContent />;
      case "profile":
        return <ProfilePageContent />;
      case "adminDashboard":
        return user?.role === "admin" ? <EmployeesPage /> : <HomepageContent />;
      case "payroll":
        return user?.role === "admin" ? <PayrollPage /> : <HomepageContent />;
      default:
        return <HomepageContent />;
    }
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
        {renderContent()}
      </main>
    </div>
  );
}
