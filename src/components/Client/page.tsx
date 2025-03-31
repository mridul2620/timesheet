"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Plus, X, Edit, AlertTriangle, Search } from "lucide-react";
import styles from "./client.module.css";
import Loader from "../Loader/loader";
import Header from "../Header/header";

interface Client {
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
  clientId: string;
  clientName: string;
}

const initialDeleteConfirmation: DeleteConfirmation = {
  show: false,
  clientId: "",
  clientName: ""
};

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(initialDeleteConfirmation);

  const sortClientsByName = (clientArray: Client[]): Client[] => {
    return [...clientArray].sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_CLIENT_API as string);
      const data = await response.json();
      if (data.clients) {
        const sortedClients = sortClientsByName(data.clients);
        setClients(sortedClients);
        setFilteredClients(sortedClients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
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
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(
        client => client.name.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setClientName("");
    setErrorMessage("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleOpenEditDialog = async (client: Client) => {
    setEditClientId(client._id);
    setEditClientName(client.name);
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
            .filter((user: { name: string; }) => client.assignedTo?.includes(user.name))
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
      setErrorMessage("Client name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(clientName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ADD_CLIENT_API as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientName }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchClients();
        handleCloseDialog();
      } else {
        setErrorMessage(data.message || "Error adding client");
      }
    } catch (error) {
      console.error('Error adding client:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(editClientName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_UPDATE_CLIENT_API}/${editClientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: editClientName,
          assignedTo: selectedUsers.map(userId => {
            const user = usersList.find(u => u._id === userId);
            return user ? user.name : '';
          }).filter(Boolean)
        }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        await fetchClients();
        handleCloseEditDialog();
      } else {
        setErrorMessage(data.message || "Error updating Client");
      }
    } catch (error) {
      console.error('Error updating Client:', error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDeleteConfirmation = (clientId: string, clientName: string) => {
    setDeleteConfirmation({
      show: true,
      clientId,
      clientName
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation(initialDeleteConfirmation);
  };

  const handleConfirmDelete = async () => {
    const { clientId } = deleteConfirmation;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_DELETE_CLIENT_API}/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const updatedClients = clients.filter((client) => client._id !== clientId);
        setClients(updatedClients);
        setFilteredClients(
          filteredClients.filter((client) => client._id !== clientId)
        );
        hideDeleteConfirmation();
      } else {
        console.error('Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };
  
  if (loading) return <Loader message="Loading Clients..." />;

  return (
    <div className={styles.pageContainer}>
      <Header title="Clients" user={user} />
      <main className={styles.container}>
        <div className={styles.teamHeader}>
          <div className={styles.titleContainer}>
            <span className={styles.title}>Clients List</span>
            <span className={styles.userCount}>({filteredClients.length} clients)</span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search clients by name"
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.inviteButton} onClick={handleOpenDialog}>
              <Plus size={16} />
              Add Client
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <tr key={client._id} className={styles.clientRow}>
                  <td className={styles.clientName}>{client.name}</td>
                  <td className={styles.assignedNames}>
                    {renderAssignedUsers(client.assignedTo)}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleOpenEditDialog(client)}
                        aria-label="Edit client"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => showDeleteConfirmation(client._id, client.name)}
                        aria-label="Delete client"
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
                  No clients found matching search criteria
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Client Dialog */}
      {isDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseDialog();
        }}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h2>Add New Client</h2>
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
                <Loader message="Adding Client..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                {errorMessage && (
                  <div className={styles.errorMessage}>{errorMessage}</div>
                )}
                
                <div className={styles.formLayout}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Client Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>
                    Add Client
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Client Dialog */}
      {isEditDialogOpen && (
        <div className={styles.dialogBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseEditDialog();
        }}>
          <div className={styles.editDialog}>
            <div className={styles.dialogHeader}>
              <h2>Edit Client</h2>
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
                <Loader message="Updating Client..." />
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
                    <label htmlFor="edit-name">Client Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      placeholder="Enter client name"
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
                    Update Client
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
              Are you sure you want to delete the client <span className={styles.boldText}>{deleteConfirmation.clientName}</span>? This action cannot be undone.
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

export default ClientsPage;