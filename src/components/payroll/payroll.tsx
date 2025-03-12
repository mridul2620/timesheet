"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
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
  role?: string;
  payrate?: number;
}


const PayrollPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const sortUsersByName = (userArray: User[]): User[] => {
    return [...userArray].sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL as string);
      const data = await response.json();
      if (data.success) {
        const sortedUsers = sortUsersByName(data.users);
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
    
    const storedData = localStorage.getItem("loginResponse");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.success) {
        setUser(parsedData.user);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = users.filter(
        user => 
          user.name.toLowerCase().includes(term) || 
          user.username.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getInitials = (name: string = "") => {
    if (!name) return "";
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    return words
      .map(word => word[0]?.toUpperCase() || "")
      .join("");
  };
  
  if (loading) return <Loader message="Loading Users..." />;

  return (
    <div className={styles.pagecontainer}>
      <Header title="Payroll" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div>
            <span className={styles.title}>Team</span>
            <span className={styles.userCount}>({filteredUsers.length} users)</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name or username"
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email address</th>
              <th>Job Title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div 
                      className={styles.avatarContainer}
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.noResults}>
                  No users found matching search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
  </div>
  );
};

export default PayrollPage;