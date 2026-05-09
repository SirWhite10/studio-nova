export type PricingItem = {
  key: string;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  details: string[];
  href?: string;
  badge?: string;
};

export type CreditPack = {
  key: string;
  price: string;
  credits: number;
  effective: string;
  label: string;
};

export const workspacePricing: PricingItem[] = [
  {
    key: "basic-workspace",
    name: "Basic Workspace",
    price: "$5",
    cadence: "per month",
    summary:
      "A hosted public site or app shell with SSL, a Nova subdomain, and generous baseline capacity.",
    details: [
      "Hosted workspace surface",
      "Generated Nova subdomain",
      "SSL included",
      "Good fit for sites, stores, blogs, creator hubs, and simple apps",
    ],
    href: "/pricing/workspaces",
  },
  {
    key: "pro-workspace",
    name: "Pro Workspace",
    price: "$10",
    cadence: "per month",
    summary:
      "A higher-capacity workspace for custom domains, app routes, scheduled jobs, and more involved products.",
    details: [
      "Everything in Basic Workspace",
      "Custom domain support",
      "Higher traffic and storage caps",
      "Better fit for business apps and public products",
    ],
    href: "/pricing/workspaces",
    badge: "Custom domains",
  },
];

export const addonPricing: PricingItem[] = [
  {
    key: "cms",
    name: "CMS Add-on",
    price: "$10",
    cadence: "per workspace/month",
    summary:
      "Pages, posts, media, content collections, and structured editing without per-read or per-write pricing.",
    details: [
      "Pages and posts",
      "Media library",
      "Structured content collections",
      "High content caps for normal sites",
    ],
    href: "/pricing/add-ons",
  },
  {
    key: "commerce",
    name: "Commerce Add-on",
    price: "$20",
    cadence: "per workspace/month",
    summary: "Products, inventory, cart, checkout connection, orders, customers, and discounts.",
    details: [
      "Product catalog and variants",
      "Inventory control",
      "Orders and customer records",
      "Checkout provider connection",
    ],
    href: "/pricing/add-ons",
    badge: "Store builder",
  },
  {
    key: "automation",
    name: "Automation Add-on",
    price: "$10",
    cadence: "per workspace/month",
    summary: "Scheduled workflows, webhooks, recurring jobs, and business automations.",
    details: [
      "Scheduled workflows",
      "Webhook triggers",
      "Recurring jobs",
      "Useful for content, commerce, and operations",
    ],
    href: "/pricing/add-ons",
  },
];

export const aiSubscriptionPricing: PricingItem[] = [
  {
    key: "nova-ai-lite",
    name: "Nova AI Lite",
    price: "$5",
    cadence: "per month",
    summary: "A small monthly credit pack for occasional hosted Nova AI use.",
    details: [
      "10 monthly credits",
      "Monthly credits reset each billing cycle",
      "BYOK remains available",
    ],
    href: "/pricing/ai-credits",
  },
  {
    key: "nova-ai-builder",
    name: "Nova AI Builder",
    price: "$15",
    cadence: "per month",
    summary: "A practical credit pack for regular app, content, and business building sessions.",
    details: [
      "40 monthly credits",
      "Good fit for active builders",
      "Top-ups available when needed",
    ],
    href: "/pricing/ai-credits",
    badge: "Recommended",
  },
  {
    key: "nova-ai-pro",
    name: "Nova AI Pro",
    price: "$30",
    cadence: "per month",
    summary: "More monthly hosted model capacity for frequent Nova AI use.",
    details: [
      "100 monthly credits",
      "Best for heavy hosted AI usage",
      "Still supports BYOK and external harnesses",
    ],
    href: "/pricing/ai-credits",
  },
];

export const creditPacks: CreditPack[] = [
  {
    key: "topup-10",
    price: "$10",
    credits: 20,
    effective: "$0.50/credit",
    label: "Starter top-up",
  },
  {
    key: "topup-25",
    price: "$25",
    credits: 60,
    effective: "$0.42/credit",
    label: "Builder top-up",
  },
  {
    key: "topup-50",
    price: "$50",
    credits: 140,
    effective: "$0.36/credit",
    label: "Growth top-up",
  },
  {
    key: "topup-100",
    price: "$100",
    credits: 320,
    effective: "$0.31/credit",
    label: "Scale top-up",
  },
];

export const aiModelCreditCosts = [
  {
    name: "Economy and fast models",
    cost: "1 credit",
    detail: "Quick writing, edits, summaries, and lighter app help.",
  },
  {
    name: "Standard coding models",
    cost: "2 credits",
    detail: "Most coding, debugging, planning, and implementation work.",
  },
  {
    name: "Premium reasoning models",
    cost: "5 credits",
    detail: "Harder architecture, multi-step reasoning, and deeper agent runs.",
  },
];

export const pricingExamples = [
  {
    name: "Simple hosted site",
    components: ["Basic Workspace"],
    total: "$5/mo",
    note: "A clean public website, launch page, or single-purpose app.",
  },
  {
    name: "Blog or news site",
    components: ["Basic Workspace", "CMS Add-on"],
    total: "$15/mo",
    note: "Publishing workflow without per-object database pricing.",
  },
  {
    name: "Ecommerce store",
    components: ["Basic Workspace", "Commerce Add-on"],
    total: "$25/mo",
    note: "Products, inventory, cart, orders, and checkout provider connection.",
  },
  {
    name: "Ecommerce store with content",
    components: ["Basic Workspace", "CMS Add-on", "Commerce Add-on"],
    total: "$35/mo",
    note: "Storefront plus lookbooks, guides, landing pages, and updates.",
  },
  {
    name: "Automated business portal",
    components: ["Pro Workspace", "CMS Add-on", "Automation Add-on"],
    total: "$30/mo",
    note: "Content plus recurring jobs, webhooks, and business workflows.",
  },
  {
    name: "Full business site",
    components: ["Pro Workspace", "CMS Add-on", "Commerce Add-on", "Automation Add-on"],
    total: "$50/mo",
    note: "A complete modular business surface with commerce and operations.",
  },
  {
    name: "Custom app under development",
    components: ["Pro Workspace", "Optional Sandbox Runtime", "Optional Nova AI credits"],
    total: "$10/mo + usage",
    note: "Workspace hosting is separate from build/runtime work.",
  },
];

export const routeLinks = [
  { href: "/pricing", label: "Overview" },
  { href: "/pricing/workspaces", label: "Workspaces" },
  { href: "/pricing/add-ons", label: "Add-ons" },
  { href: "/pricing/ai-credits", label: "AI credits" },
  { href: "/pricing/sandbox", label: "Sandbox" },
  { href: "/pricing/examples", label: "Examples" },
];
