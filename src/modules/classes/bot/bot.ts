import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { commands } from './commands/commands';
import { Command } from './commands/command';
import { Client, Intents, Message, MessageReaction, User }  from 'discord.js';
import { WebHooks } from './webhooks';
import { Users } from '../../users';

export class Bot {
    // events
    rest?: REST;
    client?: Client;
    private commands: Command[];
    hooks: WebHooks;
    users: Users;
    private registered_commands: RegisteredCommand[] = [];

    constructor() {
        this.hooks = new WebHooks();
        this.users = new Users();
        this.commands = commands.map(c => new c(this));
        
        if(global.config.bot_config) {
            let { application_id, bot_token } = global.config.bot_config
            this.rest = new REST({ version: '9' }).setToken(bot_token)

            this.register(application_id).then(()=> {
                console.log('new client');
                
                this.client = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS ] });
    
                this.client.on('ready', () => {
                    console.log('ACTUAL Bot ready');
                })
    
                this.client.on('interactionCreate', (interaction) => {
                    // console.log('Message', interaction);
                    // if(interaction)
                    if(interaction.isCommand()) {
                        let command = this.commands.filter(c => c.description?.name == interaction.commandName).pop();
                        if(command && command.handleCommand) {
                            command.handleCommand(interaction);
                        } else {
                            interaction.reply('Error processing comand');
                        }
                    }
    
                    if(interaction.isButton()) {
                        console.log('Button');
                        
                        let commandArr = interaction.customId.split('/');
                        console.log('command array', commandArr);
                        
                        let command = this.commands.filter(c => c.description?.name == commandArr[0])[0];
                        if(command) {
                            command.handleButton(interaction, commandArr.slice(1, commandArr.length))
                        } else {
    
                        }
                    }
                })
    
                this.client.on('messageReactionAdd', async (reaction, user) => {
                    console.log('REACTION START');
                    
                    const handleReaction = (reaction: MessageReaction, message: Message, user: User) => {
                        console.log(reaction);
                        if(reaction.message.webhookId) {
                            this.hooks.emit(reaction.message.webhookId, { reaction, message, user });
                        }

                        this.hooks.emit('generalReaction', { reaction, user });
                    }
    
                    let fetchedMessage: Message | undefined;
                    let fetchedReaction: MessageReaction | undefined;
                    let fetchedUser: User | undefined;
    
                    if(reaction.partial) {
                        try {
                            fetchedReaction = await reaction.fetch();
                        } catch(err) {
                            console.log('Error fetching reaction');
                        }
                    } else {
                        fetchedReaction = reaction;
                    }
    
                    if(user.partial) {
                        try {
                            fetchedUser = await user.fetch();
                        } catch(err) {
                            console.log('Error fetching user');
                        }
                    } else {
                        fetchedUser = user;
                    }

                    if(reaction.message.partial) {
                        try {
                            fetchedMessage = await reaction.message.fetch();
                        } catch(err) {
                            console.log('Error fetching message');
                        }
                    } else {
                        fetchedMessage = reaction.message;
                    }
    
                    if(fetchedReaction && fetchedUser && fetchedMessage) handleReaction(fetchedReaction, fetchedMessage, fetchedUser);
                })
    
                this.client.login(bot_token)
            }).catch((error) => {
                console.log(error);
            })
        }
    }

    private register(application_id: string) {
        return new Promise((resolve, reject) => {
            this.rest?.put(
                Routes.applicationCommands(application_id),
                { body: this.commands.filter(c => c.description != undefined).map(c => c.description) }
            ).then((data) => {
                console.log(data);
                this.registered_commands = <Array<RegisteredCommand>>data;
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        })
        
    }

    getCommand(name: string): RegisteredCommand | undefined {
        let cm = this.registered_commands.filter(r => r.name == name).pop();
        return cm ? cm : undefined;
    }
}

interface RegisteredCommand {
    id: string,
    application_id: string,
    version: string,
    default_permission: boolean,
    default_member_permissions: any,
    type: number,
    name: string,
    name_localizations: any,
    description: string,
    description_localizations: any,
    dm_permission: any
}