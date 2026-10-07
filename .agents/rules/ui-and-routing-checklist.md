# Kalki BOS: UI & Routing Safety Rules

**CRITICAL RULE:** Always review and apply these checks when creating or modifying pages and routes in the Kalki BOS repository. These rules were compiled from previous recurring mistakes to ensure a high-quality, bug-free standard.

## 1. Location & Context Preservation
- **Never drop the scope query params.** Almost all routes require the user's `organizationId` and `locationId` to identify their current scope. 
- When adding internal links (e.g., `<Link href="...">`), always dynamically attach the active `organizationId` and `locationId` query parameters if `selected` scope exists. 
- *Mistake avoided:* If you link to a page like `/me/settings` without the query params, the user's location selection resets and the UI defaults to "Select Location...", causing annoying friction.

## 2. Global AppShell Layout
- **New Root Routes require layout.** If you create a new top-level directory in `src/app` (e.g., `src/app/new-module`), you MUST create a `layout.tsx` that wraps the content in `<AppShell>`.
- *Mistake avoided:* Pages built without `<AppShell>` lose the sidebar, top navigation bar, and main container styles, resulting in a broken, full-screen unstyled page.

## 3. Strict Standard UI (No Custom CSS)
- **Do not invent custom CSS or layout patterns.** You must adhere strictly to the existing Kalki design system found in `src/app/globals.css`.
- Use established wrappers like `<div className="kalki-main-content">`, `<div className="kalki-form-layout">`, and standard components like `<KalkiPageHeader>`, `<KalkiSection>`, and `<KalkiButton>`.
- **Do not use Tailwind classes unless explicitly enabled.** Kalki is built using vanilla CSS classes (`kalki-*`). Tailwind classes will be ignored and result in unstyled HTML. 
- *Mistake avoided:* Writing custom inline `<style>` blocks for "premium glassmorphism" completely breaks the unified, long-term software aesthetic.
