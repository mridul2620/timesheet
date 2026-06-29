"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { Menu } from "lucide-react";
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
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setUser(parsedData.user);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Fix for event propagation issues
    const fixEventPropagation = () => {
      // Global event handler to ensure clicks aren't prevented
      document.addEventListener('click', function(e) {
        // Just let all clicks happen naturally
        return true;
      }, true);
    };

    fixEventPropagation();
  }, []);

  const handleNavigation = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className={styles.layout}>
      {isSidebarExpanded && (
        <div 
          className={styles.backdrop} 
          onClick={() => setIsSidebarExpanded(false)} 
        />
      )}
      <div className={styles.mobileHeader}>
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>
        <div className={styles.mobileLogoWrapper}>
          <img src="/logo.png?height=32&width=32" alt="Logo" className={styles.mobileLogo} />
          <span className={styles.mobileTitle}>Chartsign</span>
        </div>
      </div>
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