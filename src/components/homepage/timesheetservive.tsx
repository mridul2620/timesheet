import axios from "axios";
import { TimeEntry, Timesheet, User } from "./timesheetTypes";


class TimesheetService {
  async getTimesheetForWeek(username: string, weekStartDate: string): Promise<Timesheet | null> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`
      );

      if (!response.data.success) {
        return null;
      }

      const timesheets = response.data.timesheets || [];
      if (timesheets.length === 0) {
        return null;
      }

      // First try to find a timesheet that exactly matches the week start date
      let relevantTimesheet = timesheets.find(
        (timesheet: Timesheet) => timesheet.weekStartDate === weekStartDate
      );

      // If no exact match, try to find a timesheet that has entries for any day in the week
      if (!relevantTimesheet) {
        const weekDaysArray = this.generateWeekDays(weekStartDate);
        relevantTimesheet = timesheets.find((timesheet: Timesheet) => {
          return timesheet.entries.some((entry: TimeEntry) => {
            return Object.keys(entry.hours).some((dateStr) =>
              weekDaysArray.includes(dateStr)
            );
          });
        });
      }

      return relevantTimesheet || null;
    } catch (error) {
      console.error("Error fetching timesheet data:", error);
      return null;
    }
  }

  async submitTimesheet(timesheetData: any): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(
        process.env.NEXT_PUBLIC_SUBMIT_API as string,
        timesheetData
      );

      if (response.data.message === "Timesheet submitted successfully") {
        return { success: true, message: "Timesheet submitted successfully!" };
      } else {
        return { success: false, message: "Failed to submit timesheet. Please try again." };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `Failed to submit timesheet: ${
            error.response?.data?.message || "An unknown error occurred"
          }`,
        };
      }
      return { success: false, message: "An error occurred while submitting the timesheet." };
    }
  }

  async updateTimesheet(
    timesheetId: string,
    timesheetData: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_UPDATE_TIMESHEET_API || "/api/timesheet/update"}/${timesheetId}`,
        timesheetData
      );

      if (response.data.success) {
        return { success: true, message: "Timesheet updated and resubmitted successfully!" };
      } else {
        return { success: false, message: "Failed to update timesheet. Please try again." };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `Failed to update timesheet: ${
            error.response?.data?.message || "An unknown error occurred"
          }`,
        };
      }
      return { success: false, message: "An error occurred while updating the timesheet." };
    }
  }

async fetchClients(): Promise<any[]> {
  try {
    const response = await axios.get(process.env.NEXT_PUBLIC_CLIENT_API as string);
    return response.data?.clients ? response.data.clients : [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

  async fetchProjects(): Promise<any[]> {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_PROJECTS_API as string);
      return response.data?.success && response.data?.projects
        ? response.data.projects
        : [];
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  async fetchSubjects(): Promise<any[]> {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_SUBJECTS_API as string);
      return response.data?.subjects ? response.data.subjects : [];
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }

  generateWeekDays(startDateStr: string): string[] {
    const startDate = new Date(startDateStr);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }

  getWeekDates(date: Date): Date[] {
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }

  formatDate(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  formatHoursAndMinutes(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  getUserFromLocalStorage(): User | null {
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (!storedData) return null;
      
      const parsedData = JSON.parse(storedData);
      return parsedData.success ? parsedData.user : null;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  }

  initializeDayStatus(weekDates: Date[]): { [key: string]: string } {
    const newDayStatus: { [key: string]: string } = {};
    weekDates.forEach((date) => {
      const dayStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();
      newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
    });
    return newDayStatus;
  }
}

export default new TimesheetService();