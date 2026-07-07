DO $$
DECLARE
  v_admin_id UUID;
  v_eng_id UUID;
  v_hr_id UUID;
  v_fin_id UUID;
  v_sales_id UUID;
  v_pos_lead UUID;
  v_pos_senior UUID;
  v_pos_mid UUID;
  v_pos_junior UUID;
  v_pos_hr UUID;
  v_pos_acc UUID;
  v_pos_sales UUID;
  v_emp1 UUID; v_emp2 UUID; v_emp3 UUID; v_emp4 UUID; v_emp5 UUID;
  v_emp6 UUID; v_emp7 UUID; v_emp8 UUID; v_emp9 UUID; v_emp10 UUID;
  v_proj1 UUID; v_proj2 UUID; v_proj3 UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE email='admin@erp.local';
  SELECT id INTO v_eng_id FROM departments WHERE name='Engineering';
  SELECT id INTO v_hr_id FROM departments WHERE name='HR';
  SELECT id INTO v_fin_id FROM departments WHERE name='Finance';
  SELECT id INTO v_sales_id FROM departments WHERE name='Sales';

  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Team Lead', v_eng_id) RETURNING id INTO v_pos_lead;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Senior Developer', v_eng_id) RETURNING id INTO v_pos_senior;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Middle Developer', v_eng_id) RETURNING id INTO v_pos_mid;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Junior Developer', v_eng_id) RETURNING id INTO v_pos_junior;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'HR Manager', v_hr_id) RETURNING id INTO v_pos_hr;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Accountant', v_fin_id) RETURNING id INTO v_pos_acc;
  INSERT INTO positions (id, title, department_id) VALUES (uuid_generate_v4(), 'Sales Manager', v_sales_id) RETURNING id INTO v_pos_sales;

  INSERT INTO employees (id, user_id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), v_admin_id, 'Nurtay', 'Adminov', '+996700123456', v_eng_id, v_pos_lead, 75000, '2023-01-15', 'active') RETURNING id INTO v_emp1;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Arman', 'Serikov', '+996701234567', v_eng_id, v_pos_senior, 60000, '2023-03-01', 'active') RETURNING id INTO v_emp2;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Aigerim', 'Zhanova', '+996702345678', v_eng_id, v_pos_mid, 45000, '2023-06-10', 'active') RETURNING id INTO v_emp3;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Damir', 'Kairatov', '+996703456789', v_eng_id, v_pos_junior, 30000, '2024-01-20', 'active') RETURNING id INTO v_emp4;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Dana', 'Muratova', '+996704567890', v_hr_id, v_pos_hr, 38000, '2023-02-14', 'active') RETURNING id INTO v_emp5;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Ruslan', 'Bekov', '+996705678901', v_fin_id, v_pos_acc, 42000, '2023-04-05', 'active') RETURNING id INTO v_emp6;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Asel', 'Toreeva', '+996706789012', v_sales_id, v_pos_sales, 50000, '2023-05-20', 'active') RETURNING id INTO v_emp7;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Marat', 'Omarov', '+996707890123', v_eng_id, v_pos_mid, 41000, '2023-09-01', 'on_leave') RETURNING id INTO v_emp8;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Kamila', 'Nurova', '+996708901234', v_sales_id, v_pos_sales, 46000, '2024-02-01', 'active') RETURNING id INTO v_emp9;

  INSERT INTO employees (id, first_name, last_name, phone, department_id, position_id, salary, hire_date, status)
  VALUES (uuid_generate_v4(), 'Almas', 'Sabitov', '+996709012345', v_fin_id, v_pos_acc, 39000, '2024-03-15', 'active') RETURNING id INTO v_emp10;

  INSERT INTO projects (id, name, description, status, start_date, end_date, manager_id)
  VALUES (uuid_generate_v4(), 'ERP Platform v2.0', 'Complete rewrite of the ERP system with modern stack and microservices architecture', 'active', '2024-01-01', '2024-12-31', v_emp1) RETURNING id INTO v_proj1;

  INSERT INTO projects (id, name, description, status, start_date, end_date, manager_id)
  VALUES (uuid_generate_v4(), 'Mobile App Launch', 'Cross-platform mobile application for field teams using React Native and Expo', 'active', '2024-03-01', '2024-09-30', v_emp2) RETURNING id INTO v_proj2;

  INSERT INTO projects (id, name, description, status, start_date, end_date, manager_id)
  VALUES (uuid_generate_v4(), 'HR Automation', 'Automate onboarding, leave management and performance review processes', 'completed', '2023-06-01', '2024-02-28', v_emp5) RETURNING id INTO v_proj3;

  INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by) VALUES
    (v_proj1, 'Design database schema', 'Create normalized PostgreSQL schema for all core modules', 'high', 'done', '2024-02-15', v_admin_id),
    (v_proj1, 'Implement JWT authentication', 'Setup secure authentication with access and refresh tokens', 'critical', 'done', '2024-03-01', v_admin_id),
    (v_proj1, 'Build REST API endpoints', 'Implement all CRUD operations for core entities with validation', 'high', 'done', '2024-04-15', v_admin_id),
    (v_proj1, 'Create dashboard UI', 'Build KPI dashboard with real-time statistics and charts', 'high', 'in_progress', '2024-06-01', v_admin_id),
    (v_proj1, 'Employee management module', 'Full CRUD with search, filter, and pagination support', 'medium', 'in_progress', '2024-07-01', v_admin_id),
    (v_proj1, 'Reports and analytics', 'Generate department salary and project completion reports', 'medium', 'review', '2024-08-01', v_admin_id),
    (v_proj1, 'Role-based access control', 'Implement RBAC middleware for admin, manager, employee roles', 'critical', 'done', '2024-03-15', v_admin_id),
    (v_proj1, 'Performance optimization', 'Database query optimization, connection pooling, and response caching', 'low', 'todo', '2024-10-01', v_admin_id),
    (v_proj1, 'Unit and integration tests', 'Achieve minimum 80 percent test coverage across all modules', 'medium', 'todo', '2024-11-01', v_admin_id);

  INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by) VALUES
    (v_proj2, 'Setup Expo project structure', 'Initialize React Native project with Expo Router navigation', 'high', 'done', '2024-03-15', v_admin_id),
    (v_proj2, 'Build login screen', 'Create authentication flow with secure token storage', 'critical', 'done', '2024-04-01', v_admin_id),
    (v_proj2, 'Implement offline data sync', 'Build offline-first architecture with background synchronization', 'high', 'in_progress', '2024-06-15', v_admin_id),
    (v_proj2, 'Push notifications system', 'Setup task assignment and deadline notifications via FCM', 'medium', 'todo', '2024-07-15', v_admin_id),
    (v_proj2, 'Camera and file upload', 'Document scanning, photo capture, and file attachment feature', 'low', 'todo', '2024-08-15', v_admin_id);

  INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by) VALUES
    (v_proj3, 'Digital onboarding workflow', 'Replace paper forms with step-by-step digital onboarding', 'high', 'done', '2023-08-01', v_admin_id),
    (v_proj3, 'Leave request system', 'Online leave applications with multi-level approval chain', 'high', 'done', '2023-10-01', v_admin_id),
    (v_proj3, 'Email notification service', 'Auto-notify managers and HR on new requests and approvals', 'medium', 'done', '2023-11-01', v_admin_id),
    (v_proj3, 'HR analytics dashboard', 'Attendance tracking, headcount trends, and turnover reports', 'medium', 'done', '2024-01-15', v_admin_id);

  INSERT INTO task_assignments (task_id, employee_id)
  SELECT t.id, v_emp1 FROM tasks t WHERE t.title = 'Design database schema'
  UNION ALL SELECT t.id, v_emp1 FROM tasks t WHERE t.title = 'Implement JWT authentication'
  UNION ALL SELECT t.id, v_emp2 FROM tasks t WHERE t.title = 'Build REST API endpoints'
  UNION ALL SELECT t.id, v_emp2 FROM tasks t WHERE t.title = 'Role-based access control'
  UNION ALL SELECT t.id, v_emp3 FROM tasks t WHERE t.title = 'Create dashboard UI'
  UNION ALL SELECT t.id, v_emp4 FROM tasks t WHERE t.title = 'Create dashboard UI'
  UNION ALL SELECT t.id, v_emp3 FROM tasks t WHERE t.title = 'Employee management module'
  UNION ALL SELECT t.id, v_emp6 FROM tasks t WHERE t.title = 'Reports and analytics'
  UNION ALL SELECT t.id, v_emp2 FROM tasks t WHERE t.title = 'Setup Expo project structure'
  UNION ALL SELECT t.id, v_emp3 FROM tasks t WHERE t.title = 'Build login screen'
  UNION ALL SELECT t.id, v_emp4 FROM tasks t WHERE t.title = 'Implement offline data sync'
  UNION ALL SELECT t.id, v_emp5 FROM tasks t WHERE t.title = 'Digital onboarding workflow'
  UNION ALL SELECT t.id, v_emp5 FROM tasks t WHERE t.title = 'Leave request system'
  UNION ALL SELECT t.id, v_emp5 FROM tasks t WHERE t.title = 'Email notification service';
END $$;
