import type { User } from "discord.js";

export interface Character {
    name: string;
    clan: Clan | undefined;
    role: Role | undefined;
    owner: User;
    threadId: string;
}

// constants.ts
export const Clans = ["Lightningclan", "Streamclan", "Shadeclan", "Breezeclan"] as const;

export const Roles = [
    "Leader",
    "Deputy",
    "Warrior",
    "Apprentice",
    "Medicine cat",
    "Medicine cat app.",
    "King/Queen",
    "Kit",
    "Loner/Rogue",
    "Kittypet",
] as const;

export type Clan = (typeof Clans)[number];
export type Role = (typeof Roles)[number];
