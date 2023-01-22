import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription, CommandOptionTypes } from "./command";
import random from 'random';

export class DiceCommand extends Command {
    description: CommandDescription = {
        name: 'dice',
        description: 'Bet money against a Dice toss (0-100 roll)',
        defaultPermission: true,
        options: [
            {
                name: 'side',
                type: CommandOptionTypes.STRING,
                description: 'Chose a side of coin',
                required: true,
                choices: [
                    {
                        name: 'Above',
                        value: 'above'
                    },
                    {
                        name: 'Below',
                        value: 'below'
                    }
                ]
            },
            {
                name: 'number',
                type: CommandOptionTypes.NUMBER,
                description: 'Amount to be wagered',
                required: true,
                min_value: 5,
                max_value: 95
            },
            {
                name: 'wager',
                type: CommandOptionTypes.NUMBER,
                description: 'Amount to be wagered',
                required: true,
                min_value: 15
            }
        ]
    }

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        let user = await this.parent.users.getUser(interaction.user.id);
        console.log(interaction.options.data);
        

        let options: any = {
            wager: 0,
            number: undefined,
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
                    case 'number':
                        options.number = Math.round(+option.value);
                        break;
                }
            }
        }

        if(options.wager != 0 && options.side && options.number) {
            if(user.balance >= options.wager) {
                let rand = random.int(0, 100);
                let won: boolean | undefined;
                let odds = 0;
                switch(options.side) {
                    case 'above':
                        odds = (100 - options.number) / 100;
                        won = rand >= options.number;
                        break;
                    case 'below':
                        odds = options.number / 100;
                        won = rand <= options.number;
                        break;
                }
                let multiplier = 1 + (1 - odds) * 2;

                if(won != undefined) {
                    if(won) {
                        user.balance += multiplier * options.wager - options.wager;
                        interaction.reply({
                            embeds: [
                                {
                                    title: 'Hurray you won!! :confetti_ball:',
                                    description: `The dice landed on "${rand}" and you bet ${options.side[0].toUpperCase() + options.side.slice(1)} ${options.number}`,
                                    fields: [
                                        {
                                            name: 'Wager',
                                            value: `${options.wager} ₽`,
                                        },
                                        {
                                            name: 'Odds',
                                            value: `${odds * 100}%`,
                                            inline: true
                                        },
                                        {
                                            name: 'Multiplier',
                                            value: `${multiplier * 100}%`,
                                            inline: true
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
                                    description: `The dice landed on "${rand}" and you bet ${options.side[0].toUpperCase() + options.side.slice(1)} ${options.number}`,
                                    fields: [
                                        {
                                            name: 'Wager',
                                            value: `${options.wager} ₽`,
                                        },
                                        {
                                            name: 'Odds',
                                            value: `${odds * 100}%`,
                                            inline: true
                                        },
                                        {
                                            name: 'Multiplier',
                                            value: `${multiplier * 100}%`,
                                            inline: true
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
                        content: `Error processing cointoss`,
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