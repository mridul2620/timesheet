"use client";
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import styles from "./employee.module.css";
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

interface EditUser {
  username: string;
  newUsername?: string;
  email?: string;
  name?: string;
  role?: string;
  payrate?: string;
  designation?: string;
  active?: boolean;
}

interface DeleteConfirmation {
  show: boolean;
  username: string;
  userId: string;
  userName: string;
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

const initialEditUser: EditUser = {
  username: "",
  newUsername: "",
  email: "",
  name: "",
  role: "",
  payrate: "",
  designation: "",
  active: true,
};

const initialDeleteConfirmation: DeleteConfirmation = {
  show: false,
  username: "",
  userId: "",
  userName: ""
};

const EmployeesListPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>(initialNewUser);
  const [editUser, setEditUser] = useState<EditUser>(initialEditUser);
  const [originalEditUser, setOriginalEditUser] = useState<EditUser>(initialEditUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(initialDeleteConfirmation);

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


  const navigateToTimesheet = (username: string) => {
    router.push(`/timesheets/${username}`);
  };
  
  if (loading) return <Loader message="Loading Users..." />;

  return (
    <div className={styles.pagecontainer}>
      <Header title="Timesheet" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div>
            <span className={styles.title}>Team</span>
            <span className={styles.userCount}>({filteredUsers.length} users)</span>
            <div className={styles.instructions}>Select a user from the list below to access their timesheet</div>
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
              {/* <th>Action</th> */}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id} className={styles.tableRow}>
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
        </div>
      </main>
  </div>
  );
};

export default EmployeesListPage;