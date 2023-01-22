import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription } from "./command";

export class InfoCommand extends Command {
    description: CommandDescription = {
        name: 'info',
        description: 'Inferno Minigame Account Info'
    };

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        console.log('Info Command');
        
        let user = await this.parent.users.getUser(interaction.user.id);

        interaction.reply({
            ephemeral: true,
            embeds: [
                {
                    title: 'Info',
                    fields: [
                        {
                            name: 'Balance',
                            value: `${user?.balance} ₽`
                        }
                    ]
                }
            ]
        })
    }
}