"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";
import { useRouter } from 'next/navigation';
import PayrollCalculator from "./payrollCalculator";

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('');
  const [lastSelectedUsername, setLastSelectedUsername] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_GET_TIMESHEET_API) {
      // Environment variables are set
    }
  }, []);

  const sortUsersByName = (userArray: User[]): User[] => {
    return [...userArray].sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const fetchUsers = async () => {
    setApiStatus('Fetching users...');
    try {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error('API URL environment variable is not set');
      }
      
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const usersWithData = data.users.map((user: User) => ({
          ...user,
          payrate: user.payrate !== undefined ? user.payrate : 0
        }));
        
        const sortedUsers = sortUsersByName(usersWithData);
        
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
        setApiStatus('Users loaded successfully');
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      setApiStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
    
    // Get logged in user
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setUser(parsedData.user);
        }
      }
    } catch (error) {
      // Error parsing stored login data
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
          (user.username && user.username.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSelectUser = (user: User) => {
    if (lastSelectedUsername === user.username && selectedUser) {
      // Just updating the user state
      const updatedUser = { ...user };
      setSelectedUser(updatedUser);
    } else {
      // New user selection
      setSelectedUser(user);
      setLastSelectedUsername(user.username);
    }
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
        
      {/* Payroll Calculator Section */}
      <PayrollCalculator 
        users={users} 
        selectedUser={selectedUser} 
        onSelectUser={handleSelectUser} 
      />
        
      {/* Team Section */}
      <div className={styles.container}>
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

        <div className={styles.tableContainer}>
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
              filteredUsers.map((userItem) => (
                <tr 
                  key={userItem._id} 
                  onClick={() => handleSelectUser(userItem)}
                  className={selectedUser?._id === userItem._id ? styles.selectedRow : styles.tableRow}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className={styles.avatarContainer}>
                      <div className={styles.avatar}>
                        {getInitials(userItem?.name)}
                      </div>
                      <div className={styles.nameContainer}>
                        <span>{userItem?.name}</span>
                        <span className={styles.username}>@{userItem?.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>{userItem?.email}</td>
                  <td>{userItem?.designation}</td>
                  <td>{userItem?.active ? 'Active' : 'Non-active'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.noResults}>
                  {loading ? 'Loading users...' : 'No users found matching search criteria'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;