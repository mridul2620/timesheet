"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
  designation: string;
  active: boolean;
  username: string;
}

const EmployeesPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_API_URL as string);
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
      
      // Get current logged in user
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setUser(parsedData.user);
        }
      }
    };

    fetchUsers();
  }, []);

  const getInitials = (name: string = "") => {
    if (!name) return "";
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    return words
      .map(word => word[0]?.toUpperCase() || "")
      .join("");
  };

  const handleDelete = async (id: string) => {
    try {
      setUsers(users.filter((user) => user._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const navigateToTimesheet = (username: string) => {
    router.push(`/timesheets/${username}`);
  };
  
  if (loading) return <Loader />;

  return (
    <div className={styles.pagecontainer}>
      <Header title="Employees" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div>
            <span className={styles.title}>Team</span>
            <span className={styles.userCount}>({users.length} users)</span>
          </div>
          <button className={styles.inviteButton}>
            <Plus size={16} />
            Add User
          </button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email address</th>
              <th>Designation</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  <div 
                    className={styles.avatarContainer}
                    onClick={() => navigateToTimesheet(user.username)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.avatar}>
                      {getInitials(user?.name)}
                    </div>
                    <div className={styles.nameContainer}>
                      <span>{user?.name}</span>
                      <span className={styles.username}>@{user?.username}</span>
                    </div>
                  </div>
                </td>
                <td>{user?.email}</td>
                <td>{user?.designation}</td>
                <td>{user?.active ? 'Active' : 'Non-active'}</td>
                <td>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(user._id)}
                    aria-label="Delete user"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default EmployeesPage;