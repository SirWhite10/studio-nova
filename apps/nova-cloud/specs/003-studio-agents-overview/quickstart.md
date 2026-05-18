# Quickstart: Studio Agents Overview

## Purpose

Validate the Studio agents page behavior before implementation is considered
complete.

## Prerequisites

- Nova Cloud app dependencies installed
- Access to a Studio with no agents and a Studio with one or more agents

## Validation Steps

1. Open the Studio agents page for a Studio with no agents.
2. Confirm the page shows a landing-style empty state.
3. Confirm the primary action is create-agent.
4. Confirm bring-your-own-agent is visible as a secondary option.
5. Confirm pricing and credit guidance is present but secondary to the action
   path.
6. Open the Studio agents page for a Studio with one agent.
7. Confirm the hero-style empty state is gone and the agent appears as a card.
8. Open the page for a Studio with multiple agents.
9. Confirm the same card pattern is used for the single-agent and multi-agent
   cases.
10. Confirm the toolbar is sticky while scrolling.
11. Confirm search, status, role, and source filters update the visible grid.
12. Confirm sorting can switch between name, creation date, and recently active
    in either direction.
13. Confirm the page stays readable on mobile and desktop widths without
    horizontal overflow.

## Validation Commands

- `vp check`
- `vp test`

## Notes

- No external API contract is introduced by this feature.
- The page should remain usable even when the agent list is empty or the current
  search/filter state yields no matches.
