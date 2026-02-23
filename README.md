# PollyGlot-TTS

PollyGlot-TTS is an advanced Text-to-Speech (TTS) SaaS application designed to help users convert text and documents into lifelike speech. It features a modern, responsive user interface and a robust backend capable of handling complex natural language processing tasks.

## 🏗️ Architecture

The project is built on a modern, decoupled tech stack:

- **Frontend:** React.js powered by Vite, providing a fast and dynamic user interface.
- **Backend:** FastAPI (Python 3.11), providing high-performance, asynchronous RESTful APIs.
- **Database:** MySQL, managed via SQLAlchemy ORM for secure and scalable data storage.

## ✨ Key Features

- **Text-to-Speech Generation:** High-quality speech synthesis powered by AWS Polly and Azure.
- **Advanced Text Tuning:** Users can assign different voices to individual sentences and select specific emotion/mood styles for natural-sounding speech.
- **PDF Text Extraction:** Seamless document processing and text extraction from uploaded PDFs utilizing `pdfplumber`.
- **Authentication:** Secure user login via standard email/password credentials and **Google OAuth 2.0** (Continue with Google).
- **Credit System:** Built-in plan limits and credit tracking for audio conversions.
- **Conversion History:** Database-backed historical tracking of generated audio with playback and history management.

## 🚀 DevOps & CI/CD Pipeline

The application features a fully automated Continuous Integration and Continuous Deployment (CI/CD) pipeline managed via GitLab CI/CD.

- **Automated Frontend Build:** Compiles the React (Vite) project into a static production bundle.
- **MilesWeb Shared Hosting Deployment:** Uses GitLab Runners to systematically deploy the application directly to the server.
- **FTP & SSH Sync:** Transfers files securely via `lftp` and executes automation commands via SSH on a custom port (`22999`).
- **Complete Auto-Provisioning:** The pipeline now has direct SSH access to the server. It securely logs in, sources the Python environment, **automatically runs `pip install -r requirements.txt`** (eliminating the need for manual library installations), and safely reboots the FastAPI server seamlessly on every deploy.

## 🛠️ Local Development Setup

Follow these steps to set up the project locally on your machine.

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL Server

### 1. Database Setup
Create a new MySQL database for the application:
```sql
CREATE DATABASE pollyglot_db;
```

### 2. Backend Setup
Navigate to the `backend` directory, set up your virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory based on the following template (make sure to fill in your keys):

```env
# Database Connection
DATABASE_URL=mysql+mysqlconnector://<db_user>:<db_pass>@localhost/pollyglot_db

# Security
JWT_SECRET=your_super_secret_jwt_key
ALGORITHM=HS256

# Google Authentication
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# AWS Polly Credentials
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# SMTP Email Configuration (For Password Reset)
MAIL_USERNAME=your_email@domain.com
MAIL_PASSWORD=your_email_password
MAIL_FROM=your_email@domain.com
MAIL_PORT=587
MAIL_SERVER=smtp.domain.com
```

Start the FastAPI development server:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal, navigate to the `frontend` directory, install packages, and start the development server:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:8000
```

Run the Vite development server:
```bash
npm run dev
```

Your frontend will be accessible correctly configured and running at `http://localhost:5173`.

---
*Developed by HappyBrain Group*
