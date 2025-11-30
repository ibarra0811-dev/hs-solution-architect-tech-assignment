// server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const hubspot = require("@hubspot/api-client");
const OpenAI = require("openai");

// --- Config / clients ---

const PORT = process.env.PORT || 3001;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // set in .env

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error(
    "❌ HUBSPOT_ACCESS_TOKEN is missing. Set it in your .env file."
  );
  process.exit(1);
}

const hubspotClient = new hubspot.Client({
  accessToken: HUBSPOT_ACCESS_TOKEN,
});

let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn(
    "⚠️ OPENAI_API_KEY is not set. /api/ai/customer-summary will return an error."
  );
}

// --- Express app setup ---

const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// ----------------------
// Health check
// ----------------------
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ----------------------
// Helpers
// ----------------------
function handleHubSpotError(err, res, message) {
  console.error(message, err?.response?.body || err);

  const details =
    err?.response?.body || err?.message || "Unknown HubSpot error";

  res.status(err?.statusCode || 500).json({
    error: message,
    details,
  });
}

// Small helper to normalize HubSpot SDK responses
function extractListResults(apiResponse) {
  if (!apiResponse) return [];
  // v9+ returns { results, paging, ... }
  if (Array.isArray(apiResponse.results)) return apiResponse.results;
  // some examples use .body.results
  if (apiResponse.body && Array.isArray(apiResponse.body.results)) {
    return apiResponse.body.results;
  }
  return [];
}

// ----------------------
// Contacts
// ----------------------

// GET /api/contacts - fetch contacts from HubSpot
app.get("/api/contacts", async (req, res) => {
  try {
    const limit = 50;
    const after = undefined;
    const properties = [
      "firstname",
      "lastname",
      "email",
      "phone",
      "address",
      "jobtitle",
      "company",
    ];
    const propertiesWithHistory = undefined;
    const associations = undefined;
    const archived = false;

    const apiResponse =
      await hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        after,
        properties,
        propertiesWithHistory,
        associations,
        archived
      );

    const results = extractListResults(apiResponse);
    res.json({ results });
  } catch (err) {
    handleHubSpotError(err, res, "Error fetching contacts from HubSpot");
  }
});

// POST /api/contacts - create contact in HubSpot
app.post("/api/contacts", async (req, res) => {
  try {
    const { properties } = req.body || {};
    if (!properties || !properties.email) {
      return res
        .status(400)
        .json({ error: "properties.email is required to create a contact" });
    }

    const createResponse = await hubspotClient.crm.contacts.basicApi.create({
      properties,
    });

    // For consistency, we return { id, properties }
    const contact = {
      id: createResponse.id || createResponse.body?.id,
      properties: createResponse.properties || createResponse.body?.properties,
    };

    res.status(201).json(contact);
  } catch (err) {
    handleHubSpotError(err, res, "Error creating contact in HubSpot");
  }
});

// ----------------------
// Deals
// ----------------------

// GET /api/deals - fetch deals from HubSpot
app.get("/api/deals", async (req, res) => {
  try {
    const limit = 50;
    const after = undefined;
    const properties = ["dealname", "amount", "dealstage", "pipeline"];
    const propertiesWithHistory = undefined;
    const associations = undefined;
    const archived = false;

    const apiResponse =
      await hubspotClient.crm.deals.basicApi.getPage(
        limit,
        after,
        properties,
        propertiesWithHistory,
        associations,
        archived
      );

    const results = extractListResults(apiResponse);
    res.json({ results });
  } catch (err) {
    handleHubSpotError(err, res, "Error fetching deals from HubSpot");
  }
});

// POST /api/deals - create deal and associate with a contact
app.post("/api/deals", async (req, res) => {
  try {
    const { dealProperties, contactId } = req.body || {};

    if (!dealProperties || !dealProperties.dealname) {
      return res
        .status(400)
        .json({ error: "dealProperties.dealname is required" });
    }
    if (!contactId) {
      return res
        .status(400)
        .json({ error: "contactId is required to associate the deal" });
    }

    // 1) Create the deal
    const createResponse = await hubspotClient.crm.deals.basicApi.create({
      properties: dealProperties,
    });

    const dealId = createResponse.id || createResponse.body?.id;
    const dealPropertiesCreated =
      createResponse.properties || createResponse.body?.properties;

    // 2) Associate deal -> contact using associations API
    // Deal to Contact default associationTypeId is 3 (HUBSPOT_DEFINED)
    // https://developers.hubspot.com/docs/api-reference/crm-associations-v4/guide
    const associationSpec = [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: 3,
      },
    ];

    await hubspotClient.crm.deals.associationsApi.create(
      dealId,
      "contacts",
      String(contactId),
      associationSpec
    );

    res.status(201).json({
      id: dealId,
      properties: dealPropertiesCreated,
    });
  } catch (err) {
    handleHubSpotError(
      err,
      res,
      "Error creating deal or associating it with contact"
    );
  }
});

// GET /api/contacts/:contactId/deals - get deals for a specific contact
app.get("/api/contacts/:contactId/deals", async (req, res) => {
  const { contactId } = req.params;

  try {
    // 1) Get associated deals for this contact
    const associations =
      await hubspotClient.crm.contacts.associationsApi.getAll(
        contactId,
        "deals"
      );

    const assocResults = associations.results || [];
    const dealIds = assocResults.map((a) => a.toObjectId).filter(Boolean);

    if (!dealIds.length) {
      return res.json({ results: [] });
    }

    // 2) Fetch each deal's basic properties
    const deals = [];
    for (const id of dealIds) {
      const deal = await hubspotClient.crm.deals.basicApi.getById(id, [
        "dealname",
        "amount",
        "dealstage",
        "pipeline",
      ]);

      deals.push({
        id: deal.id || deal.body?.id,
        properties: deal.properties || deal.body?.properties,
      });
    }

    res.json({ results: deals });
  } catch (err) {
    handleHubSpotError(
      err,
      res,
      "Error fetching deals for specific contact from HubSpot"
    );
  }
});

// ----------------------
// AI Feature
// ----------------------

// Helper to get a single contact (id + properties)
async function getContactFromHubSpot(contactId) {
  const contact = await hubspotClient.crm.contacts.basicApi.getById(
    contactId,
    ["firstname", "lastname", "email", "phone", "address", "jobtitle", "company"]
  );

  return {
    id: contact.id || contact.body?.id,
    properties: contact.properties || contact.body?.properties,
  };
}

// Helper to get deals for a contact (reuse the logic above)
async function getDealsForContactFromHubSpot(contactId) {
  const associations =
    await hubspotClient.crm.contacts.associationsApi.getAll(
      contactId,
      "deals"
    );

  const assocResults = associations.results || [];
  const dealIds = assocResults.map((a) => a.toObjectId).filter(Boolean);

  if (!dealIds.length) return [];

  const deals = [];
  for (const id of dealIds) {
    const deal = await hubspotClient.crm.deals.basicApi.getById(id, [
      "dealname",
      "amount",
      "dealstage",
      "pipeline",
    ]);
    deals.push({
      id: deal.id || deal.body?.id,
      properties: deal.properties || deal.body?.properties,
    });
  }

  return deals;
}

// POST /api/ai/customer-summary
app.post("/api/ai/customer-summary", async (req, res) => {
  const { contactId } = req.body || {};

  if (!contactId) {
    return res.status(400).json({ error: "contactId is required" });
  }

  if (!openai) {
    return res.status(500).json({
      error:
        "AI not configured. Set OPENAI_API_KEY in your .env to enable this endpoint.",
    });
  }

  try {
    const contact = await getContactFromHubSpot(contactId);
    const deals = await getDealsForContactFromHubSpot(contactId);

    const prompt = `
You are helping Breezy, a smart home company, understand a customer's relationship with them.

Customer (contact):
${JSON.stringify(contact, null, 2)}

Deals (subscriptions):
${JSON.stringify(deals, null, 2)}

Please:
1) Summarize this customer's relationship with Breezy in 3–4 sentences.
2) Suggest the next best marketing or sales action Breezy should take.
Keep it concise and non-technical.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const summary = completion.choices[0].message.content;
    res.json({ summary });
  } catch (err) {
    console.error("Error generating AI insight:", err);
    res.status(500).json({
      error: "Failed to generate AI insight",
      details: err?.message || err,
    });
  }
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => {
  console.log("✅ Server running successfully!");
  console.log(`   API available at: http://localhost:${PORT}`);
  console.log(`   Health check:     http://localhost:${PORT}/health`);
  console.log(`   Static files:     ${path.join(__dirname, "public")}`);
});
