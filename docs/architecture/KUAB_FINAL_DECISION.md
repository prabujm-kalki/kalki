# Kalki BOS Universal Automation Bus (KUAB) - Final Architectural Decision
**Date:** September 30, 2026
**Status:** FROZEN 

## Core Philosophy
We will **NOT** build a separate automation-function system that duplicates normal application functions. The system must remain clean, single-source-of-truth, and maintainable.

## Architectural Guidelines

### 1. Build the Required Business Functions Normally
- Each domain module (People, Purchase, Attendance, Payroll, Inventory, etc.) absolutely owns its actual business logic and functions.
- Functions remain modular, reusable, testable, and maintainable. 
- *No "automation versions" of existing functions will be created.*

### 2. Build ONE Centralized Universal Automation Bus (KUAB)
- The Automation Bus acts solely as the common **execution/orchestration layer**.
- It invokes the required functions from the various modules dynamically.
- Automation workflows inside KUAB simply define *what should happen, when, and under what conditions*. They do not contain domain-specific business logic.

### 3. Reuse the Same Functions Everywhere
KUAB acts as the listener and router for existing functions.
**Examples of Data Flow:**
- `Purchase → PO Approved → Automation Bus → Send Notification`
- `Attendance → Missing Punch → Automation Bus → Create Task`
- `Payroll → Salary Generated → Automation Bus → Start Payment Confirmation Workflow`

## The Unified Flow
`Business Modules` → `Reusable Functions` → `Universal Automation Bus` → `Automation Workflows`

*This document serves as the frozen baseline for all step-by-step KUAB implementations moving forward.*
