# AgriChain Supply Chain Management System

ADBMS project for 2nd sem. AgriChain is a comprehensive supply chain management system designed to track agricultural products from farmers to buyers, ensuring transparency, quality, and efficiency.

## Project Overview

This system defines the core features, access flows, and current technical status of the AgriChain Supply Chain Management System.

### Implemented Features

#### 1. Supply Chain Traceability Pipeline
The backend FastAPI orchestrates a fully modeled agricultural pipeline. Every entity interacts with a tracked batch ID natively.
- **Batches**: Farmers establish a crop identity, assigning initial weights, expected base pricing per kg, and generating a unique QR code.
- **Quality Checks**: Inspectors log contamination flags, pass/fail grades (A, B, C), moisture percentages, and upload PDF/PNG certificates directly into Supabase Storage.
- **Transportation**: Transporters log pick-up departure times and modes of transit (e.g., heavy truck, train, EV) and eventually mark an arrival at a drop location with tracked carbon emissions.
- **Storage**: Warehouse managers receive and document batch entry and exit times while capturing ambient storage conditions (humidity and temperature) to maintain shelf life records.
- **Purchasing**: A Buyer Marketplace allows bulk-purchase routing, evaluating historical crop viability before logging final financial totals into the system.

#### 2. Comprehensive Role-Based Access Control (RBAC)
The architecture routes users based upon dynamic Supabase metadata properties attached to their authentication JWT.
- **Operator Portal (Front_end_rest)**: A fluid role-switching UI serving independent dashboards and toolkits to Farmers, Inspectors, Transporters, Warehouse Managers, and Buyers depending on credentials.
- **Admin Dashboard**: Restricted portal locked to `admin` and `auditor` profiles for high-level management and oversight.

#### 3. Native JWT API Security
- All interaction paths require an active `Authorization: Bearer <token>` signed by Supabase Auth contexts.
- API requests reject unauthorized access natively mapping to route-level dependencies.
- Endpoints enforce security by explicitly locking operations based on internal role-based checks.

#### 4. Admin Management Dashboard
- **Active Safety Net Constraints**: Prevents deletion of users who possess active supply-chain data to protect historical integrity.
- **Soft-Lock Isolation**: Admins can "Deactivate" an operator, blocking them from the system without deleting their history.
- **Business Rule Alerting**: Analytics dashboards process data structures dynamically to raise automated insights (e.g., grading failures, extreme moisture levels).

---

## Installation and Setup

### Prerequisites
- Python 3.9+
- Node.js (with npm)
- Supabase account (configured in `.env`)

### 1. Backend Setup
1. Navigate to the project root directory:
   ```bash
   cd Agri-supply-chain
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Configuration:
   Ensure the `.env` file exists in the root directory with your Supabase credentials.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Front_end_rest
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```

---

## Running the Application

### 1. Start the Backend Server
From the `Agri-supply-chain` directory (ensure your virtual environment is active):
```bash
uvicorn main:app --reload
```
The API server will start at `http://127.0.0.1:8000`. You can view the API documentation at `http://127.0.0.1:8000/docs`.

### 2. Start the Frontend Development Server
From the `Front_end_rest` directory:
```bash
npm run dev
```
The application will be accessible at the URL provided in the terminal (typically `http://localhost:5173`).

---

## Known Current Limitations
- **Monolithic Frontend**: The main Operator Portal handles multiple departments through a single large Javascript file, which may impact maintainability at scale.
- **Offline Capabilities**: Currently requires an active internet connection; future versions may include PWA features for offline data logging.
- **File Verification**: Security enhancements for deep packet inspection of uploaded certificates are planned.
- **Role Context in Scanning**: Public QR scanning displays full lifecycle; more granular privacy controls are planned.
