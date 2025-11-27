# Shivaah Personal Account Book

A clean, responsive personal ledger application built with plain HTML, CSS, and JavaScript.

## Features
- **Empty Start**: Starts with no data.
- **Local Database**: Uses browser's `localStorage` as a secure local database.
- **PDF Export**: Generate color-coded PDF statements (Green for Credit, Red for Debit).
- **Undo Delete**: 5-second undo window.
- **Responsive**: Works on mobile and desktop.

## How to Run
1. Open terminal in this folder.
2. Run a simple server (e.g., using Python or Node):
   ```bash
   # Python 3
   python3 -m http.server 3000
   
   # OR Node (npx)
   npx serve .
   ```
3. Open http://localhost:3000

## Developer Tools
- **Seed Data**: Open Settings -> Developer Tools -> Load Sample Data (Visible on localhost only).
- **Storage**: Uses `ledger_data_v1` in localStorage.

## File Structure
- `index.html`: Main UI structure
- `styles.css`: All styling
- `app.js`: Application logic
- `sample-data.json`: Sample data for testing
