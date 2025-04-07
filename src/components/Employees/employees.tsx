"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search, Eye, EyeOff } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";

interface AllocatedHours {
  year: string;
  hours: string;
}

interface FinancialYear {
  year: string;
  startDate: string;
  endDate: string;
}

interface User {
  _id: string;
  email: string[];
  name: string;
  designation: string;
  active: boolean;
  username: string;
  role?: string;
  payrate?: number;
  allocatedHours?: AllocatedHours[];
  financialYears?: FinancialYear[];
}

interface NewUser {
  username: string;
  email: string;
  name: string;
  role: string;
  payrate: string;
  designation: string;
  allocatedHours: AllocatedHours[];
  financialYears: FinancialYear[];
  password: string;
}

interface EditUser {
  username: string;
  newUsername?: string;
  email?: string[];
  name?: string;
  role?: string;
  payrate?: string;
  designation?: string;
  allocatedHours?: AllocatedHours[];
  financialYears?: FinancialYear[];
  active?: boolean;
}

interface DeleteConfirmation {
  show: boolean;
  username: string;
  userId: string;
  userName: string;
}

const getCurrentFinancialYear = (): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  if (currentMonth < 3) {
    return String(currentYear - 1);
  } else {
    return String(currentYear);
  }
};

// Function to generate list of available financial years
const generateFinancialYears = (): string[] => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Return previous, current, and next year for better flexibility
  return [
    String(currentYear - 1),
    String(currentYear),
  ];
};

const getFinancialYearDates = (year: string): { startDate: string; endDate: string } => {
  const startYear = parseInt(year);
  const endYear = startYear + 1;

  return {
    startDate: new Date(`${startYear}-04-01`).toISOString(),
    endDate: new Date(`${endYear}-03-31`).toISOString()
  };
};

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const allocatedHoursRegex = /^(\d+(\.\d{1,2})?|0\.\d{1,2})$/;

const EmployeesPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [financialYears, setFinancialYears] = useState<string[]>(generateFinancialYears());
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add state for managing multiple allocatedHours entries
  const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYear());

  const initialNewUser: NewUser = {
    username: "",
    email: "",
    name: "",
    role: "user",
    payrate: "",
    designation: "",
    allocatedHours: [{
      year: getCurrentFinancialYear(),
      hours: ""
    }],
    financialYears: [{
      year: getCurrentFinancialYear(),
      ...getFinancialYearDates(getCurrentFinancialYear())
    }],
    password: ""
  };

  const [newUser, setNewUser] = useState<NewUser>(initialNewUser);

  const initialEditUser: EditUser = {
    username: "",
    newUsername: "",
    email: [],
    name: "",
    role: "",
    payrate: "",
    designation: "",
    allocatedHours: [{
      year: getCurrentFinancialYear(),
      hours: ""
    }],
    financialYears: [{
      year: getCurrentFinancialYear(),
      ...getFinancialYearDates(getCurrentFinancialYear())
    }],
    active: true
  };

  const [editUser, setEditUser] = useState<EditUser>(initialEditUser);
  const [originalEditUser, setOriginalEditUser] = useState<EditUser>(initialEditUser);

  const initialDeleteConfirmation: DeleteConfirmation = {
    show: false,
    username: "",
    userId: "",
    userName: ""
  };
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(initialDeleteConfirmation);

  useEffect(() => {
    const updateFinancialYears = () => {
      const currentYears = generateFinancialYears();
      setFinancialYears(currentYears);
      
      // Use the current financial year as default
      const currentFinancialYear = getCurrentFinancialYear();
      setSelectedYear(currentFinancialYear);
      
      // Update the initialNewUser state
      const updatedInitialNewUser = {
        ...initialNewUser,
        financialYears: [{
          year: currentFinancialYear,
          ...getFinancialYearDates(currentFinancialYear)
        }],
        allocatedHours: [{
          year: currentFinancialYear,
          hours: ""
        }]
      };
      
      // Only set newUser if dialog is not already open (to avoid resetting form)
      if (!isDialogOpen) {
        setNewUser(updatedInitialNewUser);
      }
    };
    
    updateFinancialYears();
  
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getMonth() === 0 && now.getDate() === 1) {
        updateFinancialYears();
      }
    }, 24 * 60 * 60 * 1000);
  
    return () => clearInterval(interval);
  }, [isDialogOpen]);

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

  const validateNewUser = () => {
    const { username, email, name, payrate, designation, allocatedHours, password } = newUser;

    if (!username || !email || !name || !payrate || !designation || !password) {
      setErrorMessage("All fields are required");
      return false;
    }

    if (!emailRegex.test(email)) {
      setErrorMessage("Invalid email address");
      return false;
    }

    const payRateNum = parseFloat(payrate);
    if (isNaN(payRateNum) || payRateNum <= 0) {
      setErrorMessage("Invalid pay rate");
      return false;
    }

    // Validate all allocated hours
    for (const allocatedHour of allocatedHours) {
      if (!allocatedHoursRegex.test(allocatedHour.hours)) {
        setErrorMessage(`Invalid allocated hours for year ${allocatedHour.year}`);
        return false;
      }
    }

    return true;
  };

  const validateEditUser = () => {
    const { newUsername, email, name, payrate, designation, allocatedHours } = editUser;
  
    // Basic validation for required fields
    if (!newUsername || !email || !name || !payrate || !designation) {
      setErrorMessage("All fields are required");
      return false;
    }
  
    if (!emailRegex.test(email[0])) {
      setErrorMessage("Invalid email address");
      return false;
    }
  
    const payRateNum = parseFloat(payrate);
    if (isNaN(payRateNum) || payRateNum <= 0) {
      setErrorMessage("Invalid pay rate");
      return false;
    }
  
    // Only validate hours for the currently selected year if it has a value
    // This allows other years to remain empty
    if (allocatedHours) {
      const selectedYearHours = allocatedHours.find(item => item.year === selectedYear);
      
      if (selectedYearHours && selectedYearHours.hours.trim() !== "") {
        if (!allocatedHoursRegex.test(selectedYearHours.hours)) {
          setErrorMessage(`Invalid allocated hours for year ${selectedYear}`);
          return false;
        }
      }
    }
  
    return true;
  };
  
  

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

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

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUser(prev => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  // Add handler for updating allocated hours by year
  const handleAllocatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>, year: string) => {
    const { value } = e.target;
    
    setNewUser(prev => {
      // Check if this year already exists in the allocatedHours array
      const existingIndex = prev.allocatedHours.findIndex(item => item.year === year);
      
      // Create a copy of the current allocatedHours array
      const updatedAllocatedHours = [...prev.allocatedHours];
      
      if (existingIndex >= 0) {
        // Update existing entry
        updatedAllocatedHours[existingIndex] = { year, hours: value };
      } else {
        // Add new entry
        updatedAllocatedHours.push({ year, hours: value });
      }
      
      return {
        ...prev,
        allocatedHours: updatedAllocatedHours
      };
    });
    
    setErrorMessage("");
  };

  // Add handler for updating allocated hours by year for edit form
  const handleEditAllocatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>, year: string) => {
    const { value } = e.target;
    
    setEditUser(prev => {
      // Create a copy of the current allocatedHours array or initialize if undefined
      const updatedAllocatedHours = [...(prev.allocatedHours || [])];
      
      // Check if this year already exists in the allocatedHours array
      const existingIndex = updatedAllocatedHours.findIndex(item => item.year === year);
      
      if (existingIndex >= 0) {
        // Update existing entry
        updatedAllocatedHours[existingIndex] = { year, hours: value };
      } else {
        // Add new entry
        updatedAllocatedHours.push({ year, hours: value });
      }
      
      return {
        ...prev,
        allocatedHours: updatedAllocatedHours
      };
    });
    
    setErrorMessage("");
  };

  // Helper to get hours value for a specific year
  const getHoursForYear = (allocatedHours: AllocatedHours[] | undefined, year: string): string => {
    if (!allocatedHours) return "";
    const entry = allocatedHours.find(item => item.year === year);
    return entry ? entry.hours : "";
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    
    // Initialize with current year's entry
    const currentYear = getCurrentFinancialYear();
    
    setNewUser({
      ...initialNewUser,
      allocatedHours: [{
        year: currentYear,
        hours: ""
      }],
      financialYears: [{
        year: currentYear,
        ...getFinancialYearDates(currentYear)
      }]
    });
    
    setSelectedYear(currentYear);
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleOpenEditDialog = (userToEdit: User) => {
    // Get all available financial years
    const availableYears = generateFinancialYears();
    const currentYear = getCurrentFinancialYear();
    setSelectedYear(currentYear);
    
    // Prepare allocatedHours and financialYears arrays
    const allocatedHours: AllocatedHours[] = [];
    const financialYears: FinancialYear[] = [];
    
    // Create financial year entries for all available years
    availableYears.forEach(year => {
      const yearDates = getFinancialYearDates(year);
      
      // Add to financialYears
      financialYears.push({
        year,
        startDate: yearDates.startDate,
        endDate: yearDates.endDate
      });
      
      // Find allocated hours for this year if it exists
      const existingHours = userToEdit.allocatedHours?.find(item => item.year === year);
      
      // Add to allocatedHours (with existing hours or empty)
      allocatedHours.push({
        year,
        hours: existingHours ? existingHours.hours : ""
      });
    });
    
    const editUserData: EditUser = {
      username: userToEdit.username,
      newUsername: userToEdit.username,
      email: userToEdit.email,
      name: userToEdit.name,
      role: userToEdit.role,
      payrate: userToEdit.payrate?.toString() || "",
      designation: userToEdit.designation,
      allocatedHours: allocatedHours,
      financialYears: financialYears,
      active: userToEdit.active
    };
    
    setEditUser(editUserData);
    setOriginalEditUser({...editUserData});
    setIsEditDialogOpen(true);
    setErrorMessage("");
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateNewUser()) return;

    setIsSubmitting(true);
    try {
      // Filter out empty allocatedHours entries
      const validAllocatedHours = newUser.allocatedHours.filter(item => 
        item.hours.trim() !== ""
      );

      const userPayload = {
        ...newUser,
        email: Array.isArray(newUser.email) ? newUser.email : [newUser.email],
        allocatedHours: validAllocatedHours
      };

      const response = await fetch(process.env.NEXT_PUBLIC_ADD_USER_API as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchUsers();
        setIsDialogOpen(false);
      } else {
        setErrorMessage(data.message || "Error adding user");
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setErrorMessage("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!validateEditUser()) return;
  
    // Start with required fields
    const updatePayload: EditUser = {
      username: editUser.username,
    };
  
    // Only update fields that have changed
    if (editUser.newUsername !== originalEditUser.newUsername) {
      updatePayload.newUsername = editUser.newUsername;
    }
    if (JSON.stringify(editUser.email) !== JSON.stringify(originalEditUser.email)) {
      updatePayload.email = editUser.email;
    }
    if (editUser.name !== originalEditUser.name) {
      updatePayload.name = editUser.name;
    }
    if (editUser.payrate !== originalEditUser.payrate) {
      updatePayload.payrate = editUser.payrate;
    }
    if (editUser.designation !== originalEditUser.designation) {
      updatePayload.designation = editUser.designation;
    }
    if (editUser.role !== originalEditUser.role) {
      updatePayload.role = editUser.role;
    }
    if (editUser.active !== originalEditUser.active) {
      updatePayload.active = editUser.active;
    }
    
    // Filter out any allocatedHours entries with empty hours
    const validAllocatedHours = editUser.allocatedHours?.filter(
      item => item.hours.trim() !== ""
    );
    
    // Check if the currently selected year's hours have been updated
    const currentYearHours = validAllocatedHours?.find(item => item.year === selectedYear);
    
    if (currentYearHours) {
      // Get the original hours for this year if they exist
      const originalYearHours = originalEditUser.allocatedHours?.find(
        item => item.year === selectedYear
      );
      
      // Only update if the hours have changed for the selected year
      if (!originalYearHours || originalYearHours.hours !== currentYearHours.hours) {
        // Just include the year we're currently updating, not all years
        updatePayload.allocatedHours = [currentYearHours];
      }
    }
    
    // Add the financial year information only for the selected year
    if (selectedYear) {
      const yearDates = getFinancialYearDates(selectedYear);
      updatePayload.financialYears = [{
        year: selectedYear,
        startDate: yearDates.startDate,
        endDate: yearDates.endDate
      }];
    }
  
    // If no changes, close dialog
    if (Object.keys(updatePayload).length === 1) {
      handleCloseEditDialog();
      return;
    }
  
    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_EDIT_USER_API as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
  
      const data = await response.json();
      
      if (response.ok) { 
        await fetchUsers();
        handleCloseEditDialog();
      } else {
        setErrorMessage(data.message || "Error updating user");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDeleteConfirmation = (username: string, id: string, name: string) => {
    setDeleteConfirmation({
      show: true,
      username,
      userId: id,
      userName: name
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation(initialDeleteConfirmation);
  };

  const handleConfirmDelete = async () => {
    const { username, userId } = deleteConfirmation;
    
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_DELETE_USER_API as string, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const updatedUsers = users.filter((user) => user._id !== userId);
        setUsers(updatedUsers);
        setFilteredUsers(
          filteredUsers.filter((user) => user._id !== userId)
        );
        hideDeleteConfirmation();
      } else {
        console.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };
  
  if (loading) return <Loader message="Loading Users..." />;

  return (
    <div className={styles.pagecontainer}>
      <Header title="Worker" user={user} />
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
            <button className={styles.inviteButton} onClick={handleOpenDialog}>
              <Plus size={16} />
              Add User
            </button>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id} className={styles.tableRow}>
                  <td>
                    <div className={styles.avatarContainer}>
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
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenEditDialog(user)}
                        aria-label="Edit user"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => showDeleteConfirmation(user.username, user._id, user.name)}
                        aria-label="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
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
                <Loader message="Adding User..." />
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
                    <label htmlFor="financialYear">Financial Year</label>
                    <select
                      id="financialYear"
                      name="financialYear"
                      value={selectedYear}
                      onChange={(e) => {
                        const selectedYear = e.target.value;
                        setSelectedYear(selectedYear);
                        
                        // Ensure the financial year exists in the financialYears array
                        const yearDates = getFinancialYearDates(selectedYear);
                        let updatedFinancialYears = [...newUser.financialYears];
                        
                        // Check if year already exists in financialYears
                        const existingYearIndex = updatedFinancialYears.findIndex(
                          fy => fy.year === selectedYear
                        );
                        
                        if (existingYearIndex === -1) {
                          // Add new financial year
                          updatedFinancialYears.push({
                            year: selectedYear,
                            startDate: yearDates.startDate,
                            endDate: yearDates.endDate
                          });
                        }
                        
                        setNewUser(prev => ({
                          ...prev,
                          financialYears: updatedFinancialYears
                        }));
                      }}
                    >
                      {financialYears.map(year => (
                        <option key={year} value={year}>
                          {year} - {parseInt(year) + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="allocatedHours">Allocated Hours for {selectedYear}-{parseInt(selectedYear) + 1}</label>
                    <input
                      type="text"
                      id="allocatedHours"
                      name="allocatedHours"
                      value={getHoursForYear(newUser.allocatedHours, selectedYear)}
                      onChange={(e) => handleAllocatedHoursChange(e, selectedYear)}
                      placeholder="1000.00"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="password">Password</label>
                    <div className={styles.passwordInputContainer}>
                      <input
                        type={passwordVisible ? "text" : "password"}
                        id="password"
                        name="password"
                        value={newUser.password}
                        onChange={handleInputChange}
                        placeholder="Enter password"
                      />
                      <button 
                        type="button"
                        className={styles.passwordToggleButton}
                        onClick={togglePasswordVisibility}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                      >
                        {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
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

      {isEditDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseEditDialog();
        }}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h2>Edit User</h2>
              <button 
                className={styles.closeButton} 
                onClick={handleCloseEditDialog} 
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            
            {isSubmitting ? (
              <div className={styles.loaderContainer}>
                <Loader message="Updating User..." />
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-name">Full Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editUser.name}
                      onChange={handleEditInputChange}
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-newUsername">Username</label>
                    <input
                      type="text"
                      id="edit-newUsername"
                      name="newUsername"
                      value={editUser.newUsername}
                      onChange={handleEditInputChange}
                      placeholder="johndoe123"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-email">Email</label>
                    <input
                      type="email"
                      id="edit-email"
                      name="email"
                      value={editUser.email}
                      onChange={(e) => {
                        // Handle the email array
                        setEditUser({
                          ...editUser,
                          email: [e.target.value]
                        });
                      }}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-designation">Designation</label>
                    <input
                      type="text"
                      id="edit-designation"
                      name="designation"
                      value={editUser.designation}
                      onChange={handleEditInputChange}
                      placeholder="Developer"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-payrate">Pay Rate (£/hour)</label>
                    <input
                      type="text"
                      id="edit-payrate"
                      name="payrate"
                      value={editUser.payrate}
                      onChange={handleEditInputChange}
                      placeholder="20.00"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-role">Role</label>
                    <select
                      id="edit-role"
                      name="role"
                      value={editUser.role}
                      onChange={handleEditInputChange}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-financialYear">Financial Year</label>
                    <select
                      id="edit-financialYear"
                      name="financialYear"
                      value={selectedYear}
                      onChange={(e) => {
                        const selectedYear = e.target.value;
                        setSelectedYear(selectedYear);
                        
                        // Make sure this year is in the financialYears array
                        const yearDates = getFinancialYearDates(selectedYear);
                        let updatedFinancialYears = [...(editUser.financialYears || [])];
                        
                        // Check if year already exists in financialYears
                        const existingYearIndex = updatedFinancialYears.findIndex(
                          fy => fy.year === selectedYear
                        );
                        
                        if (existingYearIndex === -1) {
                          // Add new financial year
                          updatedFinancialYears.push({
                            year: selectedYear,
                            startDate: yearDates.startDate,
                            endDate: yearDates.endDate
                          });
                          
                          setEditUser(prev => ({
                            ...prev,
                            financialYears: updatedFinancialYears
                          }));
                        }
                      }}
                    >
                      {financialYears.map(year => (
                        <option key={year} value={year}>
                          {year} - {parseInt(year) + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-allocatedHours">Allocated Hours for {selectedYear}-{parseInt(selectedYear) + 1}</label>
                    <input
                      type="text"
                      id="edit-allocatedHours"
                      name="allocatedHours"
                      value={getHoursForYear(editUser.allocatedHours, selectedYear)}
                      onChange={(e) => handleEditAllocatedHoursChange(e, selectedYear)}
                      placeholder="1000.00"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-active">Status</label>
                    <select
                      id="edit-active"
                      name="active"
                      value={editUser.active ? "true" : "false"}
                      onChange={(e) => setEditUser({
                        ...editUser, 
                        active: e.target.value === "true"
                      })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Non-active</option>
                    </select>
                  </div>
                                 
                  <button type="submit" className={styles.submitButton}>
                    Update User
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteConfirmation.show && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) hideDeleteConfirmation();
        }}>
        <div className={styles.confirmationDialog}>
          <div className={styles.confirmationIcon}>
            <AlertTriangle size={32} color="#f59e0b" />
          </div>
          <h2 className={styles.confirmationTitle}>Confirm Deletion</h2>
          <p className={styles.confirmationText}>
            Are you sure you want to delete user <span className={styles.boldText}>{deleteConfirmation.userName}</span>? This action cannot be undone.
          </p>
          <div className={styles.confirmationButtons}>
            <button 
              className={styles.cancelButton} 
              onClick={hideDeleteConfirmation}
            >
              No, Cancel
            </button>
            <button 
              className={styles.confirmButton} 
              onClick={handleConfirmDelete}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default EmployeesPage;