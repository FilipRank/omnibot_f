import {
    Client,
    Embed,
    EmbedBuilder,
    Events,
    ForumChannel,
    GatewayIntentBits,
    TextChannel,
    ThreadChannel,
    type Channel,
    type FetchedThreads,
    type GuildForumTag,
    type TextBasedChannel,
} from "discord.js";
import { Clans, Roles, type Character, type Clan, type Role } from "./Character.ts";
import { channel } from "node:diagnostics_channel";
import dotenv from "dotenv";
import { threadId } from "node:worker_threads";
import { userInfo } from "node:os";

dotenv.config();

const token = process.env.TOKEN;
const forumID = process.env.FORUM_ID;
const channelID = process.env.CHANNEL_ID;

if (!token || !forumID || !channelID) {
    throw new Error("Missing environment variables.");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let characterEmbed: EmbedBuilder;

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    displayAllegiances();
});

client.on("threadCreate", async (thread: ThreadChannel) => {
    displayAllegiances();
});

client.on("threadUpdate", async (thread: ThreadChannel) => {
    displayAllegiances();
});

client.on("threadDelete", async (thread: ThreadChannel) => {
    displayAllegiances();
});

client.on("guildMemberAdd", async () => {
    displayAllegiances();
});

client.on("guildMemberRemove", async () => {
    displayAllegiances();
});

async function displayAllegiances() {
    const characters = await getAllCharactersFromForum(forumID!);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID!)) as TextChannel;

    console.log(text);
    if (!characterEmbed) {
        characterEmbed = new EmbedBuilder().setTitle("Allegiances").setDescription(text);
        channel.send({ embeds: [characterEmbed] });
        return;
    }
    editLastMessage(channel, characterEmbed);
}

function generateCharacterList(characters: Character[]): string {
    let text = "";
    text += `Characters (${characters.length})\n`;
    Clans.forEach((clan: Clan) => {
        let clanCount = characters.filter((c) => c.clan?.endsWith(clan)).length;
        text += `# ${clan} (${clanCount})\n`;
        Roles.forEach((role: Role) => {
            if (!(role.endsWith("Kittypet") || role.endsWith("Loner/Rogue"))) {
                text += `\n**${role}:**\n`;
            }
            characters.forEach(async (character: Character) => {
                if (character.clan?.endsWith(clan) && character.role?.endsWith(role)) {
                    text += `- ${character.name} (${character.owner.displayName}) <#${character.threadId}>\n`;
                }
            });
        });
    });
    let kittypets = characters.filter((c) => c.role?.endsWith("Kittypet"));
    let roguesAndLoners = characters.filter((c) => c.role?.endsWith("Loner/Rogue"));
    text += `# Kittypets (${kittypets.length})\n`;
    kittypets.forEach((k) => {
        text += `- ${k.name} (${k.owner.displayName}) <#${k.threadId}>\n`;
    });
    text += `# Rogues/Loners (${roguesAndLoners.length})\n`;
    roguesAndLoners.forEach((r) => {
        text += `- ${r.name} (${r.owner.displayName}) <#${r.threadId}>\n`;
    });
    return text;
}

async function getAllCharactersFromForum(forumID: string): Promise<Character[]> {
    const forum = (await client.channels.fetch(forumID)) as ForumChannel;
    const activeThreads = await forum.threads.fetchActive();
    const archivedThreads = await forum.threads.fetchArchived();
    const threads = new Map([...activeThreads.threads, ...archivedThreads.threads]);
    const characters: Array<Character> = [];

    for (const [, thread] of threads) {
        const tags = thread.appliedTags.map((tagId) =>
            forum.availableTags.find((tag) => tag.id == tagId)
        );
        const clan = tags.find((tag) => tag?.name.endsWith("clan"))?.name as Clan | undefined;
        const role = tags.find((tag) => !tag?.name.endsWith("clan"))?.name as Role | undefined;
        const owner = await client.users.fetch(thread.ownerId);
        const character: Character = {
            name: thread.name,
            clan: clan,
            role: role,
            owner: owner,
            threadId: thread.id,
        };

        let memberStillInGuild = false;
        if (thread.ownerId && forum.guild) {
            try {
                const member = await forum.guild.members.fetch(thread.ownerId);
                memberStillInGuild = !!member;
            } catch (err) {
                memberStillInGuild = false;
                console.log("Member not in guild.");
            }
        }

        if (memberStillInGuild) {
            characters.push(character);
        }
    }
    return characters;
}

async function editLastMessage(channel: TextChannel, embed: EmbedBuilder) {
    try {
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMessage = messages.first();

        if (!lastMessage) {
            console.log("No messages to edit");
            return;
        }

        await lastMessage.edit({ embeds: [embed] });
        console.log("Message edited successfully!");
    } catch (err) {
        console.error("Failed to edit message:", err);
    }
}

client.login(token);
