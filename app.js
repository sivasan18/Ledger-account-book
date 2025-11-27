/**
 * Personal Account Book - Vanilla JS Implementation
 */

// --- Constants & Config ---
const STORAGE_KEY = 'ledger_data_v1';
const UNDO_DURATION = 5000; // 5 seconds

// --- State Management ---
let state = {
    people: [],
    transactions: []
};

let currentPersonId = null;
let undoTimer = null;
let pendingDeletion = null;

// --- Storage Adapter ---
const storage = {
    load: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : { people: [], transactions: [] };
        } catch (e) {
            console.error("Storage load error:", e);
            return { people: [], transactions: [] };
        }
    },
    save: (data) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Storage save error:", e);
        }
    },
    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
};

// --- Helpers ---
const generateId = () => crypto.randomUUID();

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getPersonTransactions = (personId) => {
    return state.transactions
        .filter(t => t.personId === personId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const calculateBalance = (personId) => {
    const txs = getPersonTransactions(personId);
    return txs.reduce((acc, tx) => {
        return tx.type === 'RECEIVED' ? acc + tx.amount : acc - tx.amount;
    }, 0);
};

// --- DOM Elements ---
const elements = {
    peopleList: document.getElementById('people-list'),
    searchInput: document.getElementById('search-input'),
    addPersonBtn: document.getElementById('add-person-btn'),
    emptyState: document.getElementById('empty-state'),
    personDetail: document.getElementById('personDetail'), // Note: ID in HTML was person-detail
    personName: document.getElementById('person-name'),
    personContact: document.getElementById('person-contact'),
    personBalance: document.getElementById('person-balance'),
    transactionsList: document.getElementById('transactions-list'),
    addTransactionBtn: document.getElementById('add-transaction-btn'),
    editPersonBtn: document.getElementById('edit-person-btn'),
    whatsappBtn: document.getElementById('whatsapp-btn'),
    exportBtn: document.getElementById('export-btn'),
    exportMenu: document.getElementById('export-menu'),
    exportCsvBtn: document.getElementById('export-csv'),
    exportPdfBtn: document.getElementById('export-pdf'),

    // Modals
    personModal: document.getElementById('person-modal'),
    personForm: document.getElementById('person-form'),
    personModalTitle: document.getElementById('person-modal-title'),
    personIdInput: document.getElementById('person-id'),
    personNameInput: document.getElementById('person-name-input'),
    personContactInput: document.getElementById('person-contact-input'),

    transactionModal: document.getElementById('transaction-modal'),
    transactionForm: document.getElementById('transaction-form'),
    transactionModalTitle: document.getElementById('transaction-modal-title'),
    transactionIdInput: document.getElementById('transaction-id'),
    transactionDateInput: document.getElementById('transaction-date'),
    transactionAmountInput: document.getElementById('transaction-amount'),
    transactionNotesInput: document.getElementById('transaction-notes'),
    transactionTypeInputs: document.getElementsByName('transaction-type'),

    settingsModal: document.getElementById('settings-modal'),
    settingsBtn: document.getElementById('settings-btn'),
    exportLedgerPdfBtn: document.getElementById('export-ledger-pdf-btn'),
    clearDataBtn: document.getElementById('clear-data-btn'),
    seedDataBtn: document.getElementById('seed-data-btn'),
    devSection: document.getElementById('dev-section'),

    snackbar: document.getElementById('snackbar'),
    snackbarMessage: document.getElementById('snackbar-message'),
    snackbarUndo: document.getElementById('snackbar-undo')
};

// Fix ID reference mismatch
elements.personDetail = document.getElementById('person-detail');

// --- Initialization ---
function init() {
    state = storage.load();

    // Check for dev mode (localhost) to show seed button
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        elements.devSection.style.display = 'block';
    }

    renderPeopleList();
    setupEventListeners();
}

// --- Rendering ---
function renderPeopleList() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filteredPeople = state.people.filter(p =>
        p.name.toLowerCase().includes(searchTerm)
    );

    // Sort by balance (descending)
    filteredPeople.sort((a, b) => {
        const balA = Math.abs(calculateBalance(a.id));
        const balB = Math.abs(calculateBalance(b.id));
        return balB - balA;
    });

    elements.peopleList.innerHTML = '';

    filteredPeople.forEach(person => {
        const balance = calculateBalance(person.id);
        const li = document.createElement('li');
        li.className = `person-item ${person.id === currentPersonId ? 'active' : ''}`;
        li.onclick = () => selectPerson(person.id);

        const initials = person.name.slice(0, 2).toUpperCase();
        const balanceClass = balance >= 0 ? 'positive' : 'negative';

        li.innerHTML = `
            <div class="person-item-content">
                <div class="person-avatar">${initials}</div>
                <div class="person-details">
                    <div class="person-name">${person.name}</div>
                    <div class="person-balance ${balanceClass}">${formatCurrency(balance)}</div>
                </div>
            </div>
        `;
        elements.peopleList.appendChild(li);
    });
}

function selectPerson(id) {
    currentPersonId = id;
    renderPeopleList(); // Update active state
    renderPersonView();
}

function renderPersonView() {
    if (!currentPersonId) {
        elements.emptyState.style.display = 'flex';
        elements.personDetail.style.display = 'none';
        return;
    }

    const person = state.people.find(p => p.id === currentPersonId);
    if (!person) return;

    elements.emptyState.style.display = 'none';
    elements.personDetail.style.display = 'flex';

    elements.personName.textContent = person.name;
    elements.personContact.textContent = person.contact || '';

    const balance = calculateBalance(person.id);
    elements.personBalance.textContent = formatCurrency(balance);
    elements.personBalance.className = `balance-amount ${balance >= 0 ? 'positive' : 'negative'}`;

    renderTransactions();
}

function renderTransactions() {
    const txs = getPersonTransactions(currentPersonId);
    elements.transactionsList.innerHTML = '';

    let runningBalance = 0;

    txs.forEach(tx => {
        if (tx.type === 'RECEIVED') runningBalance += tx.amount;
        else runningBalance -= tx.amount;

        const tr = document.createElement('tr');
        tr.className = tx.type === 'RECEIVED' ? 'credit' : 'debit';

        const typeLabel = tx.type === 'RECEIVED' ? 'RECEIVED (IN)' : 'GIVEN (OUT)';
        const typeClass = tx.type === 'RECEIVED' ? 'text-green' : 'text-red';
        const amountPrefix = tx.type === 'RECEIVED' ? '+' : '−';
        const balanceBadge = runningBalance >= 0 ? 'badge-green' : 'badge-red';

        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td class="${typeClass}"><strong>${typeLabel}</strong></td>
            <td class="text-right font-mono"><strong>${amountPrefix} ${formatCurrency(tx.amount)}</strong></td>
            <td class="text-right"><span class="badge ${balanceBadge}">${formatCurrency(runningBalance)}</span></td>
            <td>${tx.notes || ''}</td>
            <td class="text-right">
                <button class="action-btn" onclick="editTransaction('${tx.id}')" title="Edit">
                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button class="action-btn" onclick="deleteTransaction('${tx.id}')" title="Delete">
                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </td>
        `;
        elements.transactionsList.appendChild(tr);
    });
}

// --- Actions ---

// Person Actions
function openPersonModal(person = null) {
    elements.personModalTitle.textContent = person ? 'Edit Person' : 'Add Person';
    elements.personIdInput.value = person ? person.id : '';
    elements.personNameInput.value = person ? person.name : '';
    elements.personContactInput.value = person ? person.contact || '' : '';
    elements.personModal.classList.add('show');
}

function savePerson(e) {
    e.preventDefault();
    const id = elements.personIdInput.value;
    const name = elements.personNameInput.value.trim();
    const contact = elements.personContactInput.value.trim();

    if (id) {
        // Edit
        const index = state.people.findIndex(p => p.id === id);
        if (index !== -1) {
            state.people[index] = { ...state.people[index], name, contact };
        }
    } else {
        // Add
        const newPerson = { id: generateId(), name, contact };
        state.people.push(newPerson);
        currentPersonId = newPerson.id;
    }

    storage.save(state);
    closeModal(elements.personModal);
    renderPeopleList();
    renderPersonView();
}

// Transaction Actions
function openTransactionModal(transaction = null) {
    elements.transactionModalTitle.textContent = transaction ? 'Edit Transaction' : 'Add Transaction';
    elements.transactionIdInput.value = transaction ? transaction.id : '';

    // Date handling
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0, 16);

    if (transaction) {
        const d = new Date(transaction.date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        elements.transactionDateInput.value = d.toISOString().slice(0, 16);
    } else {
        elements.transactionDateInput.value = defaultDate;
    }

    elements.transactionAmountInput.value = transaction ? transaction.amount : '';
    elements.transactionNotesInput.value = transaction ? transaction.notes || '' : '';

    // Radio buttons
    const type = transaction ? transaction.type : 'GIVEN';
    Array.from(elements.transactionTypeInputs).forEach(input => {
        input.checked = input.value === type;
    });

    elements.transactionModal.classList.add('show');
}

function saveTransaction(e) {
    e.preventDefault();
    const id = elements.transactionIdInput.value;
    const date = new Date(elements.transactionDateInput.value).toISOString();
    const amount = parseFloat(elements.transactionAmountInput.value);
    const notes = elements.transactionNotesInput.value.trim();
    const type = Array.from(elements.transactionTypeInputs).find(r => r.checked).value;

    if (id) {
        // Edit
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            state.transactions[index] = { ...state.transactions[index], date, amount, notes, type };
        }
    } else {
        // Add
        const newTx = {
            id: generateId(),
            personId: currentPersonId,
            date,
            amount,
            notes,
            type
        };
        state.transactions.push(newTx);
    }

    storage.save(state);
    closeModal(elements.transactionModal);
    renderPeopleList(); // Balance updates
    renderPersonView();
}

// Global scope for onclick handlers
window.editTransaction = (id) => {
    const tx = state.transactions.find(t => t.id === id);
    if (tx) openTransactionModal(tx);
};

window.deleteTransaction = (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const txIndex = state.transactions.findIndex(t => t.id === id);
    if (txIndex === -1) return;

    const deletedTx = state.transactions[txIndex];

    // Remove from state
    state.transactions.splice(txIndex, 1);
    storage.save(state);

    // Update UI
    renderPeopleList();
    renderPersonView();

    // Show Snackbar
    showSnackbar('Transaction deleted', () => {
        // Undo action
        state.transactions.push(deletedTx);
        storage.save(state);
        renderPeopleList();
        renderPersonView();
        hideSnackbar();
    });
};

// --- Snackbar ---
function showSnackbar(message, onUndo) {
    elements.snackbarMessage.textContent = message;
    elements.snackbar.classList.add('show');

    elements.snackbarUndo.onclick = onUndo;

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(hideSnackbar, UNDO_DURATION);
}

function hideSnackbar() {
    elements.snackbar.classList.remove('show');
}

// --- Modals ---
function closeModal(modal) {
    modal.classList.remove('show');
    // Reset forms
    if (modal === elements.personModal) elements.personForm.reset();
    if (modal === elements.transactionModal) elements.transactionForm.reset();
}

// --- Export/Import ---
function exportCSV() {
    if (!currentPersonId) return;
    const person = state.people.find(p => p.id === currentPersonId);
    const txs = getPersonTransactions(currentPersonId);

    const headers = ['Date', 'Type', 'Amount', 'Notes'];
    const rows = txs.map(tx => [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        tx.amount,
        `"${(tx.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    downloadFile(`${person.name}-statement.csv`, 'text/csv', csvContent);
}

function exportPersonPDF() {
    if (!currentPersonId) return;
    const person = state.people.find(p => p.id === currentPersonId);
    const txs = getPersonTransactions(currentPersonId);

    generatePDF([person], state.transactions, `${person.name}-statement.pdf`);
}

function exportFullLedgerPDF() {
    generatePDF(state.people, state.transactions, `ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function generatePDF(peopleList, allTransactions, filename) {
    console.log("Starting PDF generation for:", filename);

    // Ensure jsPDF is loaded
    if (!window.jspdf) {
        console.error("jsPDF library not found!");
        alert('PDF library not loaded. Please check your internet connection and refresh the page.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let y = 20;

        // Title
        doc.setFontSize(18);
        doc.text(peopleList.length > 1 ? "Shivaah Personal Account Book - Full Ledger" : "Shivaah Personal Account Book - Statement", 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
        y += 10;

        let globalTotalIn = 0;
        let globalTotalOut = 0;

        peopleList.forEach((person, index) => {
            if (y > 270) { doc.addPage(); y = 20; }

            // Person Header
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(person.name, 14, y);
            y += 6;

            if (person.contact) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Contact: ${person.contact}`, 14, y);
                y += 6;
            }

            // Table Header
            y += 4;
            doc.setFillColor(240, 240, 240);
            doc.rect(14, y - 4, 182, 8, 'F');
            doc.setFontSize(9);
            doc.setTextColor(0);
            doc.setFont(undefined, 'bold');

            doc.text("Date", 16, y);
            doc.text("Type", 50, y);
            doc.text("Amount", 100, y, { align: 'right' });
            doc.text("Balance", 130, y, { align: 'right' });
            doc.text("Notes", 140, y);

            y += 8;
            doc.setFont(undefined, 'normal');

            // Transactions
            const txs = allTransactions
                .filter(t => t.personId === person.id)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            let running = 0;
            let totalIn = 0;
            let totalOut = 0;

            if (txs.length === 0) {
                doc.text("No transactions found.", 16, y);
                y += 10;
            }

            txs.forEach(tx => {
                if (y > 280) { doc.addPage(); y = 20; }

                if (tx.type === 'RECEIVED') {
                    running += tx.amount;
                    totalIn += tx.amount;
                    doc.setTextColor(22, 163, 74); // Green
                } else {
                    running -= tx.amount;
                    totalOut += tx.amount;
                    doc.setTextColor(220, 38, 38); // Red
                }

                doc.text(new Date(tx.date).toLocaleDateString(), 16, y);
                doc.text(tx.type, 50, y);
                doc.text((tx.type === 'RECEIVED' ? '+' : '−') + " " + tx.amount.toFixed(2), 100, y, { align: 'right' });

                // Balance column
                const balColor = running >= 0 ? [22, 163, 74] : [220, 38, 38];
                doc.setTextColor(balColor[0], balColor[1], balColor[2]);
                doc.text(running.toFixed(2), 130, y, { align: 'right' });

                // Notes
                doc.setTextColor(80);
                const note = tx.notes ? (tx.notes.length > 25 ? tx.notes.slice(0, 22) + '...' : tx.notes) : '';
                doc.text(note, 140, y);

                y += 6;
            });

            // Summary
            y += 2;
            doc.setDrawColor(200);
            doc.line(14, y, 196, y);
            y += 6;

            doc.setFont(undefined, 'bold');
            doc.setTextColor(0);
            doc.text("Total Credit:", 16, y);
            doc.setTextColor(22, 163, 74);
            doc.text(totalIn.toFixed(2), 50, y);

            doc.setTextColor(0);
            doc.text("Total Debit:", 80, y);
            doc.setTextColor(220, 38, 38);
            doc.text(totalOut.toFixed(2), 110, y);

            doc.setTextColor(0);
            doc.text("Closing Balance:", 140, y);
            const finalBal = totalIn - totalOut;
            doc.setTextColor(finalBal >= 0 ? [22, 163, 74] : [220, 38, 38]);
            doc.text(finalBal.toFixed(2), 196, y, { align: 'right' });

            y += 15;

            globalTotalIn += totalIn;
            globalTotalOut += totalOut;
        });

        // Global Summary (only if full ledger)
        if (peopleList.length > 1) {
            if (y > 250) { doc.addPage(); y = 20; }

            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text("Global Summary", 14, y);
            y += 10;

            doc.setFontSize(12);
            doc.text(`Total Credit (IN):  ${globalTotalIn.toFixed(2)}`, 14, y);
            y += 8;
            doc.text(`Total Debit (OUT): ${globalTotalOut.toFixed(2)}`, 14, y);
            y += 8;
            const globalBal = globalTotalIn - globalTotalOut;
            doc.text(`Net Balance:       ${globalBal.toFixed(2)}`, 14, y);
        }

        doc.save(filename);
        console.log("PDF generated successfully");
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("Failed to generate PDF. See console for details.");
    }
}

function sendWhatsAppReminder() {
    if (!currentPersonId) return;
    const person = state.people.find(p => p.id === currentPersonId);
    if (!person) return;

    const balance = calculateBalance(person.id);
    const absBalance = Math.abs(balance);
    const currency = formatCurrency(absBalance);

    let message = `Hello ${person.name},\n\n`;
    if (balance > 0) {
        message += `You have a remaining balance of ${currency} (RECEIVED/IN) with me.`;
    } else if (balance < 0) {
        message += `You have a remaining balance of ${currency} (GIVEN/OUT) to pay me.`;
    } else {
        message += `Your account is settled. Balance is ₹0.`;
    }

    message += `\n\n- Sent from Shivaah Personal Account Book`;

    const encodedMessage = encodeURIComponent(message);

    // If contact number exists, use it. Otherwise just open WhatsApp with text.
    let url = `https://wa.me/`;
    if (person.contact) {
        // Strip non-numeric chars
        const cleanNumber = person.contact.replace(/\D/g, '');
        if (cleanNumber) {
            url += `91${cleanNumber}`; // Assuming India +91, can be adjusted or made dynamic
        }
    }
    url += `?text=${encodedMessage}`;

    window.open(url, '_blank');
}

function downloadFile(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Event Listeners ---
function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', renderPeopleList);

    // Modals
    elements.addPersonBtn.addEventListener('click', () => openPersonModal());
    elements.editPersonBtn.addEventListener('click', () => {
        const person = state.people.find(p => p.id === currentPersonId);
        if (person) openPersonModal(person);
    });

    elements.whatsappBtn.addEventListener('click', sendWhatsAppReminder);

    elements.addTransactionBtn.addEventListener('click', () => openTransactionModal());

    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('show');
    });

    // Close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-close');
            closeModal(document.getElementById(modalId));
        });
    });

    // Forms
    elements.personForm.addEventListener('submit', savePerson);
    elements.transactionForm.addEventListener('submit', saveTransaction);

    // Export Dropdown
    elements.exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        elements.exportMenu.classList.remove('show');
    });

    elements.exportCsvBtn.addEventListener('click', exportCSV);
    elements.exportPdfBtn.addEventListener('click', exportPersonPDF);

    // Settings Actions
    elements.exportLedgerPdfBtn.addEventListener('click', exportFullLedgerPDF);

    elements.clearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
            storage.clear();
            state = { people: [], transactions: [] };
            currentPersonId = null;
            renderPeopleList();
            renderPersonView();
            closeModal(elements.settingsModal);
        }
    });

    elements.seedDataBtn.addEventListener('click', async () => {
        if (confirm('Load sample data? This will overwrite current data.')) {
            try {
                const res = await fetch('sample-data.json');
                const data = await res.json();
                state = data;
                storage.save(state);
                renderPeopleList();
                closeModal(elements.settingsModal);
            } catch (e) {
                alert('Failed to load sample data');
            }
        }
    });
}

// Start App
document.addEventListener('DOMContentLoaded', init);
