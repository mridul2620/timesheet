"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Clock, Menu, User } from "lucide-react"
import styles from "./Sidebar.module.css"

const menuItems = [
  {
    path: "/home-page",
    name: "Homepage",
    icon: LayoutDashboard,
    component: "home",
  },
  {
    path: "/profile-page",
    name: "Profile",
    icon: User,
    component: "profile",
  },
]

export default function Sidebar({ onNavigate, isExpanded, setIsExpanded, activePage }: 
    { onNavigate: (page: string) => void, isExpanded: boolean, setIsExpanded: (val: boolean) => void, activePage: string }) {
    
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
              <img src="/logo.png?height=40&width=10" alt="Logo" className={styles.logo} />
              <h1 className={styles.title}>Chartsign</h1>
            </div>
          ) : (
            <Menu size={20} className={styles.menuIcon} />
          )}
        </div>
  
        <nav className={styles.navigation}>
        {menuItems.map((item) => {
  const Icon = item.icon;
  return (
    <button
      key={item.path}
      onClick={() => onNavigate(item.component)}
      className={`${styles.navItem} ${activePage === item.component ? styles.active : ""}`}
    >
      <Icon size={20} />
      {isExpanded && <span>{item.name}</span>}
    </button>
  );
})}
        </nav>
      </div>
    )
  }
