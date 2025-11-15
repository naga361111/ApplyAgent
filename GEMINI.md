# GEMINI.md

## Project Overview

This project is a web-based automation agent designed to fill out and submit web forms. It consists of a Node.js backend, a simple HTML frontend, and an n8n workflow for automation.

**Key Technologies:**

*   **Backend:** Node.js, Express.js, Playwright, Cheerio, Google Generative AI, Ollama
*   **Frontend:** HTML, CSS, JavaScript
*   **Automation:** n8n
*   **Database:** My JSON Server (for user data)

**Architecture:**

1.  **Frontend:** A user interacts with a simple web page (`Web/src/index.html`) to initiate the automation process.
2.  **Backend:** An Express.js server (`Web/api-server/server.js`) receives the request from the frontend.
3.  **Automation:** The backend uses Playwright to launch a browser and navigate to the target URL. It scrapes the page for input fields and buttons.
4.  **AI-Powered Decision Making:** The scraped data is sent to a generative AI model (Gemini or a local Ollama instance) to determine how to fill out the form and which buttons to click.
5.  **n8n Workflow:** A Dockerized n8n instance is included, likely to orchestrate more complex automation workflows, potentially triggered by webhooks from the main application.
6.  **User Data:** User information is fetched from a mock JSON server.

## Building and Running

**1. Backend:**

To run the backend server, navigate to the `Web/api-server` directory and run:

```bash
npm install
node server.js
```

**2. Frontend:**

Open the `Web/src/index.html` file in your web browser.

**3. n8n:**

To run the n8n workflow, navigate to the `n8n-docker` directory and run:

```bash
docker-compose up -d
```

## Development Conventions

*   The backend uses CommonJS modules (`require`).
*   The code is not formatted with a consistent style.
*   There are no tests.
*   The project uses a `.env` file for environment variables, which should include the `GEMINI_API_KEY`.
