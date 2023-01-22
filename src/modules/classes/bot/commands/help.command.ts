import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription } from "./command";

export class HelpCommand extends Command {
    description: CommandDescription = {
        name: 'help',
        description: 'Lists all available commands.',
        defaultPermission: true,
    }

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        let user = await this.parent.users.getUser(interaction.user.id);

        // UPDATE LIST OF COMMANDS
        interaction.reply({
            embeds: [
                {
                    title: "Here is a list of all available commands.",
                    description: "!start - Starting point for discord mini-game \n"
                }
            ]
        })
    }
}