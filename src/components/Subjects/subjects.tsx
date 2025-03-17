"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";

interface Subject {
  _id: string;
  name: string;
  assignedTo?: string[];
}

interface User {
  _id: string;
  name: string;
  username: string;
}

interface DeleteConfirmation {
  show: boolean;
  subjectId: string;
  subjectName: string;
}

const initialDeleteConfirmation: DeleteConfirmation = {
  show: false,
  subjectId: "",
  subjectName: ""
};

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editSubjectName, setEditSubjectName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(initialDeleteConfirmation);

  // Sort subjects alphabetically by name
  const sortSubjectsByName = (subjectArray: Subject[]): Subject[] => {
    return [...subjectArray].sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_SUBJECTS_API as string);
      const data = await response.json();
      if (data.subjects) {
        const sortedSubjects = sortSubjectsByName(data.subjects);
        setSubjects(sortedSubjects);
        setFilteredSubjects(sortedSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
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
    fetchSubjects();
  }, []);

  // Filter subjects based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSubjects(subjects);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = subjects.filter(
        subject => subject.name.toLowerCase().includes(term)
      );
      setFilteredSubjects(filtered);
    }
  }, [searchTerm, subjects]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setSubjectName("");
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
 // In the subjects.tsx file:

// Change handleOpenEditDialog function
const handleOpenEditDialog = async (subject: Subject) => {
    // First set the dialog to open and set initial states
    setEditSubjectId(subject._id);
    setEditSubjectName(subject.name);
    setIsEditDialogOpen(true);
    setErrorMessage("");
    setIsLoadingUsers(true); // Start loading immediately
    
    // Then fetch users
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL as string);
      const data = await response.json();
      
      if (data.success) {
        setUsersList(data.users);
        
        // Pre-select existing assigned users
        setSelectedUsers(
          data.users
            .filter((user: { name: string; }) => subject.assignedTo?.includes(user.name))
            .map((user: { _id: any; }) => user._id)
        );
      } else {
        setErrorMessage("Failed to fetch users");
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage("An error occurred while fetching users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const renderAssignedUsers = (assignedUsers: string[] = []) => {
    if (assignedUsers.length === 0) return 'Not assigned';
    
    return assignedUsers.join(', ');
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
  };

  const validateForm = (name: string) => {
    if (!name.trim()) {
      setErrorMessage("Subject name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(subjectName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ADD_SUBJECT_API as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subjectName }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchSubjects();
        handleCloseDialog();
      } else {
        setErrorMessage(data.message || "Error adding subject");
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(editSubjectName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_UPDATE_SUBJECT_API}/${editSubjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: editSubjectName,
          assignedTo: selectedUsers.map(userId => {
            const user = usersList.find(u => u._id === userId);
            return user ? user.name : '';
          }).filter(Boolean)
        }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchSubjects();
        handleCloseEditDialog();
      } else {
        setErrorMessage(data.message || "Error updating subject");
      }
    } catch (error) {
      console.error('Error updating subject:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDeleteConfirmation = (subjectId: string, subjectName: string) => {
    setDeleteConfirmation({
      show: true,
      subjectId,
      subjectName
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation(initialDeleteConfirmation);
  };

  const handleConfirmDelete = async () => {
    const { subjectId } = deleteConfirmation;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_DELETE_SUBJECT_API}/${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const updatedSubjects = subjects.filter((subject) => subject._id !== subjectId);
        setSubjects(updatedSubjects);
        setFilteredSubjects(
          filteredSubjects.filter((subject) => subject._id !== subjectId)
        );
        hideDeleteConfirmation();
      } else {
        console.error('Failed to delete subject');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };
  
  if (loading) return <Loader message="Loading Subjects..." />;

  return (
    <div className={styles.pageContainer}>
      <Header title="Subjects" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div className={styles.titleContainer}>
            <span className={styles.title}>Subjects List</span>
            <span className={styles.userCount}>({filteredSubjects.length} subjects)</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search subjects by name"
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.inviteButton} onClick={handleOpenDialog}>
              <Plus size={16} />
              Add Subject
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <tr key={subject._id} className={styles.projectRow}>
                    <td className={styles.projectName}>{subject.name}</td>
                    <td className={styles.assignedNames}>
                      {renderAssignedUsers(subject.assignedTo)}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editButton}
                          onClick={() => handleOpenEditDialog(subject)}
                          aria-label="Edit subject"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => showDeleteConfirmation(subject._id, subject.name)}
                          aria-label="Delete subject"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className={styles.noResults}>
                    No subjects found matching search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Subject Dialog */}
      {isDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseDialog();
        }}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h2>Add New Subject</h2>
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
                <Loader message="Adding Subject..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Subject Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Enter subject name"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>
                    Add Subject
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Subject Dialog */}
      {isEditDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseEditDialog();
        }}>
          <div className={styles.editDialog}>
            <div className={styles.dialogHeader}>
              <h2>Edit Subject</h2>
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
                <Loader message="Updating Subject..." />
              </div>
            ) : isLoadingUsers ? (
              <div className={styles.loaderContainer}>
                <Loader message="Loading Users..." fullScreen={false} />
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-name">Subject Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      placeholder="Enter subject name"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.userSelectLabel}>Assigned To</label>
                    <div className={styles.userSelectContainer}>
                      {usersList.map((user) => (
                        <div 
                          key={user._id} 
                          className={`${styles.userSelectItem} ${selectedUsers.includes(user._id) ? styles.userSelectItemActive : ''}`}
                        >
                          <input 
                            type="checkbox"
                            id={`user-${user._id}`}
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleUserSelect(user._id)}
                            className={styles.userSelectCheckbox}
                          />
                          <label 
                            htmlFor={`user-${user._id}`}
                            className={styles.userSelectLabel}
                          >
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.userUsername}>({user.username})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>
                    Update Subject
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) hideDeleteConfirmation();
        }}>
          <div className={styles.confirmationDialog}>
            <div className={styles.confirmationIcon}>
              <AlertTriangle size={32} />
            </div>
            <h2 className={styles.confirmationTitle}>Confirm Deletion</h2>
            <p className={styles.confirmationText}>
              Are you sure you want to delete the subject <span className={styles.boldText}>{deleteConfirmation.subjectName}</span>? This action cannot be undone.
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

export default SubjectsPage;