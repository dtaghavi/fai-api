export interface Config {
    hosts: {
        production: HostConfig,
        development: HostConfig
    },
    database: {
        host: string,
        database: string,
        user: string,
        password: string
    },
    bot_config: DiscordBotConfig;
    guild_id: string,
    dev: boolean
    socketio: boolean,
    crypto_js_key : string
}

export interface HostConfig {
    httpPort: number;
    httpsPort: number;
    database?: DatabaseConfig,
    AIRWIRE_ACTIVE_PUBLIC : string,
    AIRWIRE_ACTIVE_PRIVATE : string,
    AES_KEY : string,
    API_ENDPOINT : string,
    HYPERION : string
}

export interface DatabaseConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}
export interface DiscordBotConfig {
    bot_token: string;
    application_id: string;
    client_id: string;
    client_secret: string;
}