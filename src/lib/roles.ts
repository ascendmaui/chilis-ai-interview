import type { RoleSlug } from "./types";

export type Role = {
  slug: RoleSlug;
  title: string;
  station: string;
  blurb: string;
  pay: string;
  hours: string;
  traits: string[];
  scenarios: string[];
  knowledge: string[];
  weightNotes: string;
};

export const STORE = {
  brand: "Chili's Grill & Bar",
  product: "Chili's AI Interview",
  location: "Greenville, SC",
  gmName: "Cam",
  gmTitle: "General Manager",
};

export const ROLES: Role[] = [
  {
    slug: "server",
    title: "Server",
    station: "Front of house",
    blurb: "Own the table. Read the room. Sell the Triple Dipper without sounding like a script.",
    pay: "Tips + hourly",
    hours: "Nights & weekends",
    traits: ["Guest-first", "Upsell without pressure", "Rush stamina"],
    scenarios: [
      "Eight-top lands during a 40-minute wait while two tables want the check.",
      "Steak comes out overcooked on a birthday. Guest is loud.",
      "Table wants to split six ways and the POS is backed up.",
    ],
    knowledge: [
      "Triple Dipper, fajitas, Baby Back Ribs, Classic Burger, margaritas",
      "Allergen flags, My Chili's Rewards, To Go handoff",
    ],
    weightNotes:
      "Hospitality, table management, upselling, guest recovery. Energy that feels Chili's — fun, not stuffy.",
  },
  {
    slug: "host",
    title: "Host",
    station: "Door",
    blurb: "First smile. Honest wait times. Seat the floor so the kitchen can breathe.",
    pay: "Hourly + tips",
    hours: "Lunch, dinner, weekends",
    traits: ["First impression", "Wait-time honesty", "Floor awareness"],
    scenarios: [
      "45-minute wait, party of 12, guest is already annoyed.",
      "Regular wants their usual booth that is sat.",
      "To Go tickets stacking at the stand while a family is waiting to be greeted.",
    ],
    knowledge: [
      "Wait quotes, call-aheads, large party flow, To Go vs dine-in",
    ],
    weightNotes:
      "Composure at the door, accurate wait quotes, protecting the floor from over-seating.",
  },
  {
    slug: "bartender",
    title: "Bartender",
    station: "Bar",
    blurb: "Margaritas, pace, and knowing when a guest has had enough.",
    pay: "Tips + hourly",
    hours: "Happy hour & late nights",
    traits: ["Speed + accuracy", "Responsible service", "Bar personality"],
    scenarios: [
      "Happy hour crush, six tickets, guest at the rail wants to chat.",
      "Guest is clearly intoxicated and asking for another round.",
      "Server needs two margaritas NOW and the well is slammed.",
    ],
    knowledge: [
      "House margaritas, beer + wine basics, TIPS / responsible service, garnish consistency",
    ],
    weightNotes:
      "Responsible service, speed under pressure, personality that keeps the bar fun without losing control.",
  },
  {
    slug: "line-cook",
    title: "Line Cook",
    station: "Back of house",
    blurb: "Tickets, timing, and fajitas that still sizzle when they hit the table.",
    pay: "Hourly",
    hours: "Lunch & dinner doubles",
    traits: ["Ticket discipline", "Food safety", "Station ownership"],
    scenarios: [
      "Expo is calling for fajitas that have been in the window too long.",
      "You are in the weeds and a new ticket drops with a peanut allergy.",
      "Grill is backed up and a server is hovering.",
    ],
    knowledge: [
      "Fajitas, burgers, ribs, ticket times, temp, cross-contamination, Expo language",
    ],
    weightNotes:
      "Pace, food safety, communication with Expo, staying calm when the board fills up.",
  },
  {
    slug: "togo",
    title: "To-Go Specialist",
    station: "Takeout",
    blurb: "Chili's To Go is a second dining room. Accuracy is the guest.",
    pay: "Hourly + tips",
    hours: "Lunch peak & dinner",
    traits: ["Order accuracy", "Speed", "Phone presence"],
    scenarios: [
      "Three cars in the lot, one missing guacamole, phone ringing.",
      "Large catering-style order with an allergen note 10 minutes out.",
      "Guest is angry because they waited and the bag is incomplete.",
    ],
    knowledge: [
      "Bag checks, extras (salsa, limes, utensils), curbside, Rewards, phone etiquette",
    ],
    weightNotes:
      "Accuracy, composure on the phone, making To Go feel as cared-for as a table.",
  },
  {
    slug: "shift-manager",
    title: "Shift Manager",
    station: "Floor lead",
    blurb: "Run the shift. Protect the team. Make the 7pm turn look easy.",
    pay: "Salary / hourly + bonus",
    hours: "Closes, weekends, holidays",
    traits: ["Shift ownership", "Coaching", "Numbers + people"],
    scenarios: [
      "Call-outs leave you one server down on a Friday.",
      "Guest wants a manager after a long wait and a wrong entree.",
      "Kitchen is 20 minutes behind and the door is still seating.",
    ],
    knowledge: [
      "Labor, comps, 86 board, guest recovery authority, pre-shift, food safety",
    ],
    weightNotes:
      "Judgment under pressure, coaching tone, guest recovery, protecting both the guest and the team.",
  },
];

export function getRole(slug: string): Role {
  return ROLES.find((r) => r.slug === slug) ?? ROLES[0];
}
