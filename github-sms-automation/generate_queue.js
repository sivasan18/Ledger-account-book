const fs = require('fs');

// Configuration
const DATA_FILE = 'data.json';
const QUEUE_FILE = 'sms_queue.json';

function generateQueue() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.error("Error: data.json not found.");
            process.exit(1);
        }

        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);

        const people = data.people || [];
        const transactions = data.transactions || [];

        let queue = [];

        // Preserve existing unsent items if any
        if (fs.existsSync(QUEUE_FILE)) {
            const existingQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
            queue = existingQueue.filter(item => !item.sent);
        }

        console.log(`Processing ${people.length} people...`);

        people.forEach(person => {
            if (!person.contact) return;

            // Calculate Stats
            const personTxs = transactions.filter(t => t.personId === person.id);

            let currentBalance = 0;
            personTxs.forEach(t => {
                if (t.type === 'RECEIVED') currentBalance += t.amount;
                else currentBalance -= t.amount;
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

            // Only send if there's activity or non-zero balance
            if (currentBalance === 0 && weeklyCredit === 0 && weeklyDebit === 0) {
                return;
            }

            const msg = `Hi ${person.name},\nWeekly Summary:\nIN: +${weeklyCredit}\nOUT: -${weeklyDebit}\nBalance: ${currentBalance}\n- Shivaah Ledger`;

            // Add to queue
            queue.push({
                id: crypto.randomUUID(),
                phone: person.contact,
                message: msg,
                sent: false,
                timestamp: new Date().toISOString()
            });
        });

        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
        console.log(`Generated ${queue.length} SMS tasks.`);

    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

// Simple UUID generator shim if crypto not available in older node
const crypto = {
    randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36)
};

generateQueue();
