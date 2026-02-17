# 🎧 Neural Voice Studio

**Neural Voice Studio** is a professional, full-stack Text-to-Speech (TTS) application that leverages **AWS Polly** to convert text into lifelike speech. It features a robust credit-based system, user authentication, and advanced handling for long-form content through intelligent text chunking and audio stitching.

---

## 🚀 Key Features

- **Multi-Engine Support**: Primarily uses AWS Polly for high-quality, neural text-to-speech conversion.
- **Smart Long-Text Handling**: Automatically splits texts over 3,000 characters into intelligent chunks (preserving sentence structure) and stitches them into a single seamless audio file using Pydub.
- **User Authentication**: Secure signup, login, and password reset functionality.
- **Email Communication**: Dedicated **SMTP Server** integration for sending automated Welcome emails and Password Reset instructions, ensuring seamless user onboarding.
- **Credit & Plan Management**: Credit-based usage system with different tiers (Basic, Pro, etc.) managed via an admin panel.
- **Conversion History**: Detailed history of all conversions with persistent audio storage and search/filter capabilities.
- **Admin Dashboard**: Real-time stats on user growth, earnings, and plan usage, plus the ability to modify plan limits dynamically.
- **History Tracking**: Download history and usage analytics.
- **Rich User Interface**: Modern, responsive UI built with React, Vite, and TailwindCSS, featuring smooth animations via Framer Motion.
- **Automated CI/CD**: Fully automated deployment pipeline using **GitLab CI/CD**, delivering code to production on every push to the main branch.
- **Real-time Monitoring**: Integrated with **Sentry** to capture runtime errors instantly and notify the developer via email for rapid debugging.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL with SQLAlchemy ORM
- **TTS Engine**: AWS Polly (Boto3)
- **Audio Processing**: Pydub & FFmpeg (for merging chunks)
- **Error Tracking**: Sentry
- **Authentication**: JWT (JSON Web Tokens)

### Frontend
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **State/API**: Axios, React Router
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast


---

## 📐 Architecture Diagram

```mermaid
graph TD
    User((User)) -->|Interacts| FE[React Frontend]
    FE -->|API Requests| BE[FastAPI Backend]
    BE -->|Database Query| DB[(MySQL Database)]
    BE -->|TTS Request| AWS[AWS Polly Service]
    AWS -->|Audio Stream| BE
    BE -->|Audio Processing| BE
    BE -->|Save Audio| FS[Local Storage]
    FE -->|Download| FS
```

---

## 🧵 Long Text Processing (Chunking & Stitching)

One of the standout features of Neural Voice Studio is its ability to handle immense blocks of text. Since most TTS engines have character limits per request (e.g., AWS Polly's 3,000 character limit), we implemented a **Smart Splitter**:

1. **Smart Splitting**: If text exceeds 3,000 characters, it is split at the nearest sentence ending (`.`, `?`, `!`) to ensure natural pauses.
2. **Sequential Processing**: Each chunk is sent to AWS Polly independently.
3. **Audio Stitching**: Using **Pydub**, the resulting audio streams are concatenated into a single high-quality MP3 file.
4. **Unified Output**: The user receives a single audio URL for the entire long-form content.

---

## 🚀 CI/CD & Deployment

This project uses a robust **GitLab CI/CD** pipeline for automated testing and deployment:
- **Build Stage**: Frontend is automatically built using Node.js 18.
- **Deploy Stage**: Verified code is automatically deployed to the production server (**MilesWeb**) via LFTP.
- **Notifications**: GitLab sends automated email notifications for every build, informing if the deployment was **Successful** or **Failed**.

---

## 🛡️ Error Monitoring & Sentry

For production stability, we use **Sentry** for real-time error tracking:
- **Runtime Error Detection**: Any backend exception is instantly captured by Sentry.
- **Instant Alerts**: Sentry sends an immediate email notification with a full traceback whenever a critical error occurs in the production environment.
- **Traceability**: Every error includes request details, helping to identify and fix bugs before they affect more users.

---

## 🔮 Future Improvements

1. **Voice Cloning**: Integrate The APIs for custom voice cloning capabilities.
2. **SSML Editor**: A visual editor for Speech Synthesis Markup Language to control pitch, speed, and emphasis.
3. **Batch Processing**: Upload `.txt` or `.docx` files for bulk conversion.
4. **Webhooks**: Notify external systems when a conversion is complete.

---

## 📡 API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signup` | POST | Register a new user |
| `/api/login` | POST | Authenticate and receive JWT |
| `/api/me` | GET | Current user profile & credits |
| `/api/convert` | POST | Main TTS conversion (handles chunking) |
| `/api/history` | GET | List user conversion history |
| `/api/download/{id}` | GET | Download specific audio file |
| `/api/admin/stats` | GET | Global system statistics (Admin only) |
| `/api/admin/plans` | PUT | Update plan limits (Admin only) |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **MySQL Server**
- **FFmpeg** (Required for audio stitching)

### Backend Setup
1. **Navigate to backend folder**:
    ```bash
    cd backend
    ```
2. **Create a virtual environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3. **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
    ```env
    DATABASE_URL=mysql+mysqlconnector://user:password@localhost/neural_voice_db
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_REGION=us-east-1
    MAIL_USERNAME=your_email@gmail.com
    MAIL_PASSWORD=your_app_password
    MAIL_SERVER=smtp.gmail.com
    MAIL_PORT=587
    FRONTEND_PATH=../frontend/dist
    SENTRY_DSN=your_sentry_dsn (optional)
    ```
5. **Run the server**:
    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup
1. **Navigate to frontend folder**:
    ```bash
    cd frontend
    ```
2. **Install dependencies**:
    ```bash
    npm install
    ```
3. **Configure Environment Variables**:
   Create a `.env.development` file:
    ```env
    VITE_API_URL=http://localhost:8000
    ```
4. **Start the development server**:
    ```bash
    npm run dev
    ```

### Database Setup
The application is designed to be plug-and-play:
- On first run, the backend will automatically create the necessary MySQL tables via SQLAlchemy.
- It will also seed the initial plan limits (Basic, Pro, etc.) into the `plan_limits` table.
- **Manual Migration (Optional)**: If you need to run specific migration scripts, you can use `python auto_migrate.py`.

---

## 📄 License

This project is licensed under the MIT License.
