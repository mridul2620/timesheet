"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search, Eye, EyeOff } from "lucide-react";
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

const EmployeesPage = () => {
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
  const [passwordVisible, setPasswordVisible] = useState(false);

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

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setNewUser(initialNewUser);
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleOpenEditDialog = (userToEdit: User) => {
    const editUserData: EditUser = {
      username: userToEdit.username,
      newUsername: userToEdit.username,
      email: userToEdit.email,
      name: userToEdit.name,
      role: userToEdit.role,
      payrate: userToEdit.payrate?.toString() || "",
      designation: userToEdit.designation,
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
  
  const validateEditForm = () => {
    if (!editUser.newUsername || !editUser.email || !editUser.name || 
        !editUser.payrate || !editUser.designation) {
      setErrorMessage("All fields are required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUser.email)) {
      setErrorMessage("Please enter a valid email address");
      return false;
    }

    if (isNaN(parseFloat(editUser.payrate))) {
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
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEditForm()) {
      return;
    }

    // Create the update payload with only changed fields
    const updatePayload: EditUser = {
      username: editUser.username, // Original username for finding the user
    };

    if (editUser.newUsername !== originalEditUser.newUsername) {
      updatePayload.newUsername = editUser.newUsername;
    }
    if (editUser.email !== originalEditUser.email) {
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

    // If nothing changed, just close the dialog
    if (Object.keys(updatePayload).length === 1) {
      handleCloseEditDialog();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_EDIT_USER_API as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
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
      setErrorMessage("An error occurred. Please try again.");
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
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
      <Header title="Employees" user={user} />
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
                    <div 
                      className={styles.avatarContainer}
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

      {/* Add User Dialog */}
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

  {/* Edit User Dialog */}
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
                onChange={handleEditInputChange}
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