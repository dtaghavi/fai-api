import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription, CommandOptionTypes } from "./command";

export class CointossCommand extends Command {
    description: CommandDescription = {
        name: 'cointoss',
        description: 'Bet money against a Cointoss',
        defaultPermission: true,
        options: [
            {
                name: 'wager',
                type: CommandOptionTypes.NUMBER,
                description: 'Amount to be wagered',
                required: true,
                min_value: 15
            },
            {
                name: 'side',
                type: CommandOptionTypes.STRING,
                description: 'Chose a side of coin',
                required: true,
                choices: [
                    {
                        name: 'Heads',
                        value: 'heads'
                    },
                    {
                        name: 'Tails',
                        value: 'tails'
                    }
                ]
            }
        ]
    }

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        let user = await this.parent.users.getUser(interaction.user.id);

        let options: any = {
            wager: 0,
            side: undefined
        }

        for ( let option of interaction.options.data) {
            if(option.value) {
                switch(option.name) {
                    case 'wager':
                        options.wager = option.value;
                        break;
                    case 'side':
                        options.side = option.value;
                        break;
                }
            }
        }

        if(options.wager != 0 && options.side) {
            if(user.balance >= options.wager) {
                let rand = Math.random();
                let won: boolean | undefined;
                switch(options.side) {
                    case 'heads':
                        won = rand >= .5;
                        break;
                    case 'tails':
                        won = rand < .5;
                        break;
                }

                if(won != undefined) {
                    if(won) {
                        user.balance += options.wager;
                        interaction.reply({
                            embeds: [
                                {
                                    title: 'Hurray you won!! :confetti_ball:',
                                    description: `The coin landed on "${rand >= .5 ? 'Heads' : 'Tails'}" and you called "${options.side[0].toUpperCase() + options.side.slice(1)}"`,
                                    fields: [
                                        {
                                            name: 'Wager',
                                            value: `${options.wager} ₽`,
                                        },
                                        {
                                            name: 'New Balance',
                                            value: `${user.balance} ₽`,
                                        }
                                    ]
                                }
                            ]
                        })
                    } else {
                        user.balance -= options.wager;
                        interaction.reply({
                            embeds: [
                                {
                                    title: 'Sorry you lost :cry:',
                                    description: `The coin landed on "${rand >= .5 ? 'Heads' : 'Tails'}" and you called "${options.side[0].toUpperCase() + options.side.slice(1)}"`,
                                    fields: [
                                        {
                                            name: 'Wager',
                                            value: `${options.wager} ₽`,
                                        },
                                        {
                                            name: 'New Balance',
                                            value: `${user.balance} ₽`,
                                        }
                                    ]
                                }
                            ]
                        })
                    }

                    await this.parent.users.saveUser(user);
                } else {
                    interaction.reply({
                        content: `Arror processing cointoss`,
                    });
                }

            } else {
                interaction.reply({
                    content: `You can't afford a wager of ${options.wager} ₽`,
                    ephemeral: true
                });
            }
        } else {
            interaction.reply({
                content: 'Must wager at least 15 ₽',
                ephemeral: true
            });
        }
    }
}