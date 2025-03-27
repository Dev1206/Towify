# Towify

A comprehensive vehicle towing and fine management system built with React Native and Supabase. Towify streamlines the management of vehicle towing, fine issuance, and record tracking with support for real-time notifications and payment tracking.

## Table of Contents

- [Overview](#overview)
- [Technical Details](#technical-details)
  - [Technology Stack](#technology-stack)
  - [Architecture](#architecture)
  - [Database Schema](#database-schema)
- [User Manual](#user-manual)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
  - [User Roles](#user-roles)
  - [Feature Guide](#feature-guide)
- [Folder Structure](#folder-structure)
- [File Descriptions](#file-descriptions)
  - [Root Files](#root-files)
  - [App Directory](#app-directory)
  - [Source (src) Directory](#source-src-directory)
- [Workflow](#workflow)
  - [Authentication Flow](#authentication-flow)
  - [Vehicle Owner Flow](#vehicle-owner-flow)
  - [Staff Flow](#staff-flow)
  - [Officer Flow](#officer-flow)

## Overview

Towify is a mobile application that supports three primary user roles: vehicle owners, towing company staff, and law enforcement officers. Each role has specific capabilities and access levels within the application:

- **Vehicle Owners**: Register vehicles, view tow/fine history, pay fines, submit complaints
- **Towing Staff**: Record tows, search vehicles, update tow status, review complaints
- **Law Enforcement Officers**: Issue fines, search vehicles, review complaints

The app uses a role-based authentication system to manage access control and provides specialized interfaces for each user role.

## Technical Details

### Technology Stack

Towify is built with the following technologies:

- **Frontend Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (Backend as a Service)
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth
  - **Storage**: Supabase Storage
  - **Realtime**: For notifications and updates
- **State Management**: React Context API for authentication/session
- **UI Components**: React Native built-in components
- **Styling**: StyleSheet API with custom components
- **Icons**: Expo Vector Icons (FontAwesome5)
- **Date Handling**: date-fns library

### Architecture

The application follows a client-server architecture where:

1. The React Native application serves as the client
2. Supabase provides backend services including database, authentication, and storage
3. The app uses Expo Router for navigation, following a file-system based routing approach
4. User authentication state is managed globally using React Context (SessionContext)

The codebase follows a hybrid organization approach:
- Routing/page components in the `app` directory (Expo Router structure)
- Core business logic and shared components in the `src` directory

### Database Schema

Towify uses the following database tables in Supabase:

1. **profiles** - Extends the default Supabase auth users
   - Fields: id, full_name, role, email, phone, created_at

2. **vehicles**
   - Fields: id, license_plate, model, make, color, owner_id, registered_name, created_at

3. **tows**
   - Fields: id, vehicle_id, location, tow_date, reason, status, request_status, notes, created_at, created_by, assigned_to

4. **fines**
   - Fields: id, vehicle_id, amount, description, issue_date, status, paid_date, created_by, created_at

5. **complaints**
   - Fields: id, user_id, vehicle_id, tow_id, fine_id, subject, description, status, response, created_at

6. **notifications**
   - Fields: id, user_id, type, title, message, related_id, is_read, created_at

Row-Level Security (RLS) policies are implemented on these tables to ensure data security and appropriate access control based on user roles.

## User Manual

### Installation

To install and set up Towify for development:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Towify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Supabase:
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Set up tables according to the database schema
   - Update the Supabase URL and anon key in `src/api/supabase.ts`

### Running the Application

1. Start the development server:
   ```bash
   npm start
   ```

2. Use the Expo Go app to run on a physical device, or press 'i' for iOS simulator or 'a' for Android emulator.

### User Roles

#### Vehicle Owner

After logging in, vehicle owners can:
- View and manage their vehicles
- View tow history for their vehicles
- View and pay fines
- Submit complaints about tows or fines
- View notifications

#### Towing Staff

After logging in, towing staff can:
- View tow requests and update their status
- Record new tows
- Search for vehicles
- Review and respond to complaints
- View statistics on the dashboard

#### Law Enforcement Officer

After logging in, officers can:
- Issue fines to vehicles
- Search for vehicles
- View vehicle history
- Review complaints

### Feature Guide

#### Vehicle Management
- Register a new vehicle (Vehicle Owner)
- View vehicle details
- View tow and fine history for a vehicle

#### Tow Management
- Record a new tow (Staff)
- Update tow status (Staff)
- View tow details

#### Fine Management
- Issue a fine (Officer)
- Pay a fine (Vehicle Owner)
- View fine details and history

#### Complaints
- Submit a complaint (Vehicle Owner)
- Review and respond to complaints (Staff/Officer)

## Folder Structure

```
/Towify
|-- /app                    # Expo Router pages (file-based routing)
|   |-- _layout.tsx         # Root layout component
|   |-- index.tsx           # Entry point/splash screen
|   |-- login.tsx           # Login screen
|   |-- signup.tsx          # Signup screen
|   |-- owner.tsx           # Vehicle owner dashboard
|   |-- staff.tsx           # Staff dashboard
|   |-- officer.tsx         # Officer dashboard
|   |-- /staff              # Staff-specific routes
|   |-- /officer            # Officer-specific routes
|   |-- vehicles.tsx        # Vehicle listing route
|   |-- vehicle-details.tsx # Vehicle details route
|   |-- ...                 # Other route files
|
|-- /src                    # Application source code
|   |-- /api                # API configuration
|   |   |-- supabase.ts     # Supabase client setup
|   |
|   |-- /components         # Reusable UI components
|   |   |-- VehicleItem.tsx
|   |   |-- FineItem.tsx
|   |   |-- TowItem.tsx
|   |
|   |-- /constants          # App constants and configuration
|   |
|   |-- /context            # React Context providers
|   |   |-- SessionContext.tsx  # Authentication state management
|   |
|   |-- /screens            # Screen components
|   |   |-- AddVehicleScreen.tsx
|   |   |-- VehicleListScreen.tsx
|   |   |-- ...            # Other screen components
|   |
|   |-- /utils              # Utility functions
|       |-- navigation.ts   # Navigation helpers
|
|-- /assets                 # Static assets (images, fonts)
|   |-- /images
|
|-- app.json                # Expo configuration
|-- package.json            # NPM dependencies
|-- tsconfig.json           # TypeScript configuration
```

## File Descriptions

### Root Files

- **app.json**: Expo configuration file with app settings like name, version, and platform-specific configs
- **package.json**: NPM package configuration with dependencies and scripts
- **tsconfig.json**: TypeScript configuration for the project

### App Directory

Files in the app directory represent the application routes (using Expo Router's file-based routing system).

#### Root Routes

- **_layout.tsx**: Root layout component that wraps all routes and provides the SessionProvider
- **index.tsx**: Entry point of the app, renders the SplashScreen
- **login.tsx**: Login screen with authentication logic
- **signup.tsx**: Registration screen for new users

#### Role-based Routes

- **owner.tsx**: Dashboard for vehicle owners with statistics and navigation options
- **staff.tsx**: Wrapper that renders the staff dashboard component
- **officer.tsx**: Wrapper that renders the officer dashboard component

#### Feature Routes

- **vehicles.tsx**: Lists all vehicles for the current user
- **vehicle-details.tsx**: Shows detailed information about a specific vehicle
- **add-vehicle.tsx**: Form for adding a new vehicle
- **fine-history.tsx**: Shows history of fines for the current user's vehicles
- **fine-details.tsx**: Detailed view of a specific fine
- **tow-history.tsx**: History of tows for the current user's vehicles
- **tow-details.tsx**: Detailed view of a specific tow
- **complaint.tsx**: Form for submitting a complaint
- **my-complaints.tsx**: List of complaints submitted by the current user
- **notifications.tsx**: List of notifications for the current user

#### Role-specific Subdirectories

- **officer/issue-fine.tsx**: Screen for officers to issue fines
- **staff/tow-details.tsx**: Staff view of tow details with additional options
- **staff/tow-requests.tsx**: List of tow requests for staff to manage
- **staff/complaints.tsx**: List of complaints for staff to review
- **staff/vehicle-search.tsx**: Vehicle search screen for staff
- **staff/record-tow.tsx**: Form for recording a new tow
- **staff/issue-fine.tsx**: Screen for staff to issue fines

### Source (src) Directory

#### API

- **supabase.ts**: Configures and exports the Supabase client for database interactions

#### Components

- **VehicleItem.tsx**: Reusable component for displaying a vehicle in a list
- **FineItem.tsx**: Reusable component for displaying a fine in a list
- **TowItem.tsx**: Reusable component for displaying a tow in a list

#### Context

- **SessionContext.tsx**: Provides global authentication state and user role information

#### Screens

- **SplashScreen.tsx**: Initial loading screen that checks authentication status
- **VehicleListScreen.tsx**: Screen component for listing vehicles
- **AddVehicleScreen.tsx**: Form screen for adding a new vehicle
- **VehicleSearchScreen.tsx**: Search interface for finding vehicles
- **TowHistoryScreen.tsx**: Screen showing tow history
- **TowRequestsScreen.tsx**: Screen for managing tow requests
- **FineHistoryScreen.tsx**: Screen showing fine history
- **FineDetailsScreen.tsx**: Screen showing detailed information about a fine
- **ComplaintScreen.tsx**: Form for submitting complaints
- **MyComplaintsScreen.tsx**: List of user's complaints
- **ComplaintReviewScreen.tsx**: Screen for staff to review complaints
- **RecordTowScreen.tsx**: Form for staff to record a new tow
- **IssueFineScreen.tsx**: Form for issuing a fine
- **StaffDashboardScreen.tsx**: Dashboard for tow staff
- **OfficerDashboardScreen.tsx**: Dashboard for law enforcement officers

#### Utils

- **navigation.ts**: Utility functions for navigation, including role-based routing

## Workflow

### Authentication Flow

1. **User opens the app**
   - SplashScreen checks if a user is already authenticated
   - If authenticated, redirects to appropriate dashboard based on role
   - If not authenticated, redirects to login screen

2. **User logs in**
   - Enters email and password
   - Authentication handled by Supabase Auth
   - User role retrieved from profiles table
   - Redirected to appropriate dashboard based on role

### Vehicle Owner Flow

1. **Dashboard**
   - View statistics (vehicle count, active fines, tow count)
   - Access quick navigation options

2. **Vehicle Management**
   - View list of registered vehicles
   - Add new vehicles with details
   - View detailed information about each vehicle

3. **Fine Management**
   - View list of fines
   - View fine details
   - Pay fines (mock payment)

4. **Tow History**
   - View history of vehicle tows
   - View detailed information about each tow
   - Submit complaints about tows

5. **Complaints**
   - Submit new complaints
   - View status of submitted complaints

### Staff Flow

1. **Dashboard**
   - View statistics (pending tows, active tows, completed tows, pending complaints)
   - Access quick actions and management options

2. **Tow Management**
   - Create new tow records
   - View and update existing tow requests
   - Update tow status (active, released, completed)

3. **Vehicle Search**
   - Search for vehicles by license plate
   - View vehicle details and history

4. **Complaint Review**
   - View pending complaints
   - Respond to complaints
   - Update complaint status

### Officer Flow

1. **Dashboard**
   - View recent activity
   - Access quick actions

2. **Fine Issuance**
   - Search for vehicles
   - Issue fines with amount and description

3. **Vehicle Search**
   - Search for vehicles
   - View complete vehicle history

4. **Complaint Review**
   - Review complaints
   - Respond to complaints related to fines

---

This documentation provides a comprehensive overview of the Towify application, including its technical architecture, user guide, folder structure, and workflow. The application demonstrates a well-structured React Native application with role-based access control and integration with Supabase backend services.
