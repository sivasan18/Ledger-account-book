const fs = require('fs');
const cron = require('node-cron');
const twilio = require('twilio');
require('dotenv').config();

// Configuration
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SENDER_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

console.log("SMS Automation Service Started.");
console.log("Waiting for next scheduled run (Monday 8:00 PM IST)...");

// Schedule: Every Monday at 8:00 PM Indian Standard Time (IST)
cron.schedule('0 20 * * 1', () => {
    console.log(`[${new Date().toLocaleString()}] Starting weekly SMS job...`);
    sendWeeklySummaries();
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

function sendWeeklySummaries() {
    try {
        // Read data
        const rawData = fs.readFileSync('data.json', 'utf8');
        const data = JSON.parse(rawData);

        const people = data.people || [];
        const transactions = data.transactions || [];

        console.log(`Found ${people.length} people to process.`);

        people.forEach(person => {
            // Skip if no contact number
            if (!person.contact) {
                console.log(`Skipping ${person.name} (No contact number)`);
                return;
            }

            // 1. Calculate Stats
            const personTxs = transactions.filter(t => t.personId === person.id);

            // Current Balance (All time)
            let currentBalance = 0;
            personTxs.forEach(t => {
                if (t.type === 'RECEIVED') currentBalance += t.amount;
                else currentBalance -= t.amount; // GIVEN is negative
            });

            // Weekly Stats (Last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            let weeklyCredit = 0;
            let weeklyDebit = 0;

            personTxs.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate >= oneWeekAgo) {
                    if (t.type === 'RECEIVED') weeklyCredit += t.amount;
                    else weeklyDebit += t.amount;
                }
            });

            // 2. Construct Message
            // Format:
            // Hi Name,
            // Weekly Summary:
            // IN: +500
            // OUT: -200
            // Balance: 300
            // - Shivaah Ledger

            const msg = `Hi ${person.name},\nWeekly Summary:\nIN (Credit): +${weeklyCredit}\nOUT (Debit): -${weeklyDebit}\nCurrent Balance: ${currentBalance}\n- Shivaah Ledger`;

            // 3. Send SMS
            sendSMS(person.contact, msg, person.name);
        });

    } catch (error) {
        console.error("Error processing data:", error.message);
    }
}

function sendSMS(to, body, name) {
    // Basic phone number formatting (Assuming India +91 if missing)
    let phone = to.replace(/\D/g, ''); // Remove non-digits
    if (phone.length === 10) phone = '+91' + phone;
    else if (!phone.startsWith('+')) phone = '+' + phone;

    client.messages.create({
        body: body,
        from: SENDER_NUMBER,
        to: phone
    })
        .then(message => console.log(`✅ SMS sent to ${name} (${phone}): ${message.sid}`))
        .catch(error => console.error(`❌ Failed to send to ${name} (${phone}):`, error.message));
}
