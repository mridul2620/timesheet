export type TimeEntry = {
    id: string;
    project: string;
    subject: string;
    hours: { [key: string]: string };
  };
  
  export type Timesheet = {
    _id: string;
    username: string;
    weekStartDate: string;
    entries: TimeEntry[];
    workDescription: string;
    timesheetStatus?: string;
    dayStatus?: { [key: string]: string };
  };
  
  export type User = {
    name: string;
    username: string;
    email: string;
    role: string;
    designation: string;
  };
  
  export type DialogData = {
    show: boolean;
    title: string;
    message: string;
    isError: boolean;
  };
  
  export type DailyHours = {
    day: string;
    abbreviation: string;
    hours: number;
  };
  
  export type ProjectHours = {
    project: string;
    hours: number;
    color: string;
  };
  
  export type Project = {
    _id: string;
    name: string;
    assignedTo: string[];
  };
  
  export type Subject = {
    _id: string;
    name: string;
    assignedTo: string[];
  };