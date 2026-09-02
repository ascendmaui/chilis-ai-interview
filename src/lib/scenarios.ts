import type { RoleSlug } from "./types";

export type FloorPrompt = {
  id: string;
  title: string;
  body: string;
  choices: { id: string; label: string; correct: boolean }[];
};

const COMMON: FloorPrompt[] = [
  {
    id: "allergy",
    title: "Allergy on the fly",
    body: "A guest mentions a peanut allergy after the food has already been fired. What do you do first?",
    choices: [
      { id: "a", label: "Tell the kitchen immediately and stop the plate", correct: true },
      { id: "b", label: "Wait until the ticket comes up, then ask Expo", correct: false },
      { id: "c", label: "Assume the garnish is fine and run the food", correct: false },
    ],
  },
];

export const FLOOR_PROMPTS: Record<RoleSlug, FloorPrompt[]> = {
  server: [
    {
      id: "birthday-steak",
      title: "Birthday table",
      body: "Table 14's steak is overcooked. It's a birthday. Guest is getting loud. You have two other tables waiting on drinks.",
      choices: [
        { id: "a", label: "Own it, get a manager if needed, fire a new steak, keep the other tables moving", correct: true },
        { id: "b", label: "Argue that they ordered medium and this looks medium", correct: false },
        { id: "c", label: "Ignore them until you drop drinks on the other tables", correct: false },
      ],
    },
    {
      id: "check-split",
      title: "Split six ways",
      body: "An eight-top wants to split six ways while you have a two-top ready for dessert and Expo is calling.",
      choices: [
        { id: "a", label: "Acknowledge Expo, set a clear next step with the eight-top, keep dessert moving", correct: true },
        { id: "b", label: "Stand at the POS until all six payments clear", correct: false },
        { id: "c", label: "Tell them Chili's doesn't split checks", correct: false },
      ],
    },
    ...COMMON,
  ],
  host: [
    {
      id: "wait-quote",
      title: "45-minute wait",
      body: "Party of 12. Quote is 45 minutes. Guest already looks heated. A two-top just walked in.",
      choices: [
        { id: "a", label: "Honest quote, offer bar/app while they wait, seat the two-top correctly", correct: true },
        { id: "b", label: "Tell them 15 minutes so they don't leave", correct: false },
        { id: "c", label: "Seat the 12 immediately even if it buries the kitchen", correct: false },
      ],
    },
    {
      id: "regular-booth",
      title: "Usual booth",
      body: "A regular wants their booth. It's sat. They are used to getting what they want.",
      choices: [
        { id: "a", label: "Warm greeting, honest status, offer the next-best and a drink at the bar", correct: true },
        { id: "b", label: "Move the current table so the regular can have it", correct: false },
        { id: "c", label: "Say you don't do favorites here", correct: false },
      ],
    },
    ...COMMON,
  ],
  bartender: [
    {
      id: "cut-off",
      title: "One more round",
      body: "Guest at the rail is clearly intoxicated and asking for another margarita. Their friends are cheering you on.",
      choices: [
        { id: "a", label: "Refuse the drink, offer water/food, get a manager if it escalates", correct: true },
        { id: "b", label: "Pour a weak one so they leave happy", correct: false },
        { id: "c", label: "Serve it — they're with a group that will handle it", correct: false },
      ],
    },
    {
      id: "well-crush",
      title: "Happy hour crush",
      body: "Six tickets in the well. Guest at the rail wants to chat. A server needs two margs now.",
      choices: [
        { id: "a", label: "Work the well in ticket order, keep the rail guest acknowledged, call 30 seconds on the server", correct: true },
        { id: "b", label: "Stop everything to finish the conversation", correct: false },
        { id: "c", label: "Skip tickets and make the server drinks first every time", correct: false },
      ],
    },
    ...COMMON,
  ],
  "line-cook": [
    {
      id: "window-fajitas",
      title: "Fajitas dying",
      body: "Expo is calling fajitas that have been in the window too long. Your board is full.",
      choices: [
        { id: "a", label: "Refire if they sat too long, communicate time, keep the rest of the board moving", correct: true },
        { id: "b", label: "Send them anyway — they'll still sizzle", correct: false },
        { id: "c", label: "Walk off the line to argue with the server", correct: false },
      ],
    },
    {
      id: "allergy-ticket",
      title: "Allergy in the weeds",
      body: "You are in the weeds. A new ticket drops with a peanut allergy.",
      choices: [
        { id: "a", label: "Call it out, change gloves/tools, treat it as the most important plate on the board", correct: true },
        { id: "b", label: "Cook it like everything else and pick off the garnish", correct: false },
        { id: "c", label: "Let Expo deal with it later", correct: false },
      ],
    },
    ...COMMON,
  ],
  togo: [
    {
      id: "missing-guac",
      title: "Three cars",
      body: "Three cars in the lot. One order is missing guacamole. Phone is ringing.",
      choices: [
        { id: "a", label: "Fix the incomplete bag, greet the next car, let the phone go to a teammate or a 10-second hold", correct: true },
        { id: "b", label: "Answer the phone first and let the cars wait", correct: false },
        { id: "c", label: "Hand the incomplete bag out and hope they don't notice", correct: false },
      ],
    },
    {
      id: "catering-allergen",
      title: "Big order, allergen",
      body: "A large To Go order with an allergen note is 10 minutes out. Bags are only half-checked.",
      choices: [
        { id: "a", label: "Stop and bag-check against the ticket, flag the allergen, call the guest if you're late", correct: true },
        { id: "b", label: "Speed-bag it so they don't wait", correct: false },
        { id: "c", label: "Leave extras out to save time", correct: false },
      ],
    },
    ...COMMON,
  ],
  "shift-manager": [
    {
      id: "call-outs",
      title: "Friday call-outs",
      body: "One server down on a Friday. Door is still seating. Kitchen is 15 minutes behind.",
      choices: [
        { id: "a", label: "Reset the floor, hold seating if needed, pull a runner, tell the door the truth", correct: true },
        { id: "b", label: "Keep seating like it's a normal Friday and hope it works out", correct: false },
        { id: "c", label: "Close the door and hide in the office", correct: false },
      ],
    },
    {
      id: "guest-recovery",
      title: "Manager to the table",
      body: "Guest wants a manager after a long wait and a wrong entree. Team is watching how you handle it.",
      choices: [
        { id: "a", label: "Listen, own it, make it right within policy, coach the station after the guest is whole", correct: true },
        { id: "b", label: "Comped the whole check immediately without hearing them", correct: false },
        { id: "c", label: "Defend the server in front of the guest", correct: false },
      ],
    },
    ...COMMON,
  ],
};

export const QUIZ_FIRST_DELAY_MS = 28000;
export const QUIZ_INTERVAL_MS = 52000;
