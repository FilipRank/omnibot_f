import {
    Client,
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

dotenv.config();

const token = process.env.TOKEN;
const forumID = process.env.FORUM_ID;
const channelID = process.env.CHANNEL_ID;

if (!token || !forumID || !channelID) {
    throw new Error("Missing environment variables.");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    const forum = (await client.channels.fetch(forumID)) as ForumChannel;
    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    const threads: FetchedThreads = await forum.threads.fetch();

    const characters: Character[] = await getAllCharactersFromForum(forumID);

    const text = generateCharacterList(characters);
    console.log(text);
    channel.send(text);
});

client.on("threadCreate", async (thread: ThreadChannel) => {
    if (thread.parentId !== forumID) return;

    const characters = await getAllCharactersFromForum(forumID);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    console.log(text);
    await editLastMessage(channel, text);
});

client.on("threadUpdate", async (thread: ThreadChannel) => {
    if (thread.parentId !== forumID) return;

    const characters = await getAllCharactersFromForum(forumID);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    console.log(text);
    await editLastMessage(channel, text);
});

client.on("threadDelete", async (thread: ThreadChannel) => {
    if (thread.parentId !== forumID) return;

    const characters = await getAllCharactersFromForum(forumID);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    console.log(text);
    await editLastMessage(channel, text);
});

client.on("guildMemberAdd", async () => {
    const characters = await getAllCharactersFromForum(forumID);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    console.log(text);
    await editLastMessage(channel, text);
});

client.on("guildMemberRemove", async () => {
    const characters = await getAllCharactersFromForum(forumID);
    const text = generateCharacterList(characters);

    const channel = (await client.channels.fetch(channelID)) as TextChannel;

    console.log(text);
    await editLastMessage(channel, text);
});

function generateCharacterList(characters: Character[]): string {
    let text = "";
    Clans.forEach((clan: Clan) => {
        text += `# ${clan}\n`;
        Roles.forEach((role: Role) => {
            if (clan.endsWith("clan")) {
                text += `\n**${role}:**\n`;
            }
            characters.forEach((character: Character) => {
                if (character.clan?.endsWith(clan) && character.role?.endsWith(role)) {
                    text += `${character.name}\n`;
                } else if (role == "Kittypet" && character.role?.endsWith("Kittypet")) {
                    text += `${character.name}\n`;
                } else if (role == "Loner/Rogue" && character.role?.endsWith("Loner/Rogue")) {
                    text += `${character.name}\n`;
                }
            });
        });
    });
    return text;
}

async function getAllCharactersFromForum(threadId: string): Promise<Character[]> {
    const forum = (await client.channels.fetch(threadId)) as ForumChannel;
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
        const character: Character = {
            name: thread.name,
            clan: clan,
            role: role,
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

async function editLastMessage(channel: TextChannel, newContent: string) {
    try {
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMessage = messages.first();

        if (!lastMessage) {
            console.log("No messages to edit");
            return;
        }

        await lastMessage.edit(newContent);
        console.log("Message edited successfully!");
    } catch (err) {
        console.error("Failed to edit message:", err);
    }
}

client.login(token);
