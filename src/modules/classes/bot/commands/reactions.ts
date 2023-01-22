import { Message, MessageReaction, User } from "discord.js";
import { Bot } from "../bot";
import { Command } from "./command";

export class Reactions extends Command {
    constructor(private parent: Bot) {
        super(parent);

        this.parent.hooks.on<{reaction: MessageReaction, message: Message, user: User}>('generalReaction').subscribe(async (data) => {
            console.log('Reactions', data.reaction.message.author?.id, data.user.id);
            // if(data.reaction.message.author?.id && data.reaction.message.author?.id !== data.user.id) {
            //     let user_id = data.reaction.message.author!.id;
            //     let user = await this.parent.users.getUser(user_id);

            //     user.balance += 1;

            //     this.parent.users.saveUser(user);
            // }
        })
    }
}