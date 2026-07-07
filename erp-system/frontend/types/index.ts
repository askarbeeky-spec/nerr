// ─── Core domain types ────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  hire_date: string;
  salary?: number;
  status: 'active' | 'inactive' | 'on_leave';
  department_id?: string;
  department_name?: string;
  position_id?: string;
  position_title?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date?: string;
  end_date?: string;
  manager_id?: string;
  manager_name?: string;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  due_date?: string;
  created_by_email?: string;
  assignees: { id: string; first_name: string; last_name: string }[];
  created_at: string;
  updated_at: string;
}

// ─── API response shapes ──────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface DashboardStats {
  employees: { total: number; active: number; on_leave: number };
  departments: { total: number };
  projects: { total: number; active: number; completed: number };
  tasks: { total: number; todo: number; in_progress: number; review: number; done: number };
}
