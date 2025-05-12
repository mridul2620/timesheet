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
import TimesheetRow from "./timesheetRow";

const HomepageContent: React.FC = () => {
  const subjectColors = [
    "#3b82f6", "#22d3ee", "#f97316", "#a855f7", "#06b6d4", 
    "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"
  ];
  const getInitialEntries = (): TimeEntry[] => {
    return Array(2).fill(null).map((_, index) => ({
      id: String(index + 1),
      client: "",
      project: "",
      subject: "",
      hours: {},
    }));
  };

  const [entries, setEntries] = useState<TimeEntry[]>(getInitialEntries());
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workDescription, setWorkDescription] = useState("");
  const [dayStatus, setDayStatus] = useState<{ [key: string]: string }>({});
  const [showWeekend, setShowWeekend] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isWeekEditable, setIsWeekEditable] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<string>("unapproved");
  const [currentTimesheetId, setCurrentTimesheetId] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [hasTimesheetData, setHasTimesheetData] = useState(false);
  const [dataNotFound, setDataNotFound] = useState(false);
  const [allocatedHours, setAllocatedHours] = useState<number>(0);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const [dailyHoursData, setDailyHoursData] = useState<DailyHours[]>([]);
  const [subjectHoursData, setSubjectHoursData] = useState<{
    subject: string;
    hours: number;
    color: string;
  }[]>([]);
  const [dialogData, setDialogData] = useState<DialogData>({
    show: false,
    title: "",
    message: "",
    isError: false,
  });
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});
  const [hasDrafts, setHasDrafts] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showPersistentBanner, setShowPersistentBanner] = useState(false);
  const [draftBannerMessage, setDraftBannerMessage] = useState("");
  const [draftBannerKey, setDraftBannerKey] = useState(0);

  const getWeekDatesStartingMonday = (date: Date): Date[] => {
    const inputDate = new Date(date.getTime());
    inputDate.setHours(0, 0, 0, 0);
    const dayOfWeek = inputDate.getDay();
    const startDate = new Date(inputDate);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(inputDate.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  };

  const weekDates = useMemo(() => 
    getWeekDatesStartingMonday(selectedDate), 
    [selectedDate]
  );

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
    const newDayStatus: { [key: string]: string } = {};
    weekDates.forEach((date) => {
      const dayStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();
      newDayStatus[dayStr] = (dayOfWeek === 0 || dayOfWeek === 6) 
        ? "not-working" 
        : "working";
    });
    setDayStatus(newDayStatus);
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

  const toggleWeekend = () => {
    setShowWeekend(!showWeekend);
  };

  const updateRemainingHours = async (newRemainingHours: number) => {
    try {
      if (!user?.username) {
        console.error("Cannot update remaining hours: No user found");
        return false;
      }
      setHoursRemaining(newRemainingHours);
      const response = await axios.post(
        process.env.NEXT_PUBLIC_EDIT_USER_API || "/api/edituser",
        {
          username: user.username,
          remainingHours: newRemainingHours
        }
      );
  
      if (response.data.success) {
        try {
          const storedData = localStorage.getItem("loginResponse");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData.success && parsedData.user) {
              parsedData.user.remainingHours = newRemainingHours;
              localStorage.setItem("loginResponse", JSON.stringify(parsedData));
            }
          }
        } catch (error) {
          console.error("Error updating localStorage:", error);
        }
        
        return true;
      } else {
        console.error("Failed to update remaining hours:", response.data.message);
        return false;
      }
    } catch (error) {
      console.error("Error updating remaining hours:", error);
      return false;
    }
  };

  const calculateDailyHoursData = useCallback(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const abbreviations = ["M", "T", "W", "T", "F", "S", "S"];
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
  }, [entries, subjectColors]);

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

  const isRowComplete = useCallback((entry: TimeEntry) => {
    const hasBasicInfo = entry.client && entry.subject && entry.project;
    const hasHours = Object.values(entry.hours).some(h => h && parseFloat(h) >= 0);
    return hasBasicInfo && hasHours;
  }, []);

  const hasCompleteRow = useMemo(() => {
    return entries.some(entry => isRowComplete(entry));
  }, [entries, isRowComplete]);

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
      const oldEntry = prev.find(entry => entry.id === entryId);
      const oldHourValue = oldEntry ? Number.parseFloat(oldEntry.hours[day] || "0") : 0;
      const newHourValue = Number.parseFloat(value || "0");
      const hoursDifference = newHourValue - oldHourValue;
      
      const updatedEntries = prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, hours: { ...entry.hours, [day]: value }, isDraft: entry.isDraft }
          : entry
      );

      if (isWeekEditable) {
        setHoursRemaining(prevHours => prevHours - hoursDifference);
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

  const closeDraftBanner = () => {
    setShowDraftBanner(false);
  };
  
  const closePersistentBanner = () => {
    setShowPersistentBanner(false);
    if (user?.username && weekStartDate) {
      localStorage.setItem(`draft_banner_closed_${user.username}_${weekStartDate}`, "true");
    }
  };

  const deleteRow = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    let rowTotalHours = 0;
    if (entry) {
      rowTotalHours = Object.values(entry.hours).reduce((total, hours) => {
        return total + Number.parseFloat(hours || "0");
      }, 0);
    }

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
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    if (isWeekEditable) {
      const updatedRemainingHours = hoursRemaining + rowTotalHours;
      setHoursRemaining(updatedRemainingHours);
      if (user?.username) {
        await updateRemainingHours(updatedRemainingHours);
      }
    }
  };

  const saveRow = async (entry: TimeEntry) => {
    if (!user?.username || !weekStartDate) {
      showDialog("Error", "User information is missing or week not selected", true);
      return;
    }

    const hasClientOrProject = entry.client || entry.project || entry.subject;
    const hasHours = Object.values(entry.hours).some(h => h && parseFloat(h) >= 0);
    
    if (!hasClientOrProject && !hasHours) {
      showDialog("Error", "Entry has no data to save", true);
      return;
    }

    setIsSaving(prev => ({ ...prev, [entry.id]: true }));
    
    try {
      await updateRemainingHours(hoursRemaining);
      const response = await TimesheetService.saveDraftEntry(
        user.username,
        weekStartDate,
        entry,
        workDescription,
        dayStatus
      );
      
      if (response.success) {
        setEntries(prev => 
          prev.map(e => 
            e.id === entry.id 
              ? { ...e, isDraft: true, draftId: response.draftId } 
              : e
          )
        );
        setHasDrafts(true);
        setShowPersistentBanner(false);
        setDraftBannerMessage("Entry saved successfully. Continue updating and save your work until you're ready to submit.");
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
      if (!workDescription || workDescription.trim() === '') {
        showDialog("Error", "Please add a work description", true);
        return;
      }
  
      setSubmitting(true);
      await updateRemainingHours(hoursRemaining);
  
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

  const fetchTimesheetForCurrentWeek = useCallback(async (userData?: User | null, 
    specifiedWeekStartDate?: string) => {
    if (!user?.username && !userData?.username) return;
  
    try {
      setLoading(true);
      setDataNotFound(false);
      
      const username = userData?.username || user?.username;
      const weekStartDateStr = specifiedWeekStartDate || TimesheetService.getWeekStartDate(selectedDate);
      setWeekStartDate(weekStartDateStr);
      const priorityData = await TimesheetService.getPriorityDataForWeek(
        username!, 
        weekStartDateStr
      );
      
      if (priorityData.dataSource === 'timesheet') {
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

        if (timesheet.timesheetStatus === "rejected") {
          setDraftBannerMessage("This timesheet was rejected. Please make the necessary corrections and resubmit.");
          setDraftBannerKey(Date.now());
          setShowDraftBanner(true);
        }
      } 
      else if (priorityData.dataSource === 'draft') {
        const draftData = priorityData.data as DraftTimesheet;
        const draftEntries = draftData.entries.map(entry => ({
          ...entry,
          isDraft: true,
          draftId: draftData._id
        }));
        if (draftEntries.length > 0) {
          setEntries(draftEntries);
          setHasDrafts(true);
          setHasTimesheetData(true);
        } else {
          setEntries(getInitialEntries());
          setHasDrafts(false);
          setHasTimesheetData(false);
        }
        if (draftData.workDescription && draftData.workDescription !== "Draft") {
          setWorkDescription(draftData.workDescription);
        } else {
          setWorkDescription("");
        }
        if (draftData.dayStatus && Object.keys(draftData.dayStatus).length > 0) {
          setDayStatus(draftData.dayStatus);
        } else {
          initializeDefaultDayStatus();
        }
        
        setCurrentTimesheetId("");
        setTimesheetStatus("unapproved");
        setIsWeekEditable(true);

        const isBannerClosed = localStorage.getItem(`draft_banner_closed_${user?.username}_${weekStartDateStr}`);
        if (!isBannerClosed && draftEntries.length > 0) {
          setDraftBannerMessage("You have saved entries for this week. Continue updating and save your work until you're ready to submit.");
          setDraftBannerKey(Date.now());
          setShowDraftBanner(true);
        }
      }
      else {
        resetToDefaultValues();
      }
    } catch (error) {
      console.error("Error fetching timesheet data:", error);
      resetToDefaultValues();
    } finally {
      setLoading(false);
    }
  }, [user?.username, selectedDate, initializeDefaultDayStatus, resetToDefaultValues]);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success && parsedData.user) {
          const financialYear = TimesheetService.getFinancialYear(selectedDate);
          if (parsedData.user.allocatedHours) {
            const allocatedHoursEntry = parsedData.user.allocatedHours.find(
              (entry: { year: string; hours: string }) => entry.year === financialYear
            );
            
            if (allocatedHoursEntry) {
              const allocatedHoursValue = parseFloat(allocatedHoursEntry.hours);
              setAllocatedHours(allocatedHoursValue);
            }
          }

          if (parsedData.user.remainingHours !== undefined) {
            setHoursRemaining(Number(parsedData.user.remainingHours));
          }
        }
      }
    } catch (error) {
      console.error("Error getting hours data from localStorage:", error);
    }
  }, [selectedDate]);
 
  useEffect(() => {
    const loadUserAndTimesheetData = async () => {
      const userData = TimesheetService.getUserFromLocalStorage();
      if (userData) {
        setUser(userData);

        const today = new Date();
        const financialYear = TimesheetService.getFinancialYear(today);

        if (userData.allocatedHours) {
          const allocatedHoursEntry = userData.allocatedHours.find(
            (entry: { year: string; hours: string }) => entry.year === financialYear
          );
          
          if (allocatedHoursEntry) {
            const allocatedHoursValue = parseFloat(allocatedHoursEntry.hours);
            setAllocatedHours(allocatedHoursValue);
          }
        }

        if (userData.remainingHours !== undefined) {
          setHoursRemaining(Number(userData.remainingHours));
        }

        const weekStartStr = TimesheetService.getWeekStartDate(today);
        
        try {
          setLoading(true);
          setWeekStartDate(weekStartStr);
          setSelectedDate(today);
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
    loadUserAndTimesheetData();
  }, []);

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

  useEffect(() => {
    if (entries.length > 0 && entries.some(entry => entry.subject)) {
      setHasTimesheetData(true);
      calculateDailyHoursData();
      calculateSubjectHoursData();
    } else {
      setHasTimesheetData(false);
    }
  }, [entries, calculateDailyHoursData, calculateSubjectHoursData]);

  useEffect(() => {
    if (Object.keys(dayStatus).length === 0) {
      initializeDefaultDayStatus();
    }
  }, [weekDates, dayStatus, initializeDefaultDayStatus]);

  useEffect(() => {
    if (user && clients.length > 0) {
      const filtered = clients.filter(client => 
        client.assignedTo.length === 0 || client.assignedTo.includes(user.name)
      );
      setFilteredClients(filtered);
    }
  }, [user, clients]);

  useEffect(() => {
    if (user && projects.length > 0) {
      const filtered = projects.filter(project => 
        project.assignedTo.length === 0 || project.assignedTo.includes(user.name)
      );
      setFilteredProjects(filtered);
    }
  }, [user, projects]);

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

  useEffect(() => {
    if (user?.username) {
      fetchTimesheetForCurrentWeek();
    } else {
      setLoading(false);
    }
  }, [selectedDate, user?.username, fetchTimesheetForCurrentWeek]);

  if (loading) return <Loader />;
  if (submitting) return <Loader message="Submitting timesheet..." />;

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

  const visibleWeekDates = showWeekend 
    ? weekDates 
    : weekDates.filter(date => {
        const day = date.getDay();
        return day !== 0 && day !== 6;
      });

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
                    <TimesheetRow
                      key={entry.id}
                      entry={entry}
                      weekDates={visibleWeekDates}
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
                      isFieldEnabled={isFieldEnabled}
                    />
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

        <div className={styles.allocatedHoursContainer}>
          <div className={styles.allocatedHoursWrapper}>
            <span className={styles.allocatedHoursLabel}>Allocated Hours:</span>
            <span className={styles.allocatedHoursValue}>{allocatedHours.toFixed(2)}</span>
          </div>
          <div className={styles.allocatedHoursWrapper}>
            <span className={styles.allocatedHoursLabel}>Hours Remaining:</span>
            <span className={styles.hoursRemainingValue}>{hoursRemaining.toFixed(2)}</span>
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
