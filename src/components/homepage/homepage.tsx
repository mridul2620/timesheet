import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./homepage.module.css";
import Calendar from "../Calender";
import Loader from "../Loader/loader";
import Header from "../Header/header";
import BarChartComponent from "../Charts/barchart";
import PieChartComponent from "../Charts/piechart";
import Dialog from "./dialog";
import DraftBanner from "./draftBanner";
import TimesheetRow from "./timesheetRow";
import StatusRow from "./timesheetStatus";
import TimesheetService from "./timesheetservive";
import { TimeEntry, User, Project, Subject, DailyHours, ProjectHours, DialogData, Client, DraftTimesheet, Timesheet } from "./timesheetTypes";

const HomepageContent: React.FC = () => {
  // Color palette for project visualization
  const projectColors = [
    "#3b82f6", "#22d3ee", "#f97316", "#a855f7", "#06b6d4", 
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
  ];
  
  // Helper function to initialize empty timesheet rows
  const getInitialEntries = (): TimeEntry[] => {
    return Array(3).fill(null).map((_, index) => ({
      id: String(index + 1),
      client: "",
      project: "",
      subject: "",
      hours: {},
    }));
  };
  
  // State for timesheet entries and data
  const [entries, setEntries] = useState<TimeEntry[]>(getInitialEntries());
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  
  // Master data and filtered data for dropdowns
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  
  // UI state management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isWeekEditable, setIsWeekEditable] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [currentTimesheetId, setCurrentTimesheetId] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [hasTimesheetData, setHasTimesheetData] = useState(false);
  const [dataNotFound, setDataNotFound] = useState(false);
  
  // Analytics data
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  const [projectHoursData, setProjectHoursData] = useState<ProjectHours[]>([]);
  
  // Dialog popup state
  const [dialogData, setDialogData] = useState<DialogData>({
    show: false,
    title: "",
    message: "",
    isError: false,
  });
  
  // Draft-related state
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});
  const [hasDrafts, setHasDrafts] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showPersistentBanner, setShowPersistentBanner] = useState(false);
  const [draftBannerMessage, setDraftBannerMessage] = useState("");
  const [draftBannerKey, setDraftBannerKey] = useState(0);

  // Get week dates based on selected date
  const weekDates = useMemo(() => 
    TimesheetService.getWeekDates(selectedDate), 
    [selectedDate]
  );

  // Helper functions
  const formatHoursAndMinutes = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialogData({ show: true, title, message, isError });
  };

  const closeDialog = () => {
    setDialogData(prev => ({ ...prev, show: false }));
  };

  const initializeDefaultDayStatus = useCallback(() => {
    setDayStatus(TimesheetService.initializeDayStatus(weekDates));
  }, [weekDates]);

  const resetToDefaultValues = useCallback(() => {
    setCurrentTimesheetId("");
    setIsWeekEditable(true);
    setEntries(getInitialEntries()); 
    setWorkDescription("");
    setTimesheetStatus("unapproved");
    setHasTimesheetData(false);
    initializeDefaultDayStatus();
    setDataNotFound(false);
    setHasDrafts(false);
    setShowDraftBanner(false);
    setShowPersistentBanner(false);
  }, [initializeDefaultDayStatus]);

  // Analytics calculations
  const calculateDailyHoursData = useCallback(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const abbreviations = ["S", "M", "T", "W", "T", "F", "S"];
    
    const dailyData: DailyHours[] = weekDates.map((date) => {
      const dayStr = date.toISOString().split("T")[0];
      const dayHours = entries.reduce((total, entry) => {
        const hours = Number.parseFloat(entry.hours[dayStr] || "0");
        return total + hours;
      }, 0);

      return {
        day: days[date.getDay()],
        abbreviation: abbreviations[date.getDay()],
        hours: dayHours
      };
    });

    setDailyHoursData(dailyData);
  }, [weekDates, entries]);

  const calculateProjectHoursData = useCallback(() => {
    const projectDataMap = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.project) {
        const projectHours = Object.values(entry.hours).reduce((total, hours) => {
          return total + Number.parseFloat(hours || "0");
        }, 0);

        if (projectHours > 0) {
          const currentHours = projectDataMap.get(entry.project) || 0;
          projectDataMap.set(entry.project, currentHours + projectHours);
        }
      }
    });

    const projectData: ProjectHours[] = Array.from(projectDataMap).map(([project, hours], index) => ({
      project,
      hours,
      color: projectColors[index % projectColors.length]
    }));

    setProjectHoursData(projectData);
  }, [entries, projectColors]);

  const calculateDayTotal = useCallback((date: Date) => {
    const dayStr = date.toISOString().split("T")[0];
    return entries.reduce((total, entry) => {
      const hours = Number.parseFloat(entry.hours[dayStr] || "0");
      return total + hours;
    }, 0);
  }, [entries]);

  const calculateRowTotal = useCallback((entry: TimeEntry) => {
    return Object.values(entry.hours).reduce((total, hours) => {
      return total + Number.parseFloat(hours || "0");
    }, 0);
  }, []);

  const calculateWeekTotal = useCallback(() => {
    return entries.reduce((total, entry) => {
      return total + calculateRowTotal(entry);
    }, 0);
  }, [entries, calculateRowTotal]);

  // Event handlers
  const handleClientChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, client: value, isDraft: entry.isDraft } : entry
      )
    );
  };

  const handleProjectChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, project: value, isDraft: entry.isDraft } : entry
      )
    );
  };

  const handleSubjectChange = (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, subject: value, isDraft: entry.isDraft } : entry
      )
    );
  };

  const handleInputChange = (entryId: string, day: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, hours: { ...entry.hours, [day]: value }, isDraft: entry.isDraft }
          : entry
      )
    );
  };

  const handleStatusChange = (day: string, value: string) => {
    setDayStatus((prev) => ({ ...prev, [day]: value }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorkDescription(e.target.value);
  };

  const addNewRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        client: "",
        project: "",
        subject: "",
        hours: {},
        isDraft: false
      },
    ]);
  };

  // Banner handling
  const closeDraftBanner = () => {
    setShowDraftBanner(false);
  };
  
  const closePersistentBanner = () => {
    setShowPersistentBanner(false);
    // Store in localStorage to prevent showing on page reload
    if (user?.username && weekStartDate) {
      localStorage.setItem(`draft_banner_closed_${user.username}_${weekStartDate}`, "true");
    }
  };

  // Row operations
  const deleteRow = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    
    // If this is a draft entry, delete it from the server first
    if (entry?.isDraft && user?.username && weekStartDate) {
      try {
        const response = await TimesheetService.deleteDraftEntry(
          user.username, 
          weekStartDate, 
          entryId
        );
        
        if (!response.success) {
          showDialog("Error", "Failed to delete saved entry. Please try again.", true);
          return;
        }
      } catch (error) {
        console.error("Error deleting draft entry:", error);
        showDialog("Error", "An error occurred while deleting the saved entry.", true);
        return;
      }
    }
    
    // Then remove it from the UI
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const saveRow = async (entry: TimeEntry) => {
    if (!user?.username || !weekStartDate) {
      showDialog("Error", "User information is missing or week not selected", true);
      return;
    }
    
    // Check if entry has any data worth saving
    const hasClientOrProject = entry.client || entry.project || entry.subject;
    const hasHours = Object.values(entry.hours).some(h => h && parseFloat(h) > 0);
    
    if (!hasClientOrProject && !hasHours) {
      showDialog("Error", "Entry has no data to save", true);
      return;
    }
    
    // Set loading state for this specific row
    setIsSaving(prev => ({ ...prev, [entry.id]: true }));
    
    try {
      const response = await TimesheetService.saveDraftEntry(
        user.username,
        weekStartDate,
        entry,
        workDescription,
        dayStatus
      );
      
      if (response.success) {
        // Update entry to show it's saved
        setEntries(prev => 
          prev.map(e => 
            e.id === entry.id 
              ? { ...e, isDraft: true, draftId: response.draftId } 
              : e
          )
        );
        setHasDrafts(true);
        
        // Hide persistent banner if it's showing
        setShowPersistentBanner(false);
        
        // Show temporary success banner
        setDraftBannerMessage("Entry saved successfully. Continue updating and save your work until you're ready to submit.");
        // Force banner to re-render with new key to reset timer
        setDraftBannerKey(prevKey => prevKey + 1);
        setShowDraftBanner(true);
      } else {
        showDialog("Error", response.message, true);
      }
    } catch (error) {
      console.error("Error saving draft entry:", error);
      showDialog("Error", "An error occurred while saving the entry.", true);
    } finally {
      setIsSaving(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  // Submit timesheet
  const handleSubmit = async () => {
    try {
      if (!user?.username) {
        showDialog("Error", "User information is missing", true);
        return;
      }
  
      const hasEntries = entries.some((entry) =>
        Object.values(entry.hours).some((h) => h !== "")
      );
  
      if (!hasEntries) {
        showDialog("Error", "Please add at least one time entry", true);
        return;
      }
      
      // Validate work description
      if (!workDescription || workDescription.trim() === '') {
        showDialog("Error", "Please add a work description", true);
        return;
      }
  
      setSubmitting(true);
  
      const updatedDayStatus = { ...dayStatus };
      weekDates.forEach((date) => {
        const dayStr = date.toISOString().split("T")[0];
        if (!updatedDayStatus[dayStr]) {
          const dayOfWeek = date.getDay();
          updatedDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
        }
      });
  
      const timesheetData = {
        username: user.username,
        entries: entries.filter((entry) =>
          Object.values(entry.hours).some((h) => h !== "")
        ).map(entry => {
          // Remove isDraft and draftId properties
          const { isDraft, draftId, ...cleanEntry } = entry;
          return cleanEntry;
        }),
        workDescription,
        dayStatus: updatedDayStatus,
      };
  
      let response;
      
      if (timesheetStatus === "rejected" && currentTimesheetId) {
        response = await TimesheetService.updateTimesheet(currentTimesheetId, timesheetData);
        
        if (response.success) {
          showDialog("Success", response.message);
          setTimesheetStatus("unapproved");
          setIsWeekEditable(false);
          setHasDrafts(false);
          setShowDraftBanner(false);
          setShowPersistentBanner(false);
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", response.message, true);
        }
      } else {
        const newTimesheetData = {
          ...timesheetData,
          weekStartDate: weekDates[0].toISOString().split("T")[0],
          timesheetStatus: "unapproved"
        };
        
        response = await TimesheetService.submitTimesheet(newTimesheetData);
  
        if (response.success) {
          showDialog("Success", response.message);
          setIsWeekEditable(false);
          setTimesheetStatus("unapproved");
          setHasDrafts(false);
          setShowDraftBanner(false);
          setShowPersistentBanner(false);
          await fetchTimesheetForCurrentWeek();
        } else {
          showDialog("Error", response.message, true);
        }
      }
    } catch (error) {
      showDialog("Error", "An error occurred while submitting the timesheet.", true);
    } finally {
      setSubmitting(false);
    }
  };

  // Data fetching
  const fetchDraftsForCurrentWeek = useCallback(async () => {
    if (!user?.username || !weekStartDate) return;
    
    try {
      const response = await TimesheetService.getDraftsForWeek(user.username, weekStartDate);
      
      if (response.success && response.draft) {
        const draftData = response.draft as DraftTimesheet;
        
        // Mark entries as drafts
        const draftEntries = draftData.entries.map(entry => ({
          ...entry,
          isDraft: true,
          draftId: draftData._id
        }));
        
        setEntries(prev => {
          // Filter out initial empty entries if we have drafts
          const filtered = draftEntries.length > 0 
            ? prev.filter(entry => entry.client || entry.project || entry.subject || 
                Object.values(entry.hours).some(h => h && h !== "0"))
            : prev;
          
          // Combine with drafts
          return [...filtered, ...draftEntries];
        });
        
        // If draft has work description, use it
        if (draftData.workDescription && draftData.workDescription !== "Draft") {
          setWorkDescription(draftData.workDescription);
        }
        
        // Set day status if available
        if (draftData.dayStatus && Object.keys(draftData.dayStatus).length > 0) {
          setDayStatus(draftData.dayStatus);
        }
        
        setHasDrafts(true);
        setHasTimesheetData(true);
        
        // Check if banner has been closed previously
        const isBannerClosed = localStorage.getItem(`draft_banner_closed_${user.username}_${weekStartDate}`);
        if (!isBannerClosed) {
          setShowPersistentBanner(true);
        }
      }
    } catch (error) {
      console.error("Error fetching draft data:", error);
    }
  }, [user?.username, weekStartDate]);

  const fetchTimesheetForCurrentWeek = useCallback(async () => {
    if (!user?.username) return;
  
    try {
      setLoading(true);
      setDataNotFound(false);
      
      const weekStartDateStr = weekDates[0].toISOString().split('T')[0];
      setWeekStartDate(weekStartDateStr);
      
      // Use priority logic to determine what data to show
      const priorityData = await TimesheetService.getPriorityDataForWeek(
        user.username, 
        weekStartDateStr
      );
      
      if (priorityData.dataSource === 'timesheet') {
        // Load timesheet data
        const timesheet = priorityData.data as Timesheet;
        setCurrentTimesheetId(timesheet._id);
        setIsWeekEditable(timesheet.timesheetStatus === "rejected");
        
        setEntries(
          timesheet.entries.map((entry: TimeEntry) => ({
            ...entry,
            hours: entry.hours || {},
          }))
        );
        setWorkDescription(timesheet.workDescription || "");
        
        if (timesheet.dayStatus) {
          setDayStatus(timesheet.dayStatus);
        } else {
          initializeDefaultDayStatus();
        }
        
        setTimesheetStatus(timesheet.timesheetStatus || "unapproved");
        setHasTimesheetData(true);
        setHasDrafts(false);
        
        // If rejected, show a banner
        if (timesheet.timesheetStatus === "rejected") {
          setDraftBannerMessage("This timesheet was rejected. Please make the necessary corrections and resubmit.");
          setDraftBannerKey(Date.now());
          setShowDraftBanner(true);
        }
      } 
      else if (priorityData.dataSource === 'draft') {
        // Load draft data
        const draftData = priorityData.data as DraftTimesheet;
        
        // Mark entries as drafts
        const draftEntries = draftData.entries.map(entry => ({
          ...entry,
          isDraft: true,
          draftId: draftData._id
        }));
        
        // Only replace entries if we have draft entries
        if (draftEntries.length > 0) {
          setEntries(draftEntries);
          setHasDrafts(true);
          setHasTimesheetData(true);
        } else {
          setEntries(getInitialEntries());
          setHasDrafts(false);
          setHasTimesheetData(false);
        }
        
        // Set work description if available
        if (draftData.workDescription && draftData.workDescription !== "Draft") {
          setWorkDescription(draftData.workDescription);
        } else {
          setWorkDescription("");
        }
        
        // Set day status if available
        if (draftData.dayStatus && Object.keys(draftData.dayStatus).length > 0) {
          setDayStatus(draftData.dayStatus);
        } else {
          initializeDefaultDayStatus();
        }
        
        setCurrentTimesheetId("");
        setTimesheetStatus("unapproved");
        setIsWeekEditable(true);
        
        // Check if banner has been closed previously
        const isBannerClosed = localStorage.getItem(`draft_banner_closed_${user.username}_${weekStartDateStr}`);
        if (!isBannerClosed && draftEntries.length > 0) {
          // Show draft banner with message
          setDraftBannerMessage("You have saved entries for this week. Continue updating and save your work until you're ready to submit.");
          setDraftBannerKey(Date.now());
          setShowDraftBanner(true);
        }
      }
      else {
        // No data, show default empty rows
        resetToDefaultValues();
      }
    } catch (error) {
      console.error("Error fetching timesheet data:", error);
      resetToDefaultValues();
    } finally {
      setLoading(false);
    }
  }, [user?.username, weekDates, initializeDefaultDayStatus, resetToDefaultValues]);

  // Effects
  
  // Initial load - check for drafts and set up user data
  useEffect(() => {
    const loadUserAndPriorityData = async () => {
      const userData = TimesheetService.getUserFromLocalStorage();
      if (userData) {
        setUser(userData);
        
        // Get current week's start date
        const today = new Date();
        const weekStartStr = TimesheetService.getWeekStartDate(today);
        
        try {
          setLoading(true);
          
          // Set the week start date and update calendar
          setWeekStartDate(weekStartStr);
          setSelectedDate(new Date(weekStartStr));
          
          // Use the priority logic to determine which data to show
          const priorityData = await TimesheetService.getPriorityDataForWeek(
            userData.username, 
            weekStartStr
          );
          
          if (priorityData.dataSource === 'timesheet') {
            // Load timesheet data
            const timesheet = priorityData.data as Timesheet;
            setCurrentTimesheetId(timesheet._id);
            setIsWeekEditable(timesheet.timesheetStatus === "rejected");
            
            setEntries(
              timesheet.entries.map((entry: TimeEntry) => ({
                ...entry,
                hours: entry.hours || {},
              }))
            );
            setWorkDescription(timesheet.workDescription || "");
            
            if (timesheet.dayStatus) {
              setDayStatus(timesheet.dayStatus);
            } else {
              initializeDefaultDayStatus();
            }
            
            setTimesheetStatus(timesheet.timesheetStatus || "unapproved");
            setHasTimesheetData(true);
            setHasDrafts(false);
            
            // If rejected, show a banner
            if (timesheet.timesheetStatus === "rejected") {
              setDraftBannerMessage("This timesheet was rejected. Please make the necessary corrections and resubmit.");
              setDraftBannerKey(Date.now());
              setShowDraftBanner(true);
            }
          } 
          else if (priorityData.dataSource === 'draft') {
            // Load draft data
            const draftData = priorityData.data as DraftTimesheet;
            
            // Mark entries as drafts
            const draftEntries = draftData.entries.map(entry => ({
              ...entry,
              isDraft: true,
              draftId: draftData._id
            }));
            
            // Replace empty entries with draft entries - Important fix here
            setEntries(draftEntries.length > 0 ? draftEntries : getInitialEntries());
            
            // Set work description if available
            if (draftData.workDescription && draftData.workDescription !== "Draft") {
              setWorkDescription(draftData.workDescription);
            }
            
            // Set day status if available
            if (draftData.dayStatus && Object.keys(draftData.dayStatus).length > 0) {
              setDayStatus(draftData.dayStatus);
            } else {
              initializeDefaultDayStatus();
            }
            
            setHasDrafts(draftEntries.length > 0);
            setHasTimesheetData(draftEntries.length > 0);
            setCurrentTimesheetId("");
            setTimesheetStatus("unapproved");
            setIsWeekEditable(true);
            
            // Check if banner has been closed previously
            const isBannerClosed = localStorage.getItem(`draft_banner_closed_${userData.username}_${weekStartStr}`);
            if (!isBannerClosed && draftEntries.length > 0) {
              // Show draft banner with message
              setDraftBannerMessage("You have saved entries for this week. Continue updating and save your work until you're ready to submit.");
              setDraftBannerKey(Date.now());
              setShowDraftBanner(true);
            }
          }
          else {
            // No data, show default empty rows
            resetToDefaultValues();
          }
        } catch (error) {
          console.error("Error fetching initial data:", error);
          resetToDefaultValues();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    loadUserAndPriorityData();
  }, []);

  // Critical fix: Ensure sidebar links work
  useEffect(() => {
    const ensureSidebarNavigationWorks = () => {
      document.querySelectorAll('a, button').forEach(element => {
        element.setAttribute('data-navigation-enabled', 'true');
      });
    };

    ensureSidebarNavigationWorks();
    const interval = setInterval(ensureSidebarNavigationWorks, 1000);
    return () => clearInterval(interval);
  }, [hasTimesheetData]);

  // Analytics calculation
  useEffect(() => {
    if (entries.length > 0 && entries.some(entry => entry.project)) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateProjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries, calculateDailyHoursData, calculateProjectHoursData]);

  // Initialize day status
  useEffect(() => {
    if (Object.keys(dayStatus).length === 0) {
      initializeDefaultDayStatus();
    }
  }, [weekDates, dayStatus, initializeDefaultDayStatus]);

  // Filter clients
  useEffect(() => {
    if (user && clients.length > 0) {
      const filtered = clients.filter(client => 
        client.assignedTo.length === 0 || client.assignedTo.includes(user.name)
      );
      setFilteredClients(filtered);
    }
  }, [user, clients]);

  // Filter projects
  useEffect(() => {
    if (user && projects.length > 0) {
      const filtered = projects.filter(project => 
        project.assignedTo.length === 0 || project.assignedTo.includes(user.name)
      );
      setFilteredProjects(filtered);
    }
  }, [user, projects]);

  // Filter subjects
  useEffect(() => {
    if (user && subjects.length > 0) {
      const filtered = subjects.filter(subject => 
        !subject.assignedTo || 
        subject.assignedTo.length === 0 || 
        subject.assignedTo.includes(user.name)
      );
      setFilteredSubjects(filtered);
    }
  }, [user, subjects]);

  // Fetch master data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, projectsData, subjectsData] = await Promise.all([
          TimesheetService.fetchClients(),
          TimesheetService.fetchProjects(),
          TimesheetService.fetchSubjects(),
        ]);

        setClients(clientsData);
        setProjects(projectsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setClients([]);
        setProjects([]);
        setSubjects([]);
      }
    };

    fetchData();
  }, []);

  // Fetch timesheet data when date changes
  useEffect(() => {
    if (user?.username) {
      fetchTimesheetForCurrentWeek();
    } else {
      setLoading(false);
    }
  }, [selectedDate, user?.username, fetchTimesheetForCurrentWeek]);

  // Loading states
  if (loading) return <Loader />;
  if (submitting) return <Loader message="Submitting timesheet..." />;

  // Render component
  return (
    <div className={styles.container}>
      <Header title="Timesheet" user={user} />
      
      <Dialog 
        show={dialogData.show}
        title={dialogData.title}
        message={dialogData.message}
        isError={dialogData.isError}
        onClose={closeDialog}
      />
      
      <div className={styles.tableContainer}>
        {timesheetStatus === "rejected" && (
          <div className={styles.rejectionBanner}>
            <span>This timesheet was rejected. Please make the necessary corrections and resubmit.</span>
            {currentTimesheetId && (
              <span className={styles.timesheetId}>ID: {currentTimesheetId}</span>
            )}
          </div>
        )}
        
        {showDraftBanner && (
          <DraftBanner 
            key={draftBannerKey}
            message={draftBannerMessage} 
            onClose={closeDraftBanner} 
            isPersistent={false}
          />
        )}

        {showPersistentBanner && hasDrafts && isWeekEditable && !currentTimesheetId && (
          <DraftBanner
            message="You have saved entries for this week. Continue updating and save your work until you're ready to submit."
            onClose={closePersistentBanner}
            isPersistent={true}
          />
        )}
        
        <div className={styles.gridContainer}>
          <div className={styles.calendarSection}>
            <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Subject</th>
                  <th>Projects</th>
                  {weekDates.map((date) => (
                    <th key={date.toISOString()} className={styles.weekColumn}>
                      {TimesheetService.formatDate(date)}
                    </th>
                  ))}
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <TimesheetRow
                    key={entry.id}
                    entry={entry}
                    weekDates={weekDates}
                    isWeekEditable={isWeekEditable}
                    filteredClients={filteredClients}
                    filteredProjects={filteredProjects}
                    filteredSubjects={filteredSubjects}
                    handleClientChange={handleClientChange}
                    handleProjectChange={handleProjectChange}
                    handleSubjectChange={handleSubjectChange}
                    handleInputChange={handleInputChange}
                    calculateRowTotal={calculateRowTotal}
                    deleteRow={deleteRow}
                    saveRow={saveRow}
                    isSaving={isSaving}
                  />
                ))}

                <tr className={styles.totalRow}>
                  <td>
                    <button onClick={addNewRow} className={styles.button} disabled={!isWeekEditable}>
                      <Plus className={styles.buttonIcon} />
                      Project
                    </button>
                  </td>
                  <td></td>
                  <td>Total</td>
                  {weekDates.map((date) => (
                    <td key={date.toISOString()} className={styles.totalCell}>
                      {calculateDayTotal(date).toFixed(2)}
                    </td>
                  ))}
                  <td className={styles.totalCell}>{calculateWeekTotal().toFixed(2)}</td>
                  <td></td>
                </tr>

                <StatusRow
                  weekDates={weekDates}
                  dayStatus={dayStatus}
                  isWeekEditable={isWeekEditable}
                  handleStatusChange={handleStatusChange}
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.descriptionContainer}>
          <h3 className={styles.descriptionHeading}>Work Description *</h3>
          <textarea
            className={styles.descriptionTextarea}
            value={workDescription}
            disabled={!isWeekEditable}
            onChange={handleDescriptionChange}
            placeholder="Please provide a description of the work you've done this week..."
            rows={2}
          />
        </div>

        <div className={styles.submitWrapper}>
          {!isWeekEditable && (
            <div className={styles.timesheetStatus}>
              <span className={styles.statusLabel}>Timesheet Status:</span>
              <span className={`${styles.statusValue} ${styles[timesheetStatus]}`}>
                {timesheetStatus === "approved" ? "Approved" : 
                 timesheetStatus === "rejected" ? "Rejected" : "Pending Approval"}
              </span>
            </div>
          )}
          
          {hasDrafts && isWeekEditable && (
            <div className={styles.draftStatus}>
              <span className={styles.statusLabel}>Status:</span>
              <span className={`${styles.statusValue} ${styles.draft}`}>
                Draft Saved
              </span>
            </div>
          )}
          
          <button 
            className={styles.submitButton} 
            onClick={handleSubmit} 
            disabled={!isWeekEditable}
          >
            {timesheetStatus === "rejected" ? "Resubmit for approval" : "Submit for approval"}
          </button>
        </div>
        
        {hasTimesheetData && (
          <div className={styles.analyticsSection}>
            <h3 className={styles.analyticsTitle}>Analytics for the week</h3>
            <div className={styles.chartsContainer}>
              <BarChartComponent dailyHoursData={dailyHoursData} />
              <PieChartComponent 
                projectHoursData={projectHoursData} 
                formatHoursAndMinutes={formatHoursAndMinutes} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomepageContent;