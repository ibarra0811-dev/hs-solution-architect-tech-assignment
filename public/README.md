# HubSpot Integration with AI Insights

A full-stack application that integrates with HubSpot CRM to manage contacts and deals, with optional AI-powered customer insights powered by OpenAI.

## Features

- **Contact Management**: View, create, and manage contacts in HubSpot
- **Deal Management**: Create and track deals associated with contacts
- **AI Customer Insights**: Generate AI-powered summaries and insights about customers (requires OpenAI API key)
- **RESTful API**: Backend API for all CRM operations
- **Web UI**: Interactive frontend for managing contacts and deals

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with HTML/CSS
- **Integrations**: HubSpot API, OpenAI API
- **Dependencies**: `express`, `cors`, `dotenv`, `@hubspot/api-client`, `openai`

## Prerequisites

- Node.js and npm installed
- HubSpot Private App Access Token
- OpenAI API key (optional, for AI features)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or update the `.env` file in the project root with the following variables:

```env
# HubSpot Private App Access Token (required)
# Get this from: Settings > Integrations > Private Apps
# Required scopes: crm.objects.contacts.read, crm.objects.contacts.write,
#                  crm.objects.deals.read, crm.objects.deals.write
HUBSPOT_ACCESS_TOKEN=your_hubspot_token_here

# OpenAI API Key (optional, for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Server port (default: 3001)
PORT=3001
```

### 3. Start the Server

```bash
npm start
```

The application will start on `http://localhost:3001` (or the port specified in `.env`).

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/:id` - Get a specific contact
- `PATCH /api/contacts/:id` - Update a contact
- `DELETE /api/contacts/:id` - Delete a contact

### Deals
- `GET /api/deals` - List all deals
- `POST /api/deals` - Create a new deal
- `GET /api/deals/:id` - Get a specific deal
- `PATCH /api/deals/:id` - Update a deal
- `DELETE /api/deals/:id` - Delete a deal

### AI Insights
- `POST /api/ai/customer-summary` - Generate AI-powered customer insights

## Usage Examples

### Create a Contact

```powershell
$body = @{
  properties = @{
    firstname = "John"
    lastname = "Doe"
    email = "john@example.com"
  }
} | ConvertTo-Json

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/contacts" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
```

### List Contacts

```bash
curl http://localhost:3001/api/contacts
```

## Project Structure

```
public/
├── README.md              # This file
├── .env                   # Environment variables (not committed)
├── package.json           # Node.js dependencies and scripts
├── server.js              # Express backend server
├── app.js                 # Frontend JavaScript
├── index.html             # Frontend HTML
└── public/                # Static files served by Express
```

## Troubleshooting

### Missing HUBSPOT_ACCESS_TOKEN
The application requires a HubSpot Private App token to run. Set the `HUBSPOT_ACCESS_TOKEN` in your `.env` file.

### AI Features Not Working
If OpenAI features are not available, ensure the `OPENAI_API_KEY` is set in your `.env` file. Without it, the AI endpoints will return an error.

### Port Already in Use
If port 3001 is already in use, either:
- Stop the process using that port
- Change the PORT environment variable in `.env`

## Testing

To test the API endpoints:

```bash
npm test
```

## License

This project is part of a technical assignment.

## Assessment Notes

I tried my best in this POC. I used ChatGPT and the built in agent within VS Code for AI assistance.
The assigment was difficult and took more hours than I anticipated. It had been quite some time since I used tools like VS Code and Postman. And even HTML/CSS.
This is where AI was particularly helpful. I feel good about the information I can extract from AI tools and put it to use. I believe I am good at prompting. I understand how to use the HubSpot CRM.
Where I struggled was understanding the concept and creating the POC on the frontend for a presentation. This is where I feel internal HubSpot coaching would be needed. If I could see an example of a POC and the thought process behind the building of it, then I think I could grasp it all and feel very comfortable building a POC. 
I would say that AI built out most of this with some human refinement (by prompting AI to regenerate code with additional explanation)
## ERD
erDiagram
    CONTACT {
      string id
      string email
      string firstname
      string lastname
      string phone
      string address
      int    breezy_thermostat_count
      string breezy_subscription_status
      date   breezy_trial_start_date
      date   breezy_trial_end_date
      bool   breezy_has_premium
    }

    THERMOSTAT {
      string id
      string serial_number
      string model
      date   install_date
      string location_room
      string status
    }

    DEAL {
      string id
      string dealname
      decimal amount
      string dealstage
      string pipeline
      string subscription_type
      date   subscription_start_date
      date   subscription_end_date
      bool   is_renewal
      bool   trial_to_paid
    }

    %% Relationships
    CONTACT ||--o{ THERMOSTAT : owns
    CONTACT ||--o{ DEAL : "has subscription deals"
    THERMOSTAT }o--o{ DEAL : "optionally linked to"
