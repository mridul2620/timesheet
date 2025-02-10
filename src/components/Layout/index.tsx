"use client"

import { type ReactNode, useState } from "react"
import Sidebar from "../Sidebar"
import styles from "./Layout.module.css"
import HomepageContent from "../homepage/homepage"
import ProfilePageContent from "../Profile"

export default function Layout({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState("home")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  const handleNavigation = (page: string) => {
    setCurrentPage(page)
  }

  const renderContent = () => {
    switch (currentPage) {
      case "home":
        return <HomepageContent />
      case "profile":
        return <ProfilePageContent />
      default:
        return <HomepageContent />
    }
  }

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
  )
}
