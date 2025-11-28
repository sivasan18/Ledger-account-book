# Complete Step-by-Step Setup Guide

## 📋 Prerequisites
- A GitHub account
- An Android phone with your SIM card (7708481818)
- Internet connection on both computer and phone

---

## Part 1: GitHub Repository Setup (Do this on your computer)

### Step 1.1: Create GitHub Repository
1. Go to **https://github.com**
2. Click the **green "New"** button (or go to https://github.com/new)
3. Enter repository name: `ledger-sms-automation`
4. Select **Private** repository (important!)
5. **DO NOT** initialize with README
6. Click **"Create repository"**

### Step 1.2: Upload Files to GitHub
Open Terminal on your Mac and run these commands:

```bash
# Navigate to the github-sms-automation folder
cd "/Users/tsr/Downloads/ledger account /github-sms-automation"

# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit"

# Add your GitHub repository as remote
# REPLACE 'YOUR_USERNAME' with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/ledger-sms-automation.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note**: When it asks for username/password:
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your actual password)

### Step 1.3: Create Personal Access Token (PAT)
You'll need this for authentication:

1. Go to **GitHub.com** → Click your profile picture (top right)
2. Go to **Settings** → **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **"Generate new token"** → **"Generate new token (classic)"**
5. Give it a name: `Ledger SMS Automation`
6. Select scopes: Check **`repo`** (Full control of private repositories)
7. Click **"Generate token"**
8. **COPY THE TOKEN** and save it somewhere safe (you'll need it twice)

### Step 1.4: Enable GitHub Actions
1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Go to **"Actions"** → **"General"** (left sidebar)
4. Under "Workflow permissions", select **"Read and write permissions"**
5. Click **"Save"**

---

## Part 2: Android Phone Setup

### Step 2.1: Install Required Apps

**Option A: F-Droid (Recommended)**
1. Download **F-Droid** app from: https://f-droid.org
2. Install F-Droid
3. Open F-Droid app
4. Search for **"Termux"** and install it
5. Search for **"Termux:API"** and install it

**Option B: Google Play Store**
1. Open **Play Store**
2. Search for **"Termux"**
3. Install **Termux** by Fredrik Fornwall
4. Search for **"Termux:API"**
5. Install **Termux:API**

### Step 2.2: Configure Termux (Do this on your phone)

Open the **Termux** app and run these commands **one by one**:

```bash
# Step 1: Update packages (may take 2-3 minutes)
pkg update && pkg upgrade
# Press 'Y' when asked to confirm

# Step 2: Install required tools
pkg install git nodejs termux-api
# Press 'Y' when asked to confirm

# Step 3: Grant storage access
termux-setup-storage
# A popup will appear - Click "Allow"

# Step 4: Test SMS permission (IMPORTANT!)
termux-sms-send -n 123 test
# A popup will appear asking for SMS permission
# Click "Allow" or "While using the app"
```

### Step 2.3: Clone Your Repository on Phone

Still in Termux, run these commands:

```bash
# Navigate to home directory
cd ~

# Clone your repository
# REPLACE 'YOUR_USERNAME' with your actual GitHub username
git clone https://github.com/YOUR_USERNAME/ledger-sms-automation.git

# Navigate into the folder
cd ledger-sms-automation

# Configure git
git config --global user.name "Android Gateway"
git config --global user.email "android@localhost"
```

### Step 2.4: Set Up Git Authentication on Phone

You'll be asked for credentials when the script tries to push. To avoid this every time:

```bash
# Store credentials (in Termux)
git config --global credential.helper store

# Do a test pull to trigger credential prompt
git pull
# When asked:
# Username: YOUR_GITHUB_USERNAME
# Password: PASTE_YOUR_PERSONAL_ACCESS_TOKEN (from Step 1.3)
```

After this, Git will remember your token.

### Step 2.5: Start the Gateway Script

```bash
# Make sure you're in the right folder
cd ~/ledger-sms-automation

# Run the gateway
node gateway.js
```

You should see:
```
🤖 Android SMS Gateway Started
Waiting for SMS tasks from GitHub...
🔄 Syncing with GitHub...
No pending SMS.
```

---

## Part 3: Testing the System

### Test 3.1: Manual Trigger (From Computer)

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Click **"Weekly SMS Summary"** workflow (left sidebar)
4. Click **"Run workflow"** dropdown button (right side)
5. Click **"Run workflow"** green button
6. Wait 10-20 seconds, refresh the page
7. Click on the running workflow to see logs

### Test 3.2: Check Your Phone

Within 1-2 minutes, your Termux app should show:
```
🔄 Syncing with GitHub...
Found X pending SMS.
📤 Sending to 9876543210...
✅ Sent!
```

### Test 3.3: Verify SMS Sent

- Check your phone's SMS messages
- You should see an SMS sent from your number (7708481818) to the contact number

---

## Part 4: Production Setup

### Keep Termux Running in Background

1. Open **Phone Settings** → **Apps** → **Termux**
2. Go to **Battery** → Disable **"Battery optimization"**
3. This prevents Android from killing Termux

### Auto-start on Phone Reboot (Optional)

Create a script to auto-start gateway on boot:

1. In Termux, create a boot script:
```bash
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-gateway.sh
```

2. Add this content:
```bash
#!/data/data/com.termux/files/usr/bin/sh
cd ~/ledger-sms-automation
node gateway.js
```

3. Save and exit (Ctrl+X, then Y, then Enter)

4. Make it executable:
```bash
chmod +x ~/.termux/boot/start-gateway.sh
```

---

## 📊 How to Update Your Data

Whenever you want to update the ledger data:

1. On your computer, edit the `data.json` file in the `github-sms-automation` folder
2. Commit and push:
```bash
cd "/Users/tsr/Downloads/ledger account /github-sms-automation"
git add data.json
git commit -m "Update ledger data"
git push
```

3. The phone will automatically sync when the next check happens (every 1 minute)

---

## 🔧 Troubleshooting

### Problem: "Permission denied" when sending SMS
**Solution**: Run `termux-sms-send -n 123 test` again and allow permissions

### Problem: Git push fails on phone
**Solution**: 
1. Check your Personal Access Token is correct
2. Run `git config --global credential.helper store`
3. Try `git pull` and enter credentials again

### Problem: Termux keeps closing
**Solution**: Disable battery optimization for Termux in phone settings

### Problem: GitHub Actions not running
**Solution**: 
1. Go to repo Settings → Actions → General
2. Enable "Read and write permissions"
3. Save

---

## ✅ Success Checklist

- [ ] GitHub repository created and files uploaded
- [ ] GitHub Actions enabled with write permissions
- [ ] Personal Access Token created
- [ ] Termux and Termux:API installed on phone
- [ ] SMS permission granted to Termux
- [ ] Repository cloned on phone
- [ ] Git credentials stored on phone
- [ ] `gateway.js` running and showing "Waiting for SMS tasks"
- [ ] Manual workflow test completed successfully
- [ ] SMS received from your own number
- [ ] Battery optimization disabled for Termux

---

**You're all set! The system will now automatically send SMS every Monday at 8 PM IST.**
