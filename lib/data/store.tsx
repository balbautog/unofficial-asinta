'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Project,
  Invoice,
  Expense,
  Worker,
  Client,
  Advance,
  Attendance,
  Payroll,
  Tool,
  SMSLog,
  ProjectSupervisor,
  User,
  ExpenseCategory,
  AttendanceStatus,
} from '@/types';
import {
  INITIAL_PROJECTS,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_WORKERS,
  INITIAL_CLIENTS,
  INITIAL_ADVANCES,
  INITIAL_ATTENDANCE,
  INITIAL_PAYROLL,
  INITIAL_TOOLS,
  INITIAL_SMS_LOGS,
  INITIAL_PROJECT_SUPERVISORS,
  INITIAL_USERS,
} from './mockData';

interface DataStoreContextType {
  // State
  projects: Project[];
  invoices: Invoice[];
  expenses: Expense[];
  workers: Worker[];
  clients: Client[];
  advances: Advance[];
  attendance: Attendance[];
  payroll: Payroll[];
  tools: Tool[];
  smsLogs: SMSLog[];
  projectSupervisors: ProjectSupervisor[];
  users: User[];
  isLoaded: boolean;

  // Project Actions
  createProject: (data: Omit<Project, 'id' | 'created_at'>) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  getProjectsForSupervisor: (supervisorId: string) => Project[];

  // Client Actions
  createClient: (data: Omit<Client, 'id' | 'created_at'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Worker Actions
  createWorker: (data: Omit<Worker, 'id' | 'created_at'>) => Worker;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  toggleWorkerStatus: (id: string) => void;

  // Invoice Actions
  createInvoice: (data: Omit<Invoice, 'id' | 'created_at'>) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  recordInvoicePayment: (id: string, amount: number) => void;
  deleteInvoice: (id: string) => void;

  // Expense Actions
  createExpense: (data: Omit<Expense, 'id' | 'created_at'>) => Expense;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  confirmAIExpense: (id: string, finalCategory: ExpenseCategory, isBale: boolean) => void;

  // Bale / Advance Actions
  createAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'amount_deducted' | 'status'>) => Advance;
  recordAdvanceDeduction: (id: string, deductionAmount: number) => void;
  updateAdvanceStatus: (id: string, status: Advance['status']) => void;

  // Attendance Actions
  recordAttendanceBatch: (records: Array<{
    worker_id: string;
    project_id: string;
    date: string;
    status: AttendanceStatus;
    hours_worked: number;
    notes?: string | null;
    recorded_by: string;
  }>) => void;
  updateAttendanceRecord: (id: string, data: Partial<Attendance>, isFounderOverride?: boolean) => void;
  getAttendanceForProjectAndDate: (projectId: string, date: string) => Attendance[];

  // Payroll Actions
  createPayrollRun: (periodStart: string, periodEnd: string) => void;
  updatePayrollStatus: (id: string, status: Payroll['status']) => void;

  // Tool Actions
  createTool: (data: Omit<Tool, 'id' | 'created_at'>) => Tool;
  updateTool: (id: string, data: Partial<Tool>) => void;
  deleteTool: (id: string) => void;

  // SMS Actions
  sendSMS: (recipient: string, phone: string, message: string, invoiceId?: string) => Promise<boolean>;

  // Analytics
  getFounderMetrics: () => {
    totalProjects: number;
    activeProjects: number;
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueInvoicesCount: number;
    totalExpenses: number;
    expensesByCategory: Record<ExpenseCategory, number>;
    totalPayrollPending: number;
    totalBaleBalance: number;
    projectFinancials: Array<{
      id: string;
      name: string;
      budget: number;
      invoiced: number;
      collected: number;
      expenses: number;
      profit: number;
      margin: number;
    }>;
  };

  // Reset / Seeding
  resetToDefault: () => void;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

const STORAGE_PREFIX = 'bale_storage_v1_';

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [advances, setAdvances] = useState<Advance[]>(INITIAL_ADVANCES);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [payroll, setPayroll] = useState<Payroll[]>(INITIAL_PAYROLL);
  const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>(INITIAL_SMS_LOGS);
  const [projectSupervisors, setProjectSupervisors] = useState<ProjectSupervisor[]>(INITIAL_PROJECT_SUPERVISORS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const getStored = <T,>(key: string, defaultVal: T): T => {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultVal;
      };

      setProjects(getStored('projects', INITIAL_PROJECTS));
      setInvoices(getStored('invoices', INITIAL_INVOICES));
      setExpenses(getStored('expenses', INITIAL_EXPENSES));
      setWorkers(getStored('workers', INITIAL_WORKERS));
      setClients(getStored('clients', INITIAL_CLIENTS));
      setAdvances(getStored('advances', INITIAL_ADVANCES));
      setAttendance(getStored('attendance', INITIAL_ATTENDANCE));
      setPayroll(getStored('payroll', INITIAL_PAYROLL));
      setTools(getStored('tools', INITIAL_TOOLS));
      setSmsLogs(getStored('smsLogs', INITIAL_SMS_LOGS));
      setProjectSupervisors(getStored('projectSupervisors', INITIAL_PROJECT_SUPERVISORS));
      setUsers(getStored('users', INITIAL_USERS));
    } catch (e) {
      console.warn('LocalStorage hydration fallback to mock initial', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to localStorage
  const persist = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, []);

  // --- PROJECT ACTIONS ---
  const createProject = (data: Omit<Project, 'id' | 'created_at'>): Project => {
    const newProj: Project = {
      ...data,
      id: `proj-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newProj, ...projects];
    setProjects(updated);
    persist('projects', updated);
    return newProj;
  };

  const updateProject = (id: string, data: Partial<Project>) => {
    const updated = projects.map((p) => (p.id === id ? { ...p, ...data } : p));
    setProjects(updated);
    persist('projects', updated);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    persist('projects', updated);
  };

  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  const getProjectsForSupervisor = (supervisorId: string): Project[] => {
    const assignedIds = projectSupervisors
      .filter((ps) => ps.supervisor_id === supervisorId)
      .map((ps) => ps.project_id);
    return projects.filter((p) => assignedIds.includes(p.id));
  };

  // --- CLIENT ACTIONS ---
  const createClient = (data: Omit<Client, 'id' | 'created_at'>): Client => {
    const newCli: Client = {
      ...data,
      id: `cli-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newCli, ...clients];
    setClients(updated);
    persist('clients', updated);
    return newCli;
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, ...data } : c));
    setClients(updated);
    persist('clients', updated);
  };

  const deleteClient = (id: string) => {
    const updated = clients.filter((c) => c.id !== id);
    setClients(updated);
    persist('clients', updated);
  };

  // --- WORKER ACTIONS ---
  const createWorker = (data: Omit<Worker, 'id' | 'created_at'>): Worker => {
    const newWrk: Worker = {
      ...data,
      id: `wrk-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [...workers, newWrk];
    setWorkers(updated);
    persist('workers', updated);
    return newWrk;
  };

  const updateWorker = (id: string, data: Partial<Worker>) => {
    const updated = workers.map((w) => (w.id === id ? { ...w, ...data } : w));
    setWorkers(updated);
    persist('workers', updated);
  };

  const toggleWorkerStatus = (id: string) => {
    const updated = workers.map((w) => (w.id === id ? { ...w, active: !w.active } : w));
    setWorkers(updated);
    persist('workers', updated);
  };

  // --- INVOICE ACTIONS ---
  const createInvoice = (data: Omit<Invoice, 'id' | 'created_at'>): Invoice => {
    const newInv: Invoice = {
      ...data,
      id: `inv-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newInv, ...invoices];
    setInvoices(updated);
    persist('invoices', updated);
    return newInv;
  };

  const updateInvoice = (id: string, data: Partial<Invoice>) => {
    const updated = invoices.map((inv) => {
      if (inv.id === id) {
        const merged = { ...inv, ...data };
        // Automatic status recalculation based on amount_paid vs amount
        if (merged.amount_paid >= merged.amount && merged.amount > 0) {
          merged.status = 'paid';
        } else if (merged.amount_paid > 0 && merged.amount_paid < merged.amount) {
          merged.status = 'partially_paid';
        }
        return merged;
      }
      return inv;
    });
    setInvoices(updated);
    persist('invoices', updated);
  };

  const recordInvoicePayment = (id: string, amount: number) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const newPaid = Number(inv.amount_paid) + Number(amount);
    const newStatus = newPaid >= inv.amount ? 'paid' : 'partially_paid';
    updateInvoice(id, { amount_paid: newPaid, status: newStatus });
  };

  const deleteInvoice = (id: string) => {
    const updated = invoices.filter((i) => i.id !== id);
    setInvoices(updated);
    persist('invoices', updated);
  };

  // --- EXPENSE ACTIONS ---
  const createExpense = (data: Omit<Expense, 'id' | 'created_at'>): Expense => {
    const newExp: Expense = {
      ...data,
      id: `exp-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    persist('expenses', updated);
    return newExp;
  };

  const updateExpense = (id: string, data: Partial<Expense>) => {
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
    setExpenses(updated);
    persist('expenses', updated);
  };

  const deleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    persist('expenses', updated);
  };

  const confirmAIExpense = (id: string, finalCategory: ExpenseCategory, isBale: boolean) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    updateExpense(id, {
      category: finalCategory,
      ai_confirmed: true,
    });
  };

  // --- BALE / ADVANCES ACTIONS ---
  const createAdvance = (data: Omit<Advance, 'id' | 'created_at' | 'amount_deducted' | 'status'>): Advance => {
    const newAdv: Advance = {
      ...data,
      id: `adv-${Date.now().toString().slice(-6)}`,
      amount_deducted: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    const updated = [newAdv, ...advances];
    setAdvances(updated);
    persist('advances', updated);
    return newAdv;
  };

  const recordAdvanceDeduction = (id: string, deductionAmount: number) => {
    const updated = advances.map((adv) => {
      if (adv.id === id) {
        const newDeducted = Math.min(adv.amount, Number(adv.amount_deducted) + Number(deductionAmount));
        const newStatus: Advance['status'] = newDeducted >= adv.amount ? 'fully_deducted' : 'partially_deducted';
        return {
          ...adv,
          amount_deducted: newDeducted,
          status: newStatus,
        };
      }
      return adv;
    });
    setAdvances(updated);
    persist('advances', updated);
  };

  const updateAdvanceStatus = (id: string, status: Advance['status']) => {
    const updated = advances.map((a) => (a.id === id ? { ...a, status } : a));
    setAdvances(updated);
    persist('advances', updated);
  };

  // --- ATTENDANCE ACTIONS ---
  const recordAttendanceBatch = (
    records: Array<{
      worker_id: string;
      project_id: string;
      date: string;
      status: AttendanceStatus;
      hours_worked: number;
      notes?: string | null;
      recorded_by: string;
    }>
  ) => {
    let current = [...attendance];
    records.forEach((rec) => {
      // Find existing for same worker + project + date
      const existingIdx = current.findIndex(
        (a) => a.worker_id === rec.worker_id && a.project_id === rec.project_id && a.date === rec.date
      );

      if (existingIdx >= 0) {
        current[existingIdx] = {
          ...current[existingIdx],
          status: rec.status,
          hours_worked: rec.hours_worked,
          notes: rec.notes ?? current[existingIdx].notes,
          recorded_by: rec.recorded_by,
          submitted_at: new Date().toISOString(),
        };
      } else {
        current.push({
          id: `att-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
          worker_id: rec.worker_id,
          project_id: rec.project_id,
          date: rec.date,
          status: rec.status,
          hours_worked: rec.hours_worked,
          notes: rec.notes || null,
          recorded_by: rec.recorded_by,
          is_founder_override: false,
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    });

    setAttendance(current);
    persist('attendance', current);
  };

  const updateAttendanceRecord = (id: string, data: Partial<Attendance>, isFounderOverride = false) => {
    const updated = attendance.map((a) =>
      a.id === id
        ? {
            ...a,
            ...data,
            is_founder_override: isFounderOverride ? true : a.is_founder_override,
            submitted_at: new Date().toISOString(),
          }
        : a
    );
    setAttendance(updated);
    persist('attendance', updated);
  };

  const getAttendanceForProjectAndDate = (projectId: string, date: string) => {
    return attendance.filter((a) => a.project_id === projectId && a.date === date);
  };

  // --- PAYROLL ACTIONS ---
  const createPayrollRun = (periodStart: string, periodEnd: string) => {
    // Generate payroll rows for active workers based on attendance in date range
    const newPayrollList: Payroll[] = [];

    workers.filter((w) => w.active).forEach((w) => {
      // Calculate attendance in period
      const workerAtt = attendance.filter(
        (a) => a.worker_id === w.id && a.date >= periodStart && a.date <= periodEnd
      );

      const daysPresent = workerAtt.filter((a) => a.status === 'present').length;
      const halfDays = workerAtt.filter((a) => a.status === 'half_day').length;
      const effectiveDays = daysPresent + halfDays * 0.5;
      const hoursTotal = workerAtt.reduce((sum, a) => sum + (a.hours_worked || 0), 0);

      const gross = w.pay_rate_type === 'daily' ? effectiveDays * w.pay_rate : hoursTotal * w.pay_rate;

      // Check active bale for worker
      const activeBales = advances.filter(
        (adv) => adv.worker_id === w.id && (adv.status === 'active' || adv.status === 'partially_deducted')
      );
      const totalBaleOutstanding = activeBales.reduce(
        (sum, adv) => sum + (adv.amount - adv.amount_deducted),
        0
      );

      // Default suggested deduction: either ₱1,500 or half the bale or half gross pay
      let suggestedDeduction = 0;
      if (totalBaleOutstanding > 0 && gross > 0) {
        suggestedDeduction = Math.min(totalBaleOutstanding, Math.min(1500, Math.floor(gross * 0.3)));
      }

      const net = Math.max(0, gross - suggestedDeduction);

      newPayrollList.push({
        id: `pay-${Date.now().toString().slice(-6)}-${w.id.slice(-4)}`,
        worker_id: w.id,
        period_start: periodStart,
        period_end: periodEnd,
        gross_pay: Math.round(gross),
        bale_deduction: suggestedDeduction,
        other_deductions: 0,
        net_pay: Math.round(net),
        status: 'draft',
        days_worked: effectiveDays,
        hours_worked: hoursTotal,
        notes: `Auto-computed from ${effectiveDays} days attendance`,
        created_at: new Date().toISOString(),
      });
    });

    const updated = [...newPayrollList, ...payroll];
    setPayroll(updated);
    persist('payroll', updated);
  };

  const updatePayrollStatus = (id: string, status: Payroll['status']) => {
    const payItem = payroll.find((p) => p.id === id);
    if (payItem && status === 'paid' && payItem.bale_deduction > 0) {
      // Automatically deduct from worker's active bale!
      const activeBales = advances.filter(
        (a) => a.worker_id === payItem.worker_id && (a.status === 'active' || a.status === 'partially_deducted')
      );
      let remToDeduct = payItem.bale_deduction;
      activeBales.forEach((adv) => {
        if (remToDeduct <= 0) return;
        const curBalance = adv.amount - adv.amount_deducted;
        const deductThis = Math.min(remToDeduct, curBalance);
        recordAdvanceDeduction(adv.id, deductThis);
        remToDeduct -= deductThis;
      });
    }

    const updated = payroll.map((p) => (p.id === id ? { ...p, status } : p));
    setPayroll(updated);
    persist('payroll', updated);
  };

  // --- TOOLS ACTIONS ---
  const createTool = (data: Omit<Tool, 'id' | 'created_at'>): Tool => {
    const newTool: Tool = {
      ...data,
      id: `tool-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newTool, ...tools];
    setTools(updated);
    persist('tools', updated);
    return newTool;
  };

  const updateTool = (id: string, data: Partial<Tool>) => {
    const updated = tools.map((t) => (t.id === id ? { ...t, ...data } : t));
    setTools(updated);
    persist('tools', updated);
  };

  const deleteTool = (id: string) => {
    const updated = tools.filter((t) => t.id !== id);
    setTools(updated);
    persist('tools', updated);
  };

  // --- SMS ACTIONS ---
  const sendSMS = async (recipient: string, phone: string, message: string, invoiceId?: string): Promise<boolean> => {
    try {
      // Simulate/call SMS endpoint
      const newLog: SMSLog = {
        id: `sms-${Date.now().toString().slice(-6)}`,
        invoice_id: invoiceId || null,
        recipient,
        phone,
        message,
        status: 'delivered',
        sent_at: new Date().toISOString(),
      };
      const updated = [newLog, ...smsLogs];
      setSmsLogs(updated);
      persist('smsLogs', updated);
      return true;
    } catch (e) {
      console.error('SMS Send error:', e);
      return false;
    }
  };

  // --- ANALYTICS ---
  const getFounderMetrics = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;

    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

    const overdueInvoices = invoices.filter(
      (i) => i.status === 'overdue' || (i.status !== 'paid' && new Date(i.due_date) < new Date('2026-09-13'))
    );
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (Number(i.amount) - Number(i.amount_paid)), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const expensesByCategory: Record<ExpenseCategory, number> = {
      materials: 0,
      labor: 0,
      equipment: 0,
      permits: 0,
      transportation: 0,
      other: 0,
    };

    expenses.forEach((e) => {
      if (expensesByCategory[e.category] !== undefined) {
        expensesByCategory[e.category] += Number(e.amount || 0);
      }
    });

    const pendingPayroll = payroll.filter((p) => p.status === 'draft' || p.status === 'reviewed' || p.status === 'approved');
    const totalPayrollPending = pendingPayroll.reduce((sum, p) => sum + Number(p.net_pay || 0), 0);

    const totalBaleBalance = advances
      .filter((a) => a.status === 'active' || a.status === 'partially_deducted')
      .reduce((sum, a) => sum + (Number(a.amount) - Number(a.amount_deducted)), 0);

    const projectFinancials = projects.map((p) => {
      const projInvoices = invoices.filter((i) => i.project_id === p.id);
      const projExpenses = expenses.filter((e) => e.project_id === p.id);

      const pInvoiced = projInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const pCollected = projInvoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
      const pExpTotal = projExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const pProfit = pCollected - pExpTotal;
      const margin = pCollected > 0 ? (pProfit / pCollected) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        budget: p.budget_estimate,
        invoiced: pInvoiced,
        collected: pCollected,
        expenses: pExpTotal,
        profit: pProfit,
        margin: Math.round(margin * 10) / 10,
      };
    });

    return {
      totalProjects,
      activeProjects,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      overdueInvoicesCount: overdueInvoices.length,
      totalExpenses,
      expensesByCategory,
      totalPayrollPending,
      totalBaleBalance,
      projectFinancials,
    };
  };

  const resetToDefault = () => {
    localStorage.clear();
    setProjects(INITIAL_PROJECTS);
    setInvoices(INITIAL_INVOICES);
    setExpenses(INITIAL_EXPENSES);
    setWorkers(INITIAL_WORKERS);
    setClients(INITIAL_CLIENTS);
    setAdvances(INITIAL_ADVANCES);
    setAttendance(INITIAL_ATTENDANCE);
    setPayroll(INITIAL_PAYROLL);
    setTools(INITIAL_TOOLS);
    setSmsLogs(INITIAL_SMS_LOGS);
    setProjectSupervisors(INITIAL_PROJECT_SUPERVISORS);
    setUsers(INITIAL_USERS);
  };

  return (
    <DataStoreContext.Provider
      value={{
        projects,
        invoices,
        expenses,
        workers,
        clients,
        advances,
        attendance,
        payroll,
        tools,
        smsLogs,
        projectSupervisors,
        users,
        isLoaded,
        createProject,
        updateProject,
        deleteProject,
        getProjectById,
        getProjectsForSupervisor,
        createClient,
        updateClient,
        deleteClient,
        createWorker,
        updateWorker,
        toggleWorkerStatus,
        createInvoice,
        updateInvoice,
        recordInvoicePayment,
        deleteInvoice,
        createExpense,
        updateExpense,
        deleteExpense,
        confirmAIExpense,
        createAdvance,
        recordAdvanceDeduction,
        updateAdvanceStatus,
        recordAttendanceBatch,
        updateAttendanceRecord,
        getAttendanceForProjectAndDate,
        createPayrollRun,
        updatePayrollStatus,
        createTool,
        updateTool,
        deleteTool,
        sendSMS,
        getFounderMetrics,
        resetToDefault,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};
