# SMS Automation Service

A simple Node.js service to send weekly transaction summaries via SMS.

## Setup

1.  **Install Dependencies**:
    ```bash
    cd sms-automation
    npm install
    ```

2.  **Configure Twilio**:
    *   Open `.env` file.
    *   Add your Twilio credentials:
        *   `TWILIO_ACCOUNT_SID`
        *   `TWILIO_AUTH_TOKEN`
        *   `TWILIO_PHONE_NUMBER` (The number you bought/got from Twilio)

3.  **Add Data**:
    *   Export your data from the **Shivaah Personal Account Book** web app (Settings -> Export JSON).
    *   Save the file as `data.json` inside this `sms-automation` folder.
    *   *Note: You need to update this file whenever you want the SMS service to have the latest data.*

4.  **Run the Service**:
    ```bash
    npm start
    ```
    The service will start and wait. It will automatically run every **Monday at 8:00 PM IST**.

## How it Works
*   **Schedule**: Uses `node-cron` to trigger every Monday at 20:00 (8 PM) Asia/Kolkata time.
*   **Data**: Reads `data.json` to get the list of people and transactions.
*   **Calculation**:
    *   Calculates **Current Balance** (All time).
    *   Calculates **Weekly Credit (IN)** and **Weekly Debit (OUT)** (Last 7 days).
*   **SMS**: Sends a formatted SMS to each person's contact number using Twilio.

## File Structure
*   `index.js`: Main logic script.
*   `data.json`: The database file (you provide this).
*   `.env`: Configuration keys.
