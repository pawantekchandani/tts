# Text-to-Speech Frontend

React + Tailwind CSS frontend with Login/Register functionality

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open in browser: `http://localhost:3000`

## Features

✅ Register new account
✅ Login with email & password  
✅ Dashboard after login
✅ JWT token storage
✅ Tailwind CSS styling
✅ Connected to FastAPI backend

## API Integration

Connects to backend at `http://localhost:8000`:
- `/signup` - Register new user
- `/login` - Login user
- `@app.on_event("startup")` - Database initialization

## Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Dashboard.jsx
│   ├── api/
│   │   └── auth.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Build for production:
```bash
npm run build
```
