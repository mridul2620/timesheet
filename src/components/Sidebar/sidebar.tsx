"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, User, BriefcaseBusiness, PoundSterling, Users, Menu, ClipboardList, ClipboardCheck, LogOut, House, BookOpenText, ClipboardPlus, Palmtree} from "lucide-react";
import styles from "./Sidebar.module.css";

const menuSections = [
  {
    heading: "Timesheet",
    items: [
      {
        path: "/home-page",
        name: "Homepage",
        icon: House,
        component: "home",
      },
      {
        path: "/profile-page",
        name: "Profile",
        icon: User,
        component: "profile",
      },
      {
        path: "/holiday",
        name: "Holiday",
        icon: Palmtree,
        component: "holiday",
      },
      {
        path: "/report",
        name: "Reports",
        icon: ClipboardPlus,
        component: "report",
      },
    ]
  },
  {
    heading: "Manage",
    adminOnly: true,
    items: [
      {
        path: "/employees",
        name: "Worker",
        icon: Users,
        component: "adminDashboard",
      },
      {
        path: "/timesheet",
        name: "Timesheet",
        icon: CalendarClock,
        component: "timesheet",
      },
      {
        path: "/payroll",
        name: "Payroll",
        icon: PoundSterling,
        component: "payroll",
      },
      {
        path: "/approvals",
        name: "Approvals",
        icon: ClipboardCheck,
        component: "adminDashboard",
      },
      {
        path: "/clients",
        name: "Clients",
        icon: BriefcaseBusiness,
        component: "client",
      },
      {
        path: "/projects",
        name: "Projects",
        icon: ClipboardList,
        component: "project",
      },
      {
        path: "/subjects",
        name: "Subjects",
        icon: BookOpenText,
        component: "subject",
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
        try {
          const parsedData = JSON.parse(storedData);
          if (parsedData.success) {
            setUser(parsedData.user);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
      
      // Find the current item and set the active component
      const allItems = menuSections.flatMap(section => section.items);
      const currentItem = allItems.find(item => item.path === pathname);
      if (currentItem) {
        onNavigate(currentItem.component);
      }
    }, [pathname, onNavigate]);

    // Using useCallback to memoize the navigation handler
    const handleItemClick = useCallback((path: string, component: string, e: React.MouseEvent) => {
      // Prevent default and stop propagation to ensure the click isn't interfered with
      e.preventDefault();
      e.stopPropagation();
      
      // Directly update the window location to ensure navigation works
      // This is a more direct approach than using the router
      window.location.href = path;
      
      // Also call onNavigate for component state
      onNavigate(component);
    }, [onNavigate]);

    const handleLogout = useCallback((e: React.MouseEvent) => {
      // Prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Clear localStorage data
      localStorage.removeItem("loginResponse");
      // Set a flag to indicate logged out state
      sessionStorage.setItem("isLoggedOut", "true");
      
      // Use window.location for a full page reload to the login page
      window.location.href = "/";
    }, []);

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
                    <a
                      key={item.path}
                      href={item.path}
                      className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                      onClick={(e) => handleItemClick(item.path, item.component, e)}
                    >
                      <Icon size={20} />
                      {isExpanded && <span>{item.name}</span>}
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
        
        <div className={styles.sidebarFooter}>
          <a
            href="/"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {isExpanded && <span>Logout</span>}
          </a>
        </div>
      </div>
    );
}