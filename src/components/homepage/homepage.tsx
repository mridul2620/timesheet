import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./homepage.module.css";
import Calendar from "../Calender";
import Loader from "../Loader/loader";
import Header from "../Header/header";
import BarChartComponent from "../Charts/barchart";
import PieChartComponent from "../Charts/piechart";
import Dialog from "./dialog";
import DraftBanner from "./draftBanner";
import TimesheetService from "./timesheetservive";
import { TimeEntry, User, Project, Subject, DailyHours, DialogData, Client, DraftTimesheet, Timesheet } from "./timesheetTypes";
import axios from "axios";
import StatusRow from "./timesheetStatus";

const HomepageContent: React.FC = () => {
  const subjectColors = [
    "#3b82f6", "#22d3ee", "#f97316", "#a855f7", "#06b6d4", 
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
  ];
  
  // Helper function to initialize empty timesheet rows
  const getInitialEntries = (): TimeEntry[] => {
    return Array(2).fill(null).map((_, index) => ({
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
  const [showWeekend, setShowWeekend] = useState(false);
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
  
  // Allocated hours tracking
  const [allocatedHours, setAllocatedHours] = useState<number>(0);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const [calculatingHours, setCalculatingHours] = useState<boolean>(false);
  const [previousSubmittedHours, setPreviousSubmittedHours] = useState<number>(0);
  
  // Analytics data
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  
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

  const getWeekDatesStartingMonday = (date: Date): Date[] => {
    // Create a copy of the date to avoid mutating the original
    const inputDate = new Date(date.getTime());
    
    // Set to midnight to ensure consistent behavior
    inputDate.setHours(0, 0, 0, 0);
    
    // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = inputDate.getDay();
    
    // Calculate the start date (Monday) of the week containing the selected date
    // If today is Sunday (0), we need to go back by 6 days to get to the previous Monday
    // Otherwise, we go back by (dayOfWeek - 1) days
    const startDate = new Date(inputDate);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(inputDate.getDate() - daysToSubtract);
    
    // Set to midnight to ensure consistency
    startDate.setHours(0, 0, 0, 0);
    
    // Create an array of all 7 days in the week, starting from Monday
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      day.setHours(0, 0, 0, 0); // Ensure consistent time for each date
      return day;
    });
  };

  // Get week dates based on selected date
  const getCorrectWeekDates = (date: Date): Date[] => {
    return getWeekDatesStartingMonday(date);
  };
  

  const weekDates = useMemo(() => 
    getWeekDatesStartingMonday(selectedDate), 
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

  // Weekend toggle handler
  const toggleWeekend = () => {
    setShowWeekend(!showWeekend);
  };

  const calculateDailyHoursData = useCallback(() => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const abbreviations = ["M", "T", "W", "T", "F", "S", "S"];
  
  // Since weekDates now starts with Monday, we can map directly
  const dailyData: DailyHours[] = weekDates.map((date, index) => {
    const dayStr = date.toISOString().split("T")[0];
    const dayHours = entries.reduce((total, entry) => {
      const hours = Number.parseFloat(entry.hours[dayStr] || "0");
      return total + hours;
    }, 0);

    return {
      day: days[index],
      abbreviation: abbreviations[index],
      hours: dayHours
    };
  });

  setDailyHoursData(dailyData);
}, [weekDates, entries]);

  const calculateSubjectHoursData = useCallback(() => {
    const subjectDataMap = new Map<string, { hours: number, color: string }>();

    entries.forEach(entry => {
      if (entry.subject) {
        const subjectHours = Object.values(entry.hours).reduce((total, hours) => {
          return total + Number.parseFloat(hours || "0");
        }, 0);
  
        if (subjectHours > 0) {
          if (!subjectDataMap.has(entry.subject)) {
            // Assign a unique color to each subject
            const color = subjectColors[subjectDataMap.size % subjectColors.length];
            subjectDataMap.set(entry.subject, { hours: subjectHours, color });
          } else {
            const existing = subjectDataMap.get(entry.subject)!;
            subjectDataMap.set(entry.subject, { 
              hours: existing.hours + subjectHours, 
              color: existing.color 
            });
          }
        }
      }
    });

    const subjectData = Array.from(subjectDataMap).map(([subject, data]) => ({
      subject,
      hours: data.hours,
      color: data.color
    }));
  
    setSubjectHoursData(subjectData);
  }, [entries]);

  const [subjectHoursData, setSubjectHoursData] = useState<{
    subject: string;
    hours: number;
    color: string;
  }[]>([]);

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
  
  // Validate if a row has all required fields filled
  const isRowComplete = useCallback((entry: TimeEntry) => {
    const hasBasicInfo = entry.client && entry.subject && entry.project;
    const hasHours = Object.values(entry.hours).some(h => h && parseFloat(h) > 0);
    return hasBasicInfo && hasHours;
  }, []);
  
  // Check if any row is complete for submit button validation
  const hasCompleteRow = useMemo(() => {
    return entries.some(entry => isRowComplete(entry));
  }, [entries, isRowComplete]);

 // Add these functions to your HomepageContent component

// Calculate total hours used across all timesheets
const fetchPreviousSubmittedHours = useCallback(async (username: string) => {
  try {
    setCalculatingHours(true);
    
    // Get the financial year for the selected date
    const financialYear = TimesheetService.getFinancialYear(selectedDate);
    
    // Get allocated hours for the selected date's financial year
    let allocatedHoursForYear = 0;
    
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success && parsedData.user && parsedData.user.allocatedHours) {
          // Find the allocated hours for the financial year
          const allocatedHoursEntry = parsedData.user.allocatedHours.find(
            (entry: { year: string; hours: string }) => entry.year === financialYear
          );
          
          if (allocatedHoursEntry) {
            allocatedHoursForYear = parseFloat(allocatedHoursEntry.hours);
            setAllocatedHours(allocatedHoursForYear);
          } else {
            setAllocatedHours(0);
          }
        }
      }
    } catch (error) {
      console.error("Error getting allocated hours:", error);
      setAllocatedHours(0);
    }
    
    // Calculate hours used in the current financial year
    const hoursUsed = await TimesheetService.calculateHoursUsedInFinancialYear(
      username,
      selectedDate,
      currentTimesheetId
    );
    
    setPreviousSubmittedHours(hoursUsed);
    
    // Only calculate current week hours if we're not viewing an already submitted timesheet
    if (!currentTimesheetId || timesheetStatus === "rejected") {
      // Calculate current week hours
      const currentWeekHours = calculateWeekTotal();
      
      // Calculate and set remaining hours
      setHoursRemaining(allocatedHoursForYear - hoursUsed - currentWeekHours);
    } else {
      // For submitted timesheets that we're viewing, don't double-count
      setHoursRemaining(allocatedHoursForYear - hoursUsed);
    }
    
    return hoursUsed;
  } catch (error) {
    console.error("Error fetching previous timesheet hours:", error);
    return 0;
  } finally {
    setCalculatingHours(false);
  }
}, [selectedDate, calculateWeekTotal, currentTimesheetId, timesheetStatus]);

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
    setEntries((prev) => {
      const updatedEntries = prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, hours: { ...entry.hours, [day]: value }, isDraft: entry.isDraft }
          : entry
      );
      
      // Recalculate hours remaining when hours are updated
      if (!currentTimesheetId || timesheetStatus === "rejected") {
        // Recalculate hours remaining when hours are updated
        const weekTotal = updatedEntries.reduce((total, entry) => {
          return total + Object.values(entry.hours).reduce((rowTotal, hours) => {
            return rowTotal + Number.parseFloat(hours || "0");
          }, 0);
        }, 0);
        
        // Update hours remaining
        setHoursRemaining(allocatedHours - previousSubmittedHours - weekTotal);
      }
      
      return updatedEntries;
    });
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
    setEntries((prev) => {
      const updatedEntries = prev.filter((entry) => entry.id !== entryId);
      
      // Recalculate hours remaining
      const weekTotal = updatedEntries.reduce((total, entry) => {
        return total + Object.values(entry.hours).reduce((rowTotal, hours) => {
          return rowTotal + Number.parseFloat(hours || "0");
        }, 0);
      }, 0);
      
      // Update hours remaining
      setHoursRemaining(allocatedHours - previousSubmittedHours - weekTotal);
      
      return updatedEntries;
    });
  };

  const saveRow = async (entry: TimeEntry) => {
    if (!user?.username || !weekStartDate) {
      showDialog("Error", "User information is missing or week not selected", true);
      return;
    }
    
    // Check if entry has any data worth saving
    const hasClientOrProject = entry.client || entry.project || entry.subject;
    const hasHours = Object.values(entry.hours).some(h => h && parseFloat(h) >= 0);
    
    if (!hasClientOrProject && !hasHours) {
      showDialog("Error", "Entry has no data to save", true);
      return;
    }
    
    // Set loading state for this specific row
    setIsSaving(prev => ({ ...prev, [entry.id]: true }));
    
    try {
      // Always include the current workDescription in the save request
      // This ensures the description is saved even when updating a row
      const response = await TimesheetService.saveDraftEntry(
        user.username,
        weekStartDate,
        entry,
        workDescription, // Always send the current workDescription
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
          
          // Update previous submitted hours after submitting
          if (user?.username) {
            fetchPreviousSubmittedHours(user.username);
          }
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
          
          // Update previous submitted hours after submitting
          if (user?.username) {
            fetchPreviousSubmittedHours(user.username);
          }
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

  const fetchTimesheetForCurrentWeek = useCallback(async (userData?: User | null, 
    specifiedWeekStartDate?: string) => {
    if (!user?.username) return;
  
    try {
      setLoading(true);
      setDataNotFound(false);
      
      const username = userData?.username || user?.username;
      const weekStartDateStr = specifiedWeekStartDate || TimesheetService.getWeekStartDate(selectedDate);
      setWeekStartDate(weekStartDateStr);
      
      // Use priority logic to determine what data to show
      const priorityData = await TimesheetService.getPriorityDataForWeek(
        username, 
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
  }, [user?.username, selectedDate, initializeDefaultDayStatus, resetToDefaultValues]);

  // Effects
  
  // Get allocated hours from localStorage and setup calculations
  useEffect(() => {
    // Get allocated hours from localStorage
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success && parsedData.user && parsedData.user.allocatedHours) {
          const financialYear = TimesheetService.getFinancialYear(selectedDate);
          
          // Find the allocated hours for the financial year
          const allocatedHoursEntry = parsedData.user.allocatedHours.find(
            (entry: { year: string; hours: string }) => entry.year === financialYear
          );
          
          if (allocatedHoursEntry) {
            const allocatedHoursValue = parseFloat(allocatedHoursEntry.hours);
            setAllocatedHours(allocatedHoursValue);
            
            // Initialize with allocated hours, but show loading until we calculate properly
            setHoursRemaining(allocatedHoursValue);
            setCalculatingHours(true);
          } else {
            setAllocatedHours(0);
            setHoursRemaining(0);
          }
        }
      }
    } catch (error) {
      console.error("Error getting allocated hours:", error);
    }
  }, [selectedDate]);
  
  
  // Calculate hours used when user data or entries change
  useEffect(() => {
    if (user?.username && allocatedHours > 0) {
      fetchPreviousSubmittedHours(user.username);
    }
  }, [user?.username, allocatedHours, fetchPreviousSubmittedHours, currentTimesheetId, timesheetStatus]);
  
  // Initial load - check for drafts and set up user data
  useEffect(() => {
    const loadUserAndPriorityData = async () => {
      const userData = TimesheetService.getUserFromLocalStorage();
      if (userData) {
        setUser(userData);
        
        // Get the current date and its financial year
        const today = new Date();
        const financialYear = TimesheetService.getFinancialYear(today);
        
        // Get allocated hours for the current financial year
        if (userData.allocatedHours) {
          const allocatedHoursEntry = userData.allocatedHours.find(
            (entry: { year: string; hours: string }) => entry.year === financialYear
          );
          
          if (allocatedHoursEntry) {
            const allocatedHoursValue = parseFloat(allocatedHoursEntry.hours);
            setAllocatedHours(allocatedHoursValue);
            setHoursRemaining(allocatedHoursValue);
          } else {
            setAllocatedHours(0);
            setHoursRemaining(0);
          }
        }
        
        // Only proceed if we have a valid user
        const weekStartStr = TimesheetService.getWeekStartDate(today);
        
        try {
          setLoading(true);
          setWeekStartDate(weekStartStr);
          setSelectedDate(today);
          
          // Use a single source of truth for data fetching
          await fetchTimesheetForCurrentWeek(userData, weekStartStr);
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
    if (entries.length > 0 && entries.some(entry => entry.subject)) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateSubjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries, calculateDailyHoursData, calculateSubjectHoursData]);

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
//if (calculatingHours) return <Loader message="Calculating allocated hours..." />;

  // Check if field should be enabled based on the sequential validation rule
  const isFieldEnabled = (entry: TimeEntry, field: 'subject' | 'project' | 'hours') => {
    if (!isWeekEditable) return false;
    
    switch (field) {
      case 'subject':
        return !!entry.client;
      case 'project':
        return !!entry.client && !!entry.subject;
      case 'hours':
        return !!entry.client && !!entry.subject && !!entry.project;
      default:
        return true;
    }
  };

  // Filter week dates based on weekend toggle
  const visibleWeekDates = showWeekend 
    ? weekDates 
    : weekDates.filter(date => {
        const day = date.getDay();
        return day !== 0 && day !== 6; // Filter out Saturday (6) and Sunday (0)
      });

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
            <div className={styles.toggleContainer}>
              <button
                className={styles.weekendToggleButton}
                onClick={toggleWeekend}
                title={showWeekend ? "Hide weekend" : "Show weekend"}
              >
                {showWeekend ? "- Weekend" : "+ Weekend"}
              </button>
            </div>
            
            <div className={styles.responsiveTableContainer}>
              <table className={styles.table}>
                <thead>
                <StatusRow 
          weekDates={visibleWeekDates}
          dayStatus={dayStatus}
          isWeekEditable={isWeekEditable}
          handleStatusChange={handleStatusChange}
        />
                  <tr>
                    <th>Client</th>
                    <th>Subject</th>
                    <th>Projects</th>
                    {visibleWeekDates.map((date) => (
                      <th key={date.toISOString()}>
                        {TimesheetService.formatDate(date)}
                      </th>
                    ))}
                    <th className={styles.totalColumn}>Total</th>
                    <th className={styles.actionColumn}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <select
                          className={`${styles.select} ${styles.clientSelect}`}
                          value={entry.client || ""}
                          onChange={(e) => handleClientChange(entry.id, e.target.value)}
                          disabled={!isWeekEditable}
                        >
                          <option value="">Select</option>
                          {filteredClients.map((client) => (
                            <option key={client._id} value={client.name}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          value={entry.subject}
                          onChange={(e) => handleSubjectChange(entry.id, e.target.value)}
                          disabled={!isFieldEnabled(entry, 'subject')}
                        >
                          <option value="">Select</option>
                          {filteredSubjects.map((subject) => (
                            <option key={subject._id} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          value={entry.project}
                          onChange={(e) => handleProjectChange(entry.id, e.target.value)}
                          disabled={!isFieldEnabled(entry, 'project')}
                        >
                          <option value="">Select</option>
                          {filteredProjects.map((project) => (
                            <option key={project._id} value={project.name}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      {visibleWeekDates.map((date) => {
                        const dayStr = date.toISOString().split("T")[0];
                        return (
                          <td key={dayStr}>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={entry.hours[dayStr] || ""}
                              onChange={(e) => handleInputChange(entry.id, dayStr, e.target.value)}
                              disabled={!isFieldEnabled(entry, 'hours')}
                              className={styles.hourInput}
                            />
                          </td>
                        );
                      })}
                      <td className={styles.totalCell}>{calculateRowTotal(entry).toFixed(2)}</td>
                      <td>
  <div className={styles.actionButtons}>
    <button
      onClick={() => saveRow(entry)}
      className={`${styles.saveButton} ${entry.isDraft ? styles.saved : ''} ${isSaving[entry.id] ? styles.saving : ''}`}
      disabled={!isWeekEditable || isSaving[entry.id]}
      title="Save row"
    >
      <Save size={16} />
    </button>
    <button
      onClick={() => deleteRow(entry.id)}
      className={styles.deleteButton}
      disabled={!isWeekEditable}
      title="Delete row"
    >
      <Trash2 size={16} />
    </button>
  </div>
</td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td colSpan={3}>Total</td>
                    {visibleWeekDates.map((date) => (
                      <td key={date.toISOString()}>
                        {calculateDayTotal(date).toFixed(2)}
                      </td>
                    ))}
                    <td>{calculateWeekTotal().toFixed(2)}</td>
                    <td>
                      {isWeekEditable && (
                        <button
                          onClick={addNewRow}
                          className={styles.button}
                          title="Add row"
                        >
                          <Plus size={16} className={styles.buttonIcon} />Project
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Allocated Hours Section */}
        <div className={styles.allocatedHoursContainer}>
  <div className={styles.allocatedHoursWrapper}>
    <span className={styles.allocatedHoursLabel}>Allocated Hours:</span>
    <span className={styles.allocatedHoursValue}>{allocatedHours.toFixed(2)}</span>
  </div>
  {/* <div className={styles.allocatedHoursWrapper}>
    <span className={styles.allocatedHoursLabel}>Total hours left:</span>
    <span className={styles.hoursRemainingValue}>{hoursRemaining.toFixed(2)}</span>
  </div> */}
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
            disabled={!isWeekEditable || !hasCompleteRow || !workDescription.trim()}
          >
            {timesheetStatus === "rejected" ? "Resubmit" : "Submit"}
          </button>
        </div>
        
        {hasTimesheetData && (
          <div className={styles.analyticsSection}>
            <h3 className={styles.analyticsTitle}>Analytics for the week</h3>
            <div className={styles.chartsContainer}>
              <BarChartComponent dailyHoursData={dailyHoursData} />
              <PieChartComponent 
                subjectHoursData={subjectHoursData} 
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
