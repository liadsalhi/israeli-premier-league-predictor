# Israeli Premier League Predictor 🏆

An AI-powered football prediction web app for the Israeli Premier League, built with Google Apps Script and Google Sheets as a backend.

## Features

- 🔴 **Real-time match results** — automatically fetched and updated daily via football APIs
- ⏱️ **Countdown timer** — guesses are locked 3 hours before kickoff
- 🔒 **Hidden guesses** — each player's picks are hidden until the lock time
- 🔐 **Password authentication** — each player sets a personal 6-digit PIN
- 🤖 **AI-powered predictions** — match predictions generated using the Gemini API
- 📊 **Live league standings** — fetched daily from an external football API
- ⚽ **Player statistics** — top scorers, assists, and combined stats
- 🏅 **Leaderboard** — cumulative scoring across all rounds

## Tech Stack

- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Frontend:** HTML, CSS, JavaScript
- **AI:** Google Gemini API
- **Data:** External football REST APIs
- **Automation:** Google Apps Script time-based triggers (daily at 23:00 IST)

## Setup

1. Create a new Google Sheets spreadsheet
2. Open **Extensions → Apps Script**
3. Copy `Code.gs` into the script editor
4. Create a new HTML file named `Index` and copy `Index.html`
5. Replace `YOUR_API_KEY` with your football API key
6. Replace `STANDINGS_API_URL` and `STATS_API_URL` with your preferred football data endpoints
7. Replace `YOUR_GEMINI_API_KEY` with your Google Gemini API key
8. Run `createExactTriggers()` once to set up daily automation
9. Deploy as **Web App** → Execute as Me → Anyone can access

## Project Structure
```
├── Code.gs       # Backend logic, API calls, data management
└── Index.html    # Frontend UI
```

## Notes

- Google Sheets acts as the database — no external DB required
- All data is cached in the sheet and refreshed nightly
- Passwords are stored per-player in the sheet
