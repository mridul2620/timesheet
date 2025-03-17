"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";

interface Subject {
  _id: string;
  name: string;
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
  
  const handleOpenEditDialog = (subject: Subject) => {
    setEditSubjectId(subject._id);
    setEditSubjectName(subject.name);
    setIsEditDialogOpen(true);
    setErrorMessage("");
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
        body: JSON.stringify({ name: editSubjectName }),
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
    <div className={styles.pagecontainer}>
      <Header title="Subjects" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div>
            <span className={styles.title}>List</span>
            <span className={styles.userCount}>({filteredSubjects.length} subjects)</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name"
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

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <tr key={subject._id}>
                  <td>{subject.name}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenEditDialog(subject)}
                        aria-label="Edit subject"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => showDeleteConfirmation(subject._id, subject.name)}
                        aria-label="Delete subject"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className={styles.noResults}>
                  No subjects found matching search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                  <div className={styles.formGroupFull}>
                    <label htmlFor="name">Subject Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Enter subject name"
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
          <div className={styles.dialog}>
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
            ) : (
              <form onSubmit={handleEditSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroupFull}>
                    <label htmlFor="edit-name">Subject Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      placeholder="Enter subject name"
                    />
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
              <AlertTriangle size={32} color="#f59e0b" />
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