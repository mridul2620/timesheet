"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, PoundSterling, Users, Menu, ClipboardList, LogOut } from "lucide-react";
import styles from "./Sidebar.module.css";

// Group menu items by section
const menuSections = [
  {
    heading: "Timesheet",
    items: [
      {
        path: "/home-page",
        name: "Homepage",
        icon: ClipboardList,
        component: "home",
      },
      {
        path: "/profile-page",
        name: "Profile",
        icon: User,
        component: "profile",
      },
    ]
  },
  {
    heading: "Manage",
    adminOnly: true,
    items: [
      {
        path: "/employees",
        name: "Employees",
        icon: Users,
        component: "adminDashboard",
      },
      {
        path: "/payroll",
        name: "Payroll",
        icon: PoundSterling,
        component: "payroll",
      },
    ]
  }
];

type User = {
  role: string;
};

export default function Sidebar({ onNavigate, isExpanded, setIsExpanded, activePage }: 
    { onNavigate: (page: string) => void, isExpanded: boolean, setIsExpanded: (val: boolean) => void, activePage: string }) {
  
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setUser(parsedData.user);
        }
      }
      
      // Find the current item and set the active component
      const allItems = menuSections.flatMap(section => section.items);
      const currentItem = allItems.find(item => item.path === pathname);
      if (currentItem) {
        onNavigate(currentItem.component);
      }
    }, [pathname, onNavigate]);

    const handleItemClick = (path: string, component: string) => {
      onNavigate(component);
      router.push(path);
    };

    const handleLogout = () => {
      localStorage.removeItem("loginResponse");
      //window.location.replace("/");
      window.location.href = "/";
    };

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
          {menuSections.map((section, index) => {
            // Skip admin sections for non-admin users
            if (section.adminOnly && user?.role !== "admin") {
              return null;
            }
            
            return (
              <div key={index} className={styles.section}>
                {isExpanded ? (
                  <h3 className={styles.sectionHeading}>{section.heading}</h3>
                ) : (
                  <div className={styles.sectionDivider}></div>
                )}
                
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.component;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleItemClick(item.path, item.component)}
                      className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                    >
                      <Icon size={20} />
                      {isExpanded && <span>{item.name}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        
        <div className={styles.sidebarFooter}>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            <LogOut size={20} />
            {isExpanded && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
}