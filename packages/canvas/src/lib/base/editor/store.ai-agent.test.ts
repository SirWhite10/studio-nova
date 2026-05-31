import { describe, expect, it } from "@voidzero-dev/vite-plus-test";
import { get } from "svelte/store";
import type { CanvasNode } from "$lib/base/canvas/types.js";
import { createEditorStore } from "./store.js";

function node(type: string, id: string, props: Record<string, unknown> = {}): CanvasNode {
  return { id, type, props };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

export function verifyAiAgentPageConstruction() {
  const store = createEditorStore();

  store.insertComponent(
    node("Hero.1", "hero", {
      eyebrowText: "AI-built page",
      titleText: "Programmatic Canvas construction",
      descriptionText: "Created entirely via the editor store API.",
    }),
  );
  store.insertComponent(node("Text", "intro", { text: "Feature highlights" }));
  store.insertComponent(node("View", "card-grid", { class: "grid gap-4 md:grid-cols-3" }));

  for (let index = 0; index < 3; index += 1) {
    store.insertComponent(
      node("Card.Root", `card-${index + 1}`, { variant: "default", size: "default" }),
      ["2"],
    );
    store.insertComponent(node("Card.Header", `card-${index + 1}-header`), [
      "2",
      `${index}`,
      "slot:header",
    ]);
    store.insertComponent(
      node("Card.Title", `card-${index + 1}-title`, { text: `Card ${index + 1}` }),
      ["2", `${index}`, "slot:header", "0"],
    );
    store.insertComponent(
      node("Card.Content", `card-${index + 1}-content`, { text: `Generated card ${index + 1}` }),
      ["2", `${index}`, "slot:content"],
    );
  }

  store.updateComponentProperty(["0"], "titleText", "Edited programmatically");

  const { components } = get(store);
  assertEqual(components.length, 3, "programmatic page should include three top-level nodes");
  assertEqual(
    components[0].props?.titleText,
    "Edited programmatically",
    "store update should edit hero title",
  );
  assertEqual(components[2].children?.length, 3, "card grid should contain three generated cards");
  assertEqual(
    components[2].children?.[0].slots?.header.children[0].children?.[0].props?.text,
    "Card 1",
    "nested slot content should be inserted through store paths",
  );

  return components;
}

export function verifyAiAgentSerializationRoundtrip() {
  const initialComponents: CanvasNode[] = [
    node("Hero.1", "hero", { titleText: "Roundtrip source" }),
    {
      ...node("View", "card-grid", { class: "grid" }),
      children: [
        {
          ...node("Card.Root", "card-1"),
          slots: {
            header: {
              children: [
                {
                  ...node("Card.Header", "card-1-header"),
                  children: [node("Card.Title", "card-1-title", { text: "Original" })],
                },
              ],
            },
          },
        },
      ],
    },
  ];

  const serialized = JSON.stringify(initialComponents);
  const parsed = JSON.parse(serialized) as CanvasNode[];
  assertEqual(parsed, initialComponents, "plain CanvasNode JSON should survive parse/stringify");

  const store = createEditorStore();
  store.setComponents(parsed);
  assertEqual(
    get(store).components,
    initialComponents,
    "store hydration should preserve CanvasNode tree",
  );

  store.updateComponentProperty(["1", "0", "slot:header", "0", "0"], "text", "Edited");
  const editedComponents = JSON.parse(JSON.stringify(get(store).components)) as CanvasNode[];
  assertEqual(
    editedComponents[1].children?.[0].slots?.header.children[0].children?.[0].props?.text,
    "Edited",
    "edited component tree should serialize with updated nested property",
  );

  return editedComponents;
}

export function verifyAiAgentStoreApi() {
  const constructed = verifyAiAgentPageConstruction();
  const roundtripped = verifyAiAgentSerializationRoundtrip();
  assert(
    constructed.length > 0 && roundtripped.length > 0,
    "AI agent store verification should produce components",
  );
  return { constructed, roundtripped };
}

describe("AI agent editor store integration", () => {
  it("constructs a complete page through store calls only", () => {
    const components = verifyAiAgentPageConstruction();

    expect(components).toHaveLength(3);
    expect(components[0].props?.titleText).toBe("Edited programmatically");
    expect(components[2].children).toHaveLength(3);
    expect(components[2].children?.[0].slots?.header.children[0].children?.[0].props?.text).toBe(
      "Card 1",
    );
  });

  it("roundtrips CanvasNode JSON through store hydration and edit serialization", () => {
    const components = verifyAiAgentSerializationRoundtrip();

    expect(components[1].children?.[0].slots?.header.children[0].children?.[0].props?.text).toBe(
      "Edited",
    );
  });
});
