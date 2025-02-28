"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X } from "lucide-react";
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

interface NewUser {
  username: string;
  email: string;
  name: string;
  role: string;
  payrate: string;
  designation: string;
  password: string;
}

const initialNewUser: NewUser = {
  username: "",
  email: "",
  name: "",
  role: "user",
  payrate: "",
  designation: "",
  password: "",
};

const EmployeesPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>(initialNewUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const getInitials = (name: string = "") => {
    if (!name) return "";
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    return words
      .map(word => word[0]?.toUpperCase() || "")
      .join("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setNewUser(initialNewUser);
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const validateForm = () => {
    if (!newUser.username || !newUser.email || !newUser.name || !newUser.role || 
        !newUser.payrate || !newUser.designation || !newUser.password) {
      setErrorMessage("All fields are required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      setErrorMessage("Please enter a valid email address");
      return false;
    }

    if (isNaN(parseFloat(newUser.payrate))) {
      setErrorMessage("Pay rate must be a valid number");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ADD_USER_API as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchUsers();
        handleCloseDialog();
      } else {
        setErrorMessage(data.message || "Error adding user");
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (username: string, id: string) => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_DELETE_USER_API as string, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        setUsers(users.filter((user) => user._id !== id));
      } else {
        console.error('Failed to delete user');
      }
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
          <button className={styles.inviteButton} onClick={handleOpenDialog}>
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
                    onClick={() => handleDelete(user.username, user._id)}
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

      {isDialogOpen && (
      <div className={styles.dialogBackdrop} onClick={(e) => {
      if (e.target === e.currentTarget) handleCloseDialog();
   }}>
    <div className={styles.dialog}>
      <div className={styles.dialogHeader}>
        <h2>Add New User</h2>
        <button 
          className={styles.closeButton} 
          onClick={handleCloseDialog} 
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
      
      {isSubmitting ? (
        <div className={styles.loaderContainer}>
          <Loader />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMessage && (
            <div className={styles.errorMessage}>{errorMessage}</div>
          )}
          
          <div className={styles.formLayout}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                placeholder="johndoe123"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="designation">Designation</label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={newUser.designation}
                onChange={handleInputChange}
                placeholder="Developer"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="payrate">Pay Rate (£/hour)</label>
              <input
                type="text"
                id="payrate"
                name="payrate"
                value={newUser.payrate}
                onChange={handleInputChange}
                placeholder="20.00"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                placeholder="Enter password"
              />
            </div>
            
            <button type="submit" className={styles.submitButton}>
              Add User
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
  )}
  </div>
  );
};

export default EmployeesPage;