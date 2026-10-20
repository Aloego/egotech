# AI Rules

## Tech Stack

- **Runtime:** Node.js (server-side JavaScript)
- **Web Framework:** Express.js for HTTP server and routing
- **Templating:** Static HTML files served directly (no template engine)
- **Package Manager:** pnpm
- **Development:** nodemon for hot-reloading during development
- **HTTP Client:** node-fetch for outbound API requests
- **CORS:** cors middleware for cross-origin resource sharing
- **Deployment:** Static hosting with Node.js server (e.g., Render, Heroku, or similar)

## Rules

### Package Management
- Use `pnpm` as the package manager (never `npm` or `yarn`)
- Add new dependencies with `pnpm add <package>`
- Add dev dependencies with `pnpm add -D <package>`

### Scripts
- `start` — runs the production server (`node server.js`)
- `dev` — runs the development server with hot reload (`nodemon server.js`)

### Server Code
- All server-side source code goes in the root directory (e.g., `server.js`)
- Keep `server.js` as the single entry point for the Express application
- Use Express middleware for routing, CORS, and request handling
- Use `node-fetch` for any outbound HTTP requests to external APIs

### Static Assets
- Static HTML files are served from the project root
- Do not move HTML files into a `src/` or `public/` directory unless restructuring the project
- Keep CSS and client-side JavaScript inline in HTML files or in separate `.css`/`.js` files at the root level

### Dependencies
- Only add dependencies that are actually used
- Prefer lightweight, well-maintained packages
- Do not add unnecessary abstraction layers or utility libraries
