# Quickstart: Studio Shell Marketplace Overhaul

## Prerequisites

1. Run `vp install`
2. Start the app with `vp dev`
3. Sign in with a user that can access at least one Studio

## Validation Flow

### 1. Shell and layout

1. Open `/app/studios/{studioId}`
2. Confirm the Studio shell shows grouped sections for Agent, Workspace &
   Sandbox, Integrations, and Content
3. Collapse the sidebar and confirm icon-capable navigation remains usable
4. Scroll long pages and confirm the top bar stays visible
5. Confirm there is no page-level horizontal overflow on desktop or mobile

### 2. Navigation persistence

1. Reorder at least two sidebar sections
2. Reorder at least one supported child item
3. Refresh the page
4. Sign out and sign back in
5. Confirm the selected Studio restores the saved navigation order

### 3. Content and integrations

1. Open the Content section and navigate to Files
2. Confirm the Files experience still works and shows the included `2 GB` free
   storage allowance
3. Open the Integrations section
4. Use the `+` action to enter the marketplace surface

### 4. Settings and theming

1. Open Studio Settings
2. Change a Studio setting and an appearance setting
3. Save changes and confirm they persist
4. Make another unsaved change and cancel it
5. Confirm only the saved change remains

### 5. Search and account footer

1. Open the shell search entry below the logo
2. Search for a known Studio destination or capability
3. Navigate to a returned result
4. Open the sidebar footer menu and confirm it shows live account data

## Suggested Verification Commands

1. Run `vp check`
2. Run `vp test`
3. Run any targeted shell or Studio route tests added for this feature
