# GitHub + Android SMS Automation

A DIY system to send automated SMS from your own Android phone using GitHub Actions.

## 🏗 System Architecture
1.  **GitHub Actions**: Runs every Monday at 8 PM IST. Reads `data.json` and creates tasks in `sms_queue.json`.
2.  **Android Phone**: Runs a script (via Termux) that watches the repo, picks up new tasks, and sends SMS using your SIM.

## 🚀 Setup Instructions

### Phase 1: GitHub Setup
1.  Create a new **Private Repository** on GitHub (e.g., `my-ledger-sms`).
2.  Push all files in this folder (`github-sms-automation`) to that repository.
3.  Add your ledger data to `data.json`.

### Phase 2: Android Phone Setup
You need **Termux** and **Termux:API** to control SMS from the command line.

1.  **Install Apps**:
    *   Install **Termux** from F-Droid (Recommended) or Play Store.
    *   Install **Termux:API** app.
2.  **Configure Termux**:
    Open Termux app and run these commands one by one:
    ```bash
    # Update packages
    pkg update && pkg upgrade
    
    # Install required tools
    pkg install git nodejs termux-api
    
    # Grant SMS permissions (Important!)
    termux-sms-send -n 123 test
    # (A popup will ask for SMS permission. Allow it.)
    ```
3.  **Clone Your Repo**:
    ```bash
    # Setup storage access
    termux-setup-storage
    
    # Clone your repo (use your actual repo URL)
    git clone https://github.com/YOUR_USERNAME/my-ledger-sms.git
    cd my-ledger-sms
    
    # Configure Git (so the phone can push updates)
    git config --global user.name "Android Gateway"
    git config --global user.email "android@localhost"
    # Note: You might need to set up a Personal Access Token (PAT) for password-less push.
    ```
4.  **Start the Gateway**:
    ```bash
    node gateway.js
    ```

## 🔄 How it Works
1.  **Monday 8 PM**: GitHub Action runs `generate_queue.js`. It calculates balances and adds unsent SMS to `sms_queue.json`.
2.  **Sync**: Your phone (running `gateway.js`) pulls the changes from GitHub.
3.  **Send**: The script sees `sent: false`, sends the SMS via your SIM, sets `sent: true`.
4.  **Update**: The phone pushes the updated `sms_queue.json` back to GitHub.

## ⚠️ Important Notes
*   **Keep Termux Running**: The `gateway.js` script must be running on your phone for SMS to go out. You can run it in the background.
*   **Battery Optimization**: Disable battery optimization for Termux so Android doesn't kill it.
*   **Git Auth**: For the phone to push changes, use a GitHub Personal Access Token (Classic) with `repo` permissions as your password.
