# LoOper Beta Backend

Local Node.js backend for handling beta program registrations.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Email

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Get a Gmail App Password:
   - Go to https://myaccount.google.com/security
   - Enable 2-Factor Authentication
   - Go to "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it "LoOper Beta Backend"
   - Copy the 16-character password

3. Edit `.env` and paste your App Password:
   ```
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

### 3. Start the Server

```bash
# Production mode
npm start

# Development mode (auto-restart on changes)
npm run dev
```

The server will start at `http://localhost:3000`

### 4. Access the Beta Form

Open your browser to: `http://localhost:3000/beta.html`

## Features

- ✅ Receives beta registration submissions
- ✅ Sends email notification to vozicomsystems@gmail.com
- ✅ Sends confirmation email to the applicant
- ✅ Stores submissions in memory (view at `/api/submissions`)
- ✅ Serves the static website files

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/beta-register` | POST | Submit beta registration |
| `/api/submissions` | GET | View all submissions |
| `/api/health` | GET | Health check |

## Testing

Test the email configuration:
```bash
curl http://localhost:3000/api/health
```

## Notes

- Submissions are stored in memory and will be lost when the server restarts
- For production, consider adding a database (SQLite, MongoDB, etc.)
- The server must be running to receive submissions
