// public/app.js

// Base URL for your backend API
const API_BASE = "http://localhost:3001/api";

// Simple in-memory state
let contacts = [];
let selectedContactId = null;
let selectedContact = null;

// Wire up events when the page loads
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("refreshContactsBtn")
    .addEventListener("click", loadContacts);

  document
    .getElementById("createContactForm")
    .addEventListener("submit", onCreateContactSubmit);

  document
    .getElementById("createDealForm")
    .addEventListener("submit", onCreateDealSubmit);

  document
    .getElementById("aiInsightBtn")
    .addEventListener("click", onGenerateAiInsight);

  // Load contacts on initial page load
  loadContacts();
});

// ----------------------
// Contacts
// ----------------------
async function loadContacts() {
  const statusEl = document.getElementById("contactsStatus");
  const tbody = document.querySelector("#contactsTable tbody");

  statusEl.textContent = "Loading contacts...";
  tbody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/contacts`);
    if (!res.ok) {
      throw new Error(`Failed to load contacts (${res.status})`);
    }

    const data = await res.json();

    // Backend returns { results: [...] }
    contacts = data.results || [];

    if (!contacts.length) {
      statusEl.textContent = "No contacts found in HubSpot.";
      return;
    }

    for (const contact of contacts) {
      const props = contact.properties || contact;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${props.firstname || ""}</td>
        <td>${props.lastname || ""}</td>
        <td>${props.email || ""}</td>
        <td>${props.jobtitle || ""}</td>
        <td>${props.company || ""}</td>
      `;

      tr.addEventListener("click", () => onSelectContact(contact));
      tbody.appendChild(tr);
    }

    statusEl.textContent = `Loaded ${contacts.length} contact(s).`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error loading contacts: ${err.message}`;
  }
}

async function onCreateContactSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const statusEl = document.getElementById("createContactStatus");

  const formData = new FormData(form);
  const body = {
    properties: {
      firstname: formData.get("firstname"),
      lastname: formData.get("lastname"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
    },
  };

  statusEl.textContent = "Creating contact in HubSpot...";

  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create contact (${res.status}): ${text}`);
    }

    await res.json();
    statusEl.textContent = "Contact created successfully in HubSpot.";

    form.reset();
    await loadContacts();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error creating contact: ${err.message}`;
  }
}

function onSelectContact(contact) {
  const props = contact.properties || contact;

  selectedContactId = contact.id || props.id;
  selectedContact = contact;

  const infoEl = document.getElementById("selectedContactInfo");
  infoEl.textContent = `Selected: ${props.firstname || ""} ${
    props.lastname || ""
  } (${props.email || ""})`;

  // Enable AI button for this contact
  document.getElementById("aiInsightBtn").disabled = false;

  // Load deals for the selected contact
  loadDealsForContact(selectedContactId);
}

// ----------------------
// Deals
// ----------------------
async function loadDealsForContact(contactId) {
  const statusEl = document.getElementById("dealsStatus");
  const tbody = document.querySelector("#dealsTable tbody");

  statusEl.textContent = "Loading deals...";
  tbody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/contacts/${contactId}/deals`);
    if (!res.ok) {
      throw new Error(`Failed to load deals (${res.status})`);
    }

    const data = await res.json();
    const deals = data.results || [];

    if (!deals.length) {
      statusEl.textContent = "No deals found for this contact.";
      return;
    }

    for (const deal of deals) {
      const props = deal.properties || deal;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${props.dealname || ""}</td>
        <td>${props.amount || ""}</td>
        <td>${props.dealstage || ""}</td>
      `;
      tbody.appendChild(tr);
    }

    statusEl.textContent = `Loaded ${deals.length} deal(s).`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error loading deals: ${err.message}`;
  }
}

async function onCreateDealSubmit(event) {
  event.preventDefault();

  const statusEl = document.getElementById("createDealStatus");

  if (!selectedContactId) {
    statusEl.textContent = "Please select a contact first.";
    return;
  }

  const form = event.target;
  const formData = new FormData(form);

  const body = {
    dealProperties: {
      dealname: formData.get("dealname"),
      amount: String(formData.get("amount")),
      dealstage: formData.get("dealstage"),
    },
    contactId: String(selectedContactId),
  };

  statusEl.textContent = "Creating deal in HubSpot...";

  try {
    const res = await fetch(`${API_BASE}/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create deal (${res.status}): ${text}`);
    }

    await res.json();
    statusEl.textContent = "Deal created and associated with contact.";

    await loadDealsForContact(selectedContactId);
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error creating deal: ${err.message}`;
  }
}

// ----------------------
// AI Insight
// ----------------------
async function onGenerateAiInsight() {
  const statusEl = document.getElementById("aiStatus");
  const outputEl = document.getElementById("aiInsightOutput");

  if (!selectedContactId) {
    statusEl.textContent = "Select a contact first.";
    return;
  }

  statusEl.textContent = "Generating AI insight...";
  outputEl.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/ai/customer-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: selectedContactId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI request failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    outputEl.textContent = data.summary || "(No summary returned)";
    statusEl.textContent = "AI insight generated.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error generating AI insight: ${err.message}`;
  }
}
