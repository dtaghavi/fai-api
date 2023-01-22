import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription } from "./command";
// import jwt from 'jsonwebtoken';

export class AuthCommand extends Command {
    description: CommandDescription = {
        name: 'eth-auth',
        description: 'Ethereum authentication'
    };

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        console.log('Info Command');
        
        let user = await this.parent.users.getUser(interaction.user.id);
        // let token = jwt.sign({ userId: interaction.user.id }, global.config.jwt_secret)

        // interaction.reply({
        //     ephemeral: true,
        //     content: `https://auth.fuego.zone/discord-auth?id=${token}`
        // })
    }
}