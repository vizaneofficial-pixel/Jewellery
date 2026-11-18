import type { BangleCategory, PlaybookCard, StallStockItem, VideoGuide, ZoneId } from '../types/stall';

export const INITIAL_CATEGORIES: BangleCategory[] = [
  {
    id: 'white',
    name: 'White (Resin)',
    shortName: 'White',
    cost: 280,
    price: 499,
    beauty: 9.5,
    barColor: '#f8fafc',
    textClass: 'text-slate-100',
    bgClass: 'bg-slate-800/80 border-slate-600/70',
  },
  {
    id: 'colours',
    name: 'Colours (Resin)',
    shortName: 'Colours',
    cost: 210,
    price: 449,
    beauty: 9.0,
    barColor: '#ec4899',
    textClass: 'text-pink-300',
    bgClass: 'bg-pink-500/12 border-pink-500/35',
  },
  {
    id: 'yellow',
    name: 'Yellow (Resin)',
    shortName: 'Yellow',
    cost: 180,
    price: 399,
    beauty: 8.2,
    barColor: '#eab308',
    textClass: 'text-amber-300',
    bgClass: 'bg-amber-500/12 border-amber-500/35',
  },
  {
    id: 'cuff',
    name: 'Cuff',
    shortName: 'Cuff',
    cost: 150,
    price: 349,
    beauty: 7.8,
    barColor: '#8b5cf6',
    textClass: 'text-violet-300',
    bgClass: 'bg-violet-500/12 border-violet-500/35',
  },
  {
    id: 'silver_gold',
    name: 'Silver Gold (Basic)',
    shortName: 'Silver Gold',
    cost: 120,
    price: 299,
    beauty: 5.5,
    barColor: '#94a3b8',
    textClass: 'text-slate-300',
    bgClass: 'bg-slate-500/12 border-slate-500/35',
  },
  {
    id: 'wooden',
    name: 'Wooden (Small)',
    shortName: 'Wooden',
    cost: 100,
    price: 249,
    beauty: 5.0,
    barColor: '#d97706',
    textClass: 'text-orange-300',
    bgClass: 'bg-orange-500/12 border-orange-500/35',
  },
];

export const EXTRA_CATEGORY_STYLES = [
  { barColor: '#06b6d4', textClass: 'text-cyan-300', bgClass: 'bg-cyan-500/12 border-cyan-500/35' },
  { barColor: '#10b981', textClass: 'text-emerald-300', bgClass: 'bg-emerald-500/12 border-emerald-500/35' },
  { barColor: '#3b82f6', textClass: 'text-blue-300', bgClass: 'bg-blue-500/12 border-blue-500/35' },
  { barColor: '#f43f5e', textClass: 'text-rose-300', bgClass: 'bg-rose-500/12 border-rose-500/35' },
  { barColor: '#a855f7', textClass: 'text-purple-300', bgClass: 'bg-purple-500/12 border-purple-500/35' },
  { barColor: '#14b8a6', textClass: 'text-teal-300', bgClass: 'bg-teal-500/12 border-teal-500/35' },
];

export const SALE_SCALE_PRESETS = [
  {
    id: 'mini_popup',
    label: 'Mini Pop-Up (₹1.5k)',
    eventName: 'Weekend Boutique Pop-Up',
    expectedFootfall: 1200,
    budgetCap: 1500,
    minProfitFloor: 1400,
    stallFee: 1500,
    maxPerCategory: 5,
  },
  {
    id: 'grand_casa',
    label: 'Exhibition Stall (₹3k)',
    eventName: 'Grand Casa, Siliguri',
    expectedFootfall: 10000,
    budgetCap: 3000,
    minProfitFloor: 3100,
    stallFee: 9000,
    maxPerCategory: 6,
  },
  {
    id: 'mega_expo',
    label: 'Mega Expo (₹15k)',
    eventName: 'City Festive Lifestyle Expo',
    expectedFootfall: 25000,
    budgetCap: 15000,
    minProfitFloor: 16000,
    stallFee: 22000,
    maxPerCategory: 20,
  },
  {
    id: 'wholesale_fair',
    label: 'Wholesale / Bulk (₹50k)',
    eventName: 'Regional Wholesale Trade Fair',
    expectedFootfall: 50000,
    budgetCap: 50000,
    minProfitFloor: 55000,
    stallFee: 40000,
    maxPerCategory: 50,
  },
];

export const INITIAL_STALL_STOCK: StallStockItem[] = [
  {
    id: 's_bangles',
    name: 'Selected Bangle Mix (17 pcs)',
    category: 'Bangles',
    cost: 2990,
    price: 6583,
    qty: 1,
    sellThrough: 90,
    isSyncedBundle: true,
    unitPieces: 17,
  },
  {
    id: 's_jhumka',
    name: 'Oxidized Jhumkas',
    category: 'Earrings',
    cost: 65,
    price: 199,
    qty: 25,
    sellThrough: 90,
    isSyncedBundle: false,
  },
  {
    id: 's_korean',
    name: 'Korean Studs & Hoops',
    category: 'Earrings',
    cost: 45,
    price: 149,
    qty: 30,
    sellThrough: 90,
    isSyncedBundle: false,
  },
  {
    id: 's_rings',
    name: 'Anti-Tarnish Rings',
    category: 'Rings',
    cost: 55,
    price: 179,
    qty: 25,
    sellThrough: 85,
    isSyncedBundle: false,
  },
  {
    id: 's_chains',
    name: 'Dainty Neck Chains',
    category: 'Necklaces',
    cost: 95,
    price: 299,
    qty: 15,
    sellThrough: 85,
    isSyncedBundle: false,
  },
  {
    id: 's_combos',
    name: 'Bangle + Ring Combo Boxes',
    category: 'Bundles',
    cost: 140,
    price: 349,
    qty: 10,
    sellThrough: 85,
    isSyncedBundle: false,
  },
];

export const PLAYBOOK_CARDS: PlaybookCard[] = [
  {
    id: 'p1',
    number: '01',
    title: 'The ₹50 Bargaining Cushion',
    desc: 'Tag Colours at ₹499 and White at ₹549, then offer a "₹50 Exhibition Special" to close immediately at ₹449 and ₹499 with 100% of planned margin intact.',
    metric: '+35% Close Rate',
    imageUrl: '/src/assets/images/display_velvet_cones_1795002552295.jpg',
    imageAlt: 'White and colourful resin bangles arranged on dark velvet cones under spotlight',
  },
  {
    id: 'p2',
    number: '02',
    title: 'Gloss + Matte ₹599 Stack Bundle',
    desc: 'Pair 1 glossy Colours Resin (₹210 cost / ₹449 sell) with 1 matte Wooden Stacker (₹100 cost / ₹249 sell) for ₹599. Combined cost is ₹310—pocketing +₹289 in one sale.',
    metric: '₹289 Net / Pair',
    imageUrl: '/src/assets/images/display_tiered_riser_1795002552402.jpg',
    imageAlt: 'Tiered wooden riser displaying curated jewellery boxes and layered chains',
  },
  {
    id: 'p3',
    number: '03',
    title: 'The Mirror Trap Placement',
    desc: 'Place an angled brass tabletop mirror on the right edge next to ₹349 Cuffs and ₹399 Yellow Festive bangles. Wrist try-ons lift conversion past 70%.',
    metric: '2.4x Try-On Lift',
    imageUrl: '/src/assets/images/display_mirror_station_1795002552364.jpg',
    imageAlt: 'Angled brass tabletop mirror beside hammered cuffs and yellow resin bangles',
  },
  {
    id: 'p4',
    number: '04',
    title: 'Final-4-Hour Bundle Clearance',
    desc: 'In the closing hours, switch signage to "Any Bangle + Any ₹179 Ring for ₹499". A ₹210 Colours + ₹55 Ring yields +₹234 cash with zero unsold stock.',
    metric: 'Zero Dead Stock',
    imageUrl: '/src/assets/images/display_impulse_tray_1795002552653.jpg',
    imageAlt: 'Sectioned walnut and velvet trays with rings, studs, and oxidized jhumkas',
  },
];

export const CURATED_VIDEOS: VideoGuide[] = [
  {
    id: 'v1',
    title: 'Jewellery Stall Display & Tiered Riser Aesthetics for Exhibitions',
    tag: 'Display Setup',
    duration: '6 min guide',
    keyTakeaway:
      'Use tiered velvet cones and wood risers at eye level so aisle walkers 6–8 feet away lock onto your White & Colours hero pieces first.',
    queryUrl: 'https://www.youtube.com/results?search_query=jewellery+exhibition+stall+display+ideas+india',
  },
  {
    id: 'v2',
    title: 'How to Price & Bundle Fashion Jewellery at Pop-Up Fairs',
    tag: 'Pricing Psychology',
    duration: '8 min strategy',
    keyTakeaway:
      'Anchor the top tray with ₹499 statement pieces and keep "Any 2 for ₹599" stackers at wrist height to lift average bill size.',
    queryUrl: 'https://www.youtube.com/results?search_query=how+to+price+jewellery+for+pop+up+stall+india',
  },
  {
    id: 'v3',
    title: 'Turning Exhibition Footfall into Instant Sales: Booth Scripts',
    tag: 'Crowd Conversion',
    duration: '5 min playbook',
    keyTakeaway:
      'Skip "Can I help you?" — hand browsers a mirror and suggest "Try stacking this matte wooden piece beside the glossy resin."',
    queryUrl: 'https://www.youtube.com/results?search_query=craft+fair+booth+setup+and+selling+tips+jewelry',
  },
];

export const STALL_ZONES: Record<
  ZoneId,
  {
    title: string;
    subtitle: string;
    items: string;
    why: string;
    imageUrl: string;
  }
> = {
  front_left: {
    title: 'Zone 1 · Front-Left Eye-Catcher (White & Colours Resin)',
    subtitle: 'Elevated velvet cones + warm spotlight right at aisle entry',
    items: '1–2 White Resin (₹499) + 4–6 Colours Resin (₹449)',
    why: 'Stops Grand Casa walkers from 8 feet away. High-beauty statement resin pieces act as an instant boutique magnet.',
    imageUrl: '/src/assets/images/display_velvet_cones_1795002552295.jpg',
  },
  center_tray: {
    title: 'Zone 2 · Center Impulse Tray (₹149–₹249 Studs, Rings & Wood)',
    subtitle: 'Open velvet organizer bowls at waist height for frictionless picking',
    items: 'Korean Studs (₹149), Anti-Tarnish Rings (₹179) & Wooden Bangles (₹249)',
    why: 'Drives rapid volume at 200%+ markups to clear your ₹9,000 Grand Casa stall rent early on Day 1.',
    imageUrl: '/src/assets/images/display_impulse_tray_1795002552653.jpg',
  },
  right_mirror: {
    title: 'Zone 3 · Right Try-On Mirror Station (Cuffs & Yellow Festive)',
    subtitle: 'Angled tabletop mirror + open wrist tray for instant slip-on testing',
    items: '4–6 Cuff Bangles (₹349) + 4–5 Yellow Resin (₹399)',
    why: '80% of right-handed shoppers pause here. Once a buyer sees a cuff on her wrist in the mirror, close rate jumps above 70%.',
    imageUrl: '/src/assets/images/display_mirror_station_1795002552364.jpg',
  },
  back_riser: {
    title: 'Zone 4 · Back Vertical Riser (Necklaces & ₹599 Stack Bundles)',
    subtitle: 'Eye-level vertical display stands + "Any Resin + Wood = ₹599" card',
    items: 'Dainty Neck Chains (₹299) + Bangle & Ring Combo Boxes (₹349)',
    why: 'Elevates average order value from ₹349 to ₹599+ by framing curated wrist-and-neck sets.',
    imageUrl: '/src/assets/images/display_tiered_riser_1795002552402.jpg',
  },
};
