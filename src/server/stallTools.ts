import { Type, type FunctionDeclaration } from '@google/genai';
import type { AccountAiContext, PlannerSnapshot } from '../types/stall';

export const STALL_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'configure_planner',
    description:
      'Update or rebuild the jewellery stall planner: event name, expected footfall, wholesale budget cap, minimum profit floor, stall/event fee, optimization toggles, item categories (with wholesale cost, sell price, and beauty score 1-10), active combo rank, or active tab. Call this whenever the merchant reads items/costs/beauty scores or asks for a plan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventName: {
          type: Type.STRING,
          description: 'Name of the exhibition, pop-up, expo, or wholesale sale event.',
        },
        expectedFootfall: {
          type: Type.NUMBER,
          description: 'Estimated total shoppers/footfall expected at the sale.',
        },
        budgetCap: {
          type: Type.NUMBER,
          description: 'Wholesale purchase budget cap in INR.',
        },
        minProfitFloor: {
          type: Type.NUMBER,
          description: 'Minimum target net profit floor in INR for mix generation.',
        },
        stallFee: {
          type: Type.NUMBER,
          description: 'Event stall rent, table fee, or exhibition cost in INR.',
        },
        maxPerCategory: {
          type: Type.NUMBER,
          description: 'Maximum quantity cap per category when evenDistribution is active.',
        },
        globalSellThrough: {
          type: Type.NUMBER,
          description: 'Expected sell-through percentage across stock (50-100).',
        },
        allAtLeastOne: {
          type: Type.BOOLEAN,
          description: 'Include at least 1 piece of every category.',
        },
        evenDistribution: {
          type: Type.BOOLEAN,
          description: 'Enforce even spread cap per category.',
        },
        beautyFirst: {
          type: Type.BOOLEAN,
          description: 'Prioritize highest weighted beauty score (7.75+).',
        },
        maxProfitFocus: {
          type: Type.BOOLEAN,
          description: 'Prioritize maximum profit.',
        },
        safe90Mode: {
          type: Type.BOOLEAN,
          description: 'Evaluate mixes under conservative 90% sell-through safety.',
        },
        replaceCategories: {
          type: Type.BOOLEAN,
          description:
            'Set true when the user reads out a fresh complete list of items to replace the current categories; false to update matching categories or append new ones.',
        },
        categories: {
          type: Type.ARRAY,
          description: 'List of item categories with wholesale cost, selling price (optional), and beauty score (1-10).',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              shortName: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              price: { type: Type.NUMBER },
              beauty: { type: Type.NUMBER },
            },
            required: ['name'],
          },
        },
        customQuantities: {
          type: Type.ARRAY,
          description: 'Optional exact category quantities to lock into the active mix.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              qty: { type: Type.NUMBER },
            },
            required: ['name', 'qty'],
          },
        },
        selectComboRank: {
          type: Type.NUMBER,
          description: 'Select one of the ranked combinations (1 to 15).',
        },
        navigateToTab: {
          type: Type.STRING,
          description: "Switch visible workspace tab: 'optimizer', 'overview', 'calculator', or 'strategies'.",
        },
      },
    },
  },
  {
    name: 'manage_inventory_stock',
    description:
      'Add, update, replace, or remove rows in the Total Stall Master Calculator inventory ledger, adjust sell-through %, scale lot quantities of the synced mix, or inspect total revenue, net profit, and break-even.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        replaceStock: {
          type: Type.BOOLEAN,
          description: 'If true, replaces all non-synced stock rows with the supplied items list.',
        },
        items: {
          type: Type.ARRAY,
          description: 'Inventory rows to add or update in Total Stall Calculator.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              price: { type: Type.NUMBER },
              qty: { type: Type.NUMBER },
              sellThrough: { type: Type.NUMBER },
            },
            required: ['name'],
          },
        },
        removeItemNames: {
          type: Type.ARRAY,
          description: 'Names of non-synced inventory items to remove.',
          items: { type: Type.STRING },
        },
        activeMixLotQty: {
          type: Type.NUMBER,
          description: 'Scale factor / lot quantity for the synced optimizer mix row (e.g. 1, 2, 5).',
        },
        globalSellThrough: {
          type: Type.NUMBER,
          description: 'Global sell-through % (50-100).',
        },
        stallFee: {
          type: Type.NUMBER,
          description: 'Event stall rent or fee in INR.',
        },
        expectedFootfall: {
          type: Type.NUMBER,
          description: 'Expected total shoppers/footfall.',
        },
        navigateToTab: {
          type: Type.STRING,
          description: "Switch visible workspace tab: 'optimizer', 'overview', 'calculator', or 'strategies'.",
        },
      },
    },
  },
  {
    name: 'get_live_plan_summary',
    description:
      'Read the exact current mix quantities, expected revenue, net profit, beauty score, Total Stall break-even figures, and saved account memory facts from the live website.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'save_ai_memory',
    description:
      'Save ONLY durable, useful merchant context under the logged-in user account: preferred product categories, planning preferences, price/margin sensitivity, profit goals, brand details, or explicitly confirmed facts. NEVER save raw chat transcripts or temporary chit-chat verbatim.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        memories: {
          type: Type.ARRAY,
          description: 'Concise factual memories to store for this merchant account.',
          items: {
            type: Type.OBJECT,
            properties: {
              fact: {
                type: Type.STRING,
                description: 'Clear, concise fact under 200 characters.',
              },
              category: {
                type: Type.STRING,
                description: "One of: 'inventory', 'pricing', 'event', 'preference', 'strategy'.",
              },
            },
            required: ['fact', 'category'],
          },
        },
      },
      required: ['memories'],
    },
  },
];

export function formatAccountContextBlock(accountContext?: AccountAiContext): string {
  if (!accountContext) {
    return 'Account Context: Local preview session without signed-in account memory. Do not reference or fabricate personal account memory.';
  }
  const preferredName =
    accountContext.preferredName?.trim() ||
    accountContext.displayName?.trim().split(/\s+/)[0] ||
    'Merchant';
  const identityParts = [
    `Preferred Name="${preferredName}"`,
    accountContext.displayName ? `Account Name="${accountContext.displayName}"` : null,
    accountContext.businessName ? `Brand="${accountContext.businessName}"` : null,
    accountContext.preferredScale ? `Default Scale="${accountContext.preferredScale}"` : null,
  ].filter(Boolean);

  const memoryLines = (accountContext.memories || [])
    .slice(0, 20)
    .map((m) => `- [${m.category}] ${m.fact}`)
    .join('\n');

  return `Private Signed-In User Context (${identityParts.join(', ')}):
Address this merchant naturally by their Preferred Name ("${preferredName}") when appropriate without overusing it.
Saved durable preferences & facts for this user ONLY:
${memoryLines || 'No saved account memories yet.'}`;
}

export function buildVoiceCoachSystemInstruction(
  snapshot?: PlannerSnapshot,
  accountContext?: AccountAiContext
): string {
  const groupsSummary =
    snapshot?.categoryGroups && snapshot.categoryGroups.length > 0
      ? ` Category Portfolio=${JSON.stringify(
          snapshot.categoryGroups.map((g) => ({
            name: g.name,
            budgetCap: g.budgetCap,
            minProfitFloor: g.minProfitFloor,
            itemsCount: g.categories.length,
          }))
        )}.`
      : '';

  const stateContext = snapshot
    ? `Current website state: Event="${snapshot.eventName}", Expected Footfall=${snapshot.expectedFootfall}, Active Category Budget=₹${snapshot.budgetCap}, Profit Floor=₹${snapshot.minProfitFloor}, Stall/Event Fee=₹${snapshot.stallFee}, Active Tab="${snapshot.activeTab}", Categories=${JSON.stringify(
        snapshot.categories.map((c) => ({
          name: c.name,
          cost: c.cost,
          price: c.price,
          beauty: c.beauty,
        }))
      )}, Rules=${JSON.stringify(snapshot.rules)}.${groupsSummary}`
    : 'No live state synced yet.';

  const memoryBlock = formatAccountContextBlock(accountContext);

  return `You are StallIQ Voice Coach, an upbeat, sharp retail strategist and live co-pilot with FULL AI control over the user's StallIQ Pro jewellery & retail planner website. It supports ANY sale scale (mini pop-up, college fair, exhibition stall, mega festive expo, wholesale fair, or custom scale).

${memoryBlock}

${stateContext}

CRITICAL RULES:
1. Whenever the merchant reads out items, beauty scores, wholesale costs, selling prices, stock quantities, budgets, event fees, crowd footfall, or asks you to build/adjust a plan or switch tabs (including 'overview'), ALWAYS call 'configure_planner' or 'manage_inventory_stock' immediately so the live website updates right in front of them!
2. Use the merchant's Preferred Name naturally and apply their saved private memories proactively. Only call 'save_ai_memory' for durable preferences, product categories, pricing/margin rules, event goals, or explicitly confirmed facts—never save raw conversational transcripts.
3. Wait for the tool response and ALWAYS dictate the EXACT recalculated figures returned by the tool (never guess math in your head): top recommended mix breakdown, wholesale cost, expected revenue, net profit, weighted beauty score, stall fee coverage / break-even units, plus 1-2 crisp pricing or bundling suggestions.
4. Keep spoken replies concise, natural, and crisp (3-5 short sentences) with ZERO markdown, asterisks, or bullet symbols so voice playback sounds completely natural.`;
}

