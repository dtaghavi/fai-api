import { BaseCommandInteraction, ButtonInteraction, CacheType, CommandInteraction, Interaction } from "discord.js";
import { Bot } from "../bot";

// base command implementable
export class Command {
    constructor(parent: Bot) {}
    register: boolean = true;
    description?: CommandDescription;
    children?: Command[];

    handleCommand?(interaction: CommandInteraction): any
    handleButton(interaction: ButtonInteraction, commandArr: string[]): any {
        if(commandArr.length && this.children) {
            let commandStr = commandArr[0]
            let newArr = commandArr.slice(1, commandArr.length);
            let command = this.children?.filter(c => c.description?.name == commandStr)[0];
            if(command) {
                command.handleButton(interaction, newArr)
            }
        } else {
            interaction.reply('Default button reply');
        }
    }
}

export const CommandOptionTypes = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
    MENTIONABLE: 9,
    NUMBER: 10
}

export interface CommandDescription {
    name: string;
    description: string;
    type?: 1 /** CHAT_INPUT */ | 2 /** USER */ | 3 /** MESSAGE */,
    defaultPermission?: boolean;
    options?: CommandOption[];
}

export interface CommandOption {
    type: number,
    name: string;
    description: string;
    required?: boolean;
    choices?: CommandOptionChoice[];
    options?: CommandOption[];
    min_value?: number;
    max_value?: number;
    autocomplete?: boolean;
}

export interface CommandOptionChoice {
    name: string;
    value: number | string;
}