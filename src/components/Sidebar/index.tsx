"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Clock, Menu } from "lucide-react"
import styles from "./Sidebar.module.css"

const menuItems = [
  {
    path: "/home-page",
    name: "Homepage",
    icon: LayoutDashboard,
    component: "home",
  },
  {
    path: "/time-sheet",
    name: "Timesheet",
    icon: Clock,
    component: "timesheet",
  },
]

export default function Sidebar({ onNavigate, isExpanded, setIsExpanded }: 
    { onNavigate: (page: string) => void, isExpanded: boolean, setIsExpanded: (val: boolean) => void }) {
    
    const pathname = usePathname()
  
    return (
      <div 
        className={`${styles.sidebar} ${isExpanded ? styles.expanded : ""}`} 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className={styles.sidebarHeader}>
          {isExpanded ? (
            <div className={styles.logoWrapper}>
              <img src="/placeholder.svg?height=40&width=40" alt="Logo" className={styles.logo} />
              <h1 className={styles.title}>TimeTrack</h1>
            </div>
          ) : (
            <Menu size={20} className={styles.menuIcon} />
          )}
        </div>
  
        <nav className={styles.navigation}>
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.component)}
                className={`${styles.navItem} ${pathname === item.path ? styles.active : ""}`}
              >
                <Icon size={20} />
                {isExpanded && <span>{item.name}</span>}
              </button>
            )
          })}
        </nav>
      </div>
    )
  }
