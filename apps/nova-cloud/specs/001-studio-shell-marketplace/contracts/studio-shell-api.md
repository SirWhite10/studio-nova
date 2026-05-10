# Studio Shell API Contract

This feature extends the authenticated app shell with new or expanded server
contracts. Field names below are descriptive and may be mapped to existing
record shapes during implementation, but the response semantics should remain
stable.

## 1. Sidebar State

### `GET /api/app/sidebar-state?studioId={studioId}`

- **Purpose**: Return the resolved shell state for the selected Studio.
- **Auth**: Required
- **Response**:

```json
{
  "user": {
    "name": "Nova User",
    "email": "user@example.com",
    "avatar": "/avatars/user.png"
  },
  "studios": [
    {
      "id": "studio_123",
      "name": "Acme Studio",
      "url": "/app/studios/studio_123"
    }
  ],
  "currentStudio": {
    "id": "studio_123",
    "name": "Acme Studio"
  },
  "navigation": {
    "sectionOrder": ["agent", "workspace-sandbox", "integrations", "content"],
    "sections": [
      {
        "id": "agent",
        "title": "Agent",
        "reorderable": true,
        "items": [
          {
            "id": "chat",
            "title": "Chat",
            "href": "/app/studios/studio_123/chat",
            "reorderable": true
          }
        ]
      }
    ]
  },
  "search": {
    "enabled": true,
    "placeholder": "Search Nova"
  }
}
```

### Contract rules

- `navigation` is resolved server-side from Studio preferences plus current
  Studio capabilities.
- Missing or invalid saved ordering is normalized before it is returned.
- `user` must use live authenticated data, not placeholder sample values.

## 2. Save Sidebar Order

### `PATCH /api/studios/{studioId}/navigation`

- **Purpose**: Save Studio-specific navigation ordering.
- **Auth**: Required
- **Request**:

```json
{
  "sectionOrder": ["agent", "content", "workspace-sandbox", "integrations"],
  "sectionConfigs": {
    "agent": {
      "itemOrder": ["chat", "skills", "agents", "memory", "jobs"]
    },
    "content": {
      "itemOrder": ["files"]
    }
  }
}
```

- **Response**:

```json
{
  "studioId": "studio_123",
  "navigationProfile": {
    "sectionOrder": ["agent", "content", "workspace-sandbox", "integrations"]
  },
  "savedAt": 1746806400000
}
```

### Contract rules

- Only recognized sections and items are accepted.
- Invalid or unavailable items are ignored and replaced by normalized defaults.
- Saving navigation emits a Studio update event so the live shell can refresh.

## 3. Save Studio Settings

### `PATCH /api/studios/{studioId}`

- **Purpose**: Save Studio identity and appearance settings.
- **Auth**: Required
- **Request additions for this feature**:

```json
{
  "name": "Acme Studio",
  "description": "Client delivery workspace",
  "themeHue": 32,
  "appearanceSettings": {
    "accentScale": "gold",
    "surfaceMode": "obsidian",
    "brandContrast": "high"
  }
}
```

### Contract rules

- Studio appearance settings are saved atomically with Studio settings changes
  when provided together.
- Validation failures must return actionable errors instead of silently dropping
  unsupported values.

## 4. Global Search

### `GET /api/app/search?q={query}&studioId={studioId?}`

- **Purpose**: Return unified app-shell search results.
- **Auth**: Required
- **Response**:

```json
{
  "query": "stripe",
  "results": [
    {
      "id": "integration_stripe",
      "type": "integration",
      "title": "Stripe",
      "subtitle": "Installed integration",
      "href": "/app/studios/studio_123/integrations/stripe",
      "section": "Integrations",
      "studioId": "studio_123"
    }
  ]
}
```

### Contract rules

- Results are limited to resources visible to the current user.
- The selected Studio context biases ranking but does not prevent broader
  app-level results when appropriate.
- Empty queries return no ranked results.

## 5. Marketplace Entry

### `GET /app/studios/{studioId}/marketplace`

- **Purpose**: Present the initial Studio-aware marketplace surface.
- **Auth**: Required

### Contract rules

- The Integrations header add action must route here or open an equivalent
  Studio-aware marketplace surface.
- The initial page must distinguish installed items from available items.

## 6. Event Refresh Expectations

The shell must refresh after these categories of updates:

- Studio settings changes
- navigation profile changes
- integration enablement or configuration changes
- workspace/deployment changes that alter visible shell capabilities
- content/storage changes when they affect content summaries
