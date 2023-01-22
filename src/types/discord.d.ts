export interface DiscordMember {
    id: string;
    username: string;
    avatar?: string;
    banner?: string;
    in_guild: boolean;
    roles?: DiscordGuildRole[];
    expires: number;
    address?: string
}

export interface DiscordGuildRole {
    icon: string | null,
    unicodeEmoji: string | null,
    id: string,
    name: string,
    color: string,
}

export interface PostResponse<T> {
    error: boolean;
    data?: T;
    message?: string;
}

export interface DiscordUserSQL {
    discord_id: number
    username: string
    address: string
}

export interface DiscordUser {
    id: number,
    username: string,
    avatar: string,
    avatar_decoration: any,
    discriminator: number,
    public_flags: number
}