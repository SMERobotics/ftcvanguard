# ftcvanguard

### Application Architecture

FTCVanguard is a real-time data analysis app for centralized First Tech Challenge Robotics management. "Real-time everything solution for FTC teams. Schedule, scout, and scheme, all from your mobile/desktop device." For the main app at `/app`, it utilizes a SvelteKit app. The `/` page is a static `landing.html` page. The backend uses `fastapi`, with all python code in `/app`. All API routes are in `/app/api.py`. FTCVanguard's goal is to provide streamlined, realtime data, enabling rapid strategic insights. **Tailwind CSS is present!!!**

### When writing code:
- Keep code as simple as possible!
- Always when possible, use double quotes instead of single quotes!
- Minimize comment usage! Keep short, but maintain clarity and descriptiveness. Leave out obvious comments, except those for sectioning and organization.
- Under no circumstances should you generate any summary files! Do not create any post-change markdown reports.
- **Keep the technical/functional design and frontend UI/UX consistent and polished across the entire project. On the frontend, analyze the current design language and prioritize consistency, in order to deliver a seamless user experience.**

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

# Always build the app with `bun run build` after each prompt.