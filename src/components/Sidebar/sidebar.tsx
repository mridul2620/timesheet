"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, PoundSterling, Users, Menu } from "lucide-react";
import styles from "./Sidebar.module.css";

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
];

const adminMenuItems = [
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
      
      const currentItem = [...menuItems, ...adminMenuItems].find(item => item.path === pathname);
      if (currentItem) {
        onNavigate(currentItem.component);
      }
    }, [pathname, onNavigate]);

    const handleItemClick = (path: string, component: string) => {
      onNavigate(component);
      router.push(path);
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
          {menuItems.map((item) => {
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
          {user?.role === "admin" && adminMenuItems.map((item) => {
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
        </nav>
      </div>
    );
}