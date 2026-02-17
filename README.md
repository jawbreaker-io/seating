# Office Seating Chart

A drag-and-drop office seating chart application built with React, TypeScript, and Vite. Create floor plans with zones, assign employees to desks, and share or export arrangements.

## Features

- Drag-and-drop employee assignment to desks
- Customizable zones with configurable rows, columns, and colors
- Pin employees to desks, mark desks as unavailable
- Department management with color coding and safe deletion (people are preserved)
- Share arrangements via URL or export as JSON/PDF
- Automatic seating optimization

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

The app is served at `http://localhost:8080`.

## Default Layout Configuration

You can pre-configure the seating layout that new visitors see by mounting a JSON file exported from the app.

### 1. Export a layout

Open the app in your browser, configure your zones, employees, and seating assignments, then click **Export JSON** in the header menu. This saves a `seating-arrangement.json` file.

### 2. Mount the file in docker-compose

Rename (or copy) the exported file to `default-layout.json` and place it alongside `docker-compose.yml`, then uncomment the `volumes` section:

```yaml
services:
  seating-app:
    build:
      context: .
      dockerfile: Dockerfile
    image: seating-app:latest
    ports:
      - "8080:8080"
    volumes:
      - ./default-layout.json:/usr/share/nginx/html/default-layout.json:ro
    restart: unless-stopped
```

### 3. Restart the container

```bash
docker compose up -d
```

New visitors (with no saved browser data) will automatically see the exported layout. Users who have already customized their arrangement in the browser are not affected — their localStorage data takes precedence.

## Department Management

A built-in **Unknown** department is always present in the system. It serves as the default department for people who are not assigned elsewhere.

- The Unknown department is created automatically when the application starts with no saved data.
- It **cannot be deleted or renamed**.
- When any other department is deleted, its people are **moved to the Unknown department** rather than being removed from the system.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** for bundling
- **Tailwind CSS** for styling
- **Motion** (Framer Motion) for animations
- **jsPDF** for PDF export
- **Vitest** + **React Testing Library** for tests
- **Nginx** for production serving (Docker)
