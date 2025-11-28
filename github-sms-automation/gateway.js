const fs = require('fs');
const { exec } = require('child_process');

// Configuration
const QUEUE_FILE = 'sms_queue.json';
const SYNC_INTERVAL = 60000; // Check every 1 minute

console.log("🤖 Android SMS Gateway Started");
console.log("Waiting for SMS tasks from GitHub...");

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout.trim());
        });
    });
}

async function sendSMS(phone, message) {
    console.log(`📤 Sending to ${phone}...`);
    // Uses Termux API to send SMS
    // Command: termux-sms-send -n number text
    try {
        // Escape message for shell
        const safeMessage = message.replace(/"/g, '\\"');
        await runCommand(`termux-sms-send -n "${phone}" "${safeMessage}"`);
        console.log("✅ Sent!");
        return true;
    } catch (e) {
        console.error("❌ Failed:", e.message);
        return false;
    }
}

async function syncAndProcess() {
    try {
        console.log("🔄 Syncing with GitHub...");

        // 1. Pull latest changes
        await runCommand('git pull');

        if (!fs.existsSync(QUEUE_FILE)) {
            console.log("No queue file found.");
            return;
        }

        // 2. Read Queue
        const rawData = fs.readFileSync(QUEUE_FILE, 'utf8');
        let queue = JSON.parse(rawData);

        const pending = queue.filter(item => !item.sent);

        if (pending.length === 0) {
            console.log("No pending SMS.");
            return;
        }

        console.log(`Found ${pending.length} pending SMS.`);

        // 3. Process Queue
        let processedCount = 0;
        for (const item of pending) {
            const success = await sendSMS(item.phone, item.message);
            if (success) {
                item.sent = true;
                item.sentAt = new Date().toISOString();
                processedCount++;
            }
            // Small delay between SMS to avoid spam blocks
            await new Promise(r => setTimeout(r, 2000));
        }

        // 4. Push updates back if any processed
        if (processedCount > 0) {
            fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
            await runCommand('git add sms_queue.json');
            await runCommand('git commit -m "Processed SMS queue [skip ci]"');
            await runCommand('git push');
            console.log("💾 Updated queue pushed to GitHub.");
        }

    } catch (error) {
        console.error("Error in sync loop:", error.message);
    }
}

// Run immediately then interval
syncAndProcess();
setInterval(syncAndProcess, SYNC_INTERVAL);
