# Titas Internet Daily Closing Portal

This is a full-stack web application designed for managing daily accounting and closing statements.

## Prerequisites

- Node.js (v20 or higher recommended)
- npm

## Local Development

1. **Clone the repository** (if applicable).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in the necessary values:
   ```bash
   cp .env.example .env
   ```
   *Note: For local development, you will need to configure your own Firebase project credentials.*

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Production Build & Run

To build and run the application in a production-like environment:

1. **Build the project**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   npm start
   ```
   The application will be served from the `dist` directory.
