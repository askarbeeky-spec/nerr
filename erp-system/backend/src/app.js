'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { API_PREFIX } = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');

// ── Route modules ──────────────────────────────────────
const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const employeesRouter = require('./modules/employees/employees.router');
const departmentsRouter = require('./modules/departments/departments.router');
const projectsRouter = require('./modules/projects/projects.router');
const tasksRouter = require('./modules/tasks/tasks.router');
const reportsRouter = require('./modules/reports/reports.router');

const app = express();

// ── Security middlewares ───────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// ── Body & cookie parsers ──────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request logging ────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Global rate limiter ────────────────────────────────
app.use(rateLimiter);

// ── Health check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/employees`, employeesRouter);
app.use(`${API_PREFIX}/departments`, departmentsRouter);
app.use(`${API_PREFIX}/projects`, projectsRouter);
app.use(`${API_PREFIX}/tasks`, tasksRouter);
app.use(`${API_PREFIX}/reports`, reportsRouter);

// ── 404 handler ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────
app.use(errorHandler);

module.exports = app;
