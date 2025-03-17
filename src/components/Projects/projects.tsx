"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
import styles from "./index.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";

interface Project {
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
  projectId: string;
  projectName: string;
}

const initialDeleteConfirmation: DeleteConfirmation = {
  show: false,
  projectId: "",
  projectName: ""
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(initialDeleteConfirmation);

  const sortProjectsByName = (projectArray: Project[]): Project[] => {
    return [...projectArray].sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_PROJECTS_API as string);
      const data = await response.json();
      if (data.projects) {
        const sortedProjects = sortProjectsByName(data.projects);
        setProjects(sortedProjects);
        setFilteredProjects(sortedProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
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
    fetchProjects();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = projects.filter(
        project => project.name.toLowerCase().includes(term)
      );
      setFilteredProjects(filtered);
    }
  }, [searchTerm, projects]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setProjectName("");
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleOpenEditDialog = async (project: Project) => {
    setEditProjectId(project._id);
    setEditProjectName(project.name);
    setIsEditDialogOpen(true);
    setErrorMessage("");
    
    // Fetch users when edit dialog opens
    setIsLoadingUsers(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL as string);
      const data = await response.json();
      
      if (data.success) {
        setUsersList(data.users);
        
        // Pre-select existing assigned users
        setSelectedUsers(
          data.users
            .filter((user: { name: string; }) => project.assignedTo?.includes(user.name))
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
      setErrorMessage("Project name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(projectName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ADD_PROJECT_API as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchProjects();
        handleCloseDialog();
      } else {
        setErrorMessage(data.message || "Error adding project");
      }
    } catch (error) {
      console.error('Error adding project:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(editProjectName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_UPDATE_PROJECT_API}/${editProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: editProjectName,
          assignedTo: selectedUsers.map(userId => {
            const user = usersList.find(u => u._id === userId);
            return user ? user.name : '';
          }).filter(Boolean)
        }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchProjects();
        handleCloseEditDialog();
      } else {
        setErrorMessage(data.message || "Error updating project");
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDeleteConfirmation = (projectId: string, projectName: string) => {
    setDeleteConfirmation({
      show: true,
      projectId,
      projectName
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation(initialDeleteConfirmation);
  };

  const handleConfirmDelete = async () => {
    const { projectId } = deleteConfirmation;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_DELETE_PROJECT_API}/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const updatedProjects = projects.filter((project) => project._id !== projectId);
        setProjects(updatedProjects);
        setFilteredProjects(
          filteredProjects.filter((project) => project._id !== projectId)
        );
        hideDeleteConfirmation();
      } else {
        console.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };
  
  if (loading) return <Loader message="Loading Projects..." />;

  return (
    <div className={styles.pageContainer}>
      <Header title="Projects" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div className={styles.titleContainer}>
            <span className={styles.title}>Projects List</span>
            <span className={styles.userCount}>({filteredProjects.length} projects)</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search projects by name"
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.inviteButton} onClick={handleOpenDialog}>
              <Plus size={16} />
              Add Project
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr key={project._id} className={styles.projectRow}>
                  <td className={styles.projectName}>{project.name}</td>
                  <td className={styles.assignedNames}>
                    {renderAssignedUsers(project.assignedTo)}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenEditDialog(project)}
                        aria-label="Edit project"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => showDeleteConfirmation(project._id, project.name)}
                        aria-label="Delete project"
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
                  No projects found matching search criteria
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Project Dialog */}
      {isDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseDialog();
        }}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h2>Add New Project</h2>
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
                <Loader message="Adding Project..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Project Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>
                    Add Project
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      {isEditDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseEditDialog();
        }}>
          <div className={styles.editDialog}>
            <div className={styles.dialogHeader}>
              <h2>Edit Project</h2>
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
                <Loader message="Updating Project..." />
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
                    <label htmlFor="edit-name">Project Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      placeholder="Enter project name"
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
                    Update Project
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
              Are you sure you want to delete the project <span className={styles.boldText}>{deleteConfirmation.projectName}</span>? This action cannot be undone.
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

export default ProjectsPage;