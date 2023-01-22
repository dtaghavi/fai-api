import { CommandInteraction } from "discord.js";
import { Bot } from "../bot";
import { Command, CommandDescription, CommandOptionTypes } from "./command";

export class BalanceCommand extends Command {
    description: CommandDescription = {
        name: 'balance',
        description: 'Manage Users Account Balance',
        defaultPermission: true,
        options: [
            {
                name: 'user',
                type: CommandOptionTypes.USER,
                description: 'User account to manage',
                required: true
            },
            {
                name: 'operation',
                type: CommandOptionTypes.STRING,
                description: 'Operation on users account balance',
                required: true,
                choices: [
                    {
                        name: 'Add',
                        value: 'add'
                    },
                    {
                        name: 'Subtract',
                        value: 'subtract'
                    },
                    {
                        name: 'Set',
                        value: 'set'
                    }
                ]
            },
            {
                name: 'amount',
                type: CommandOptionTypes.NUMBER,
                description: 'Amount to be used for balance operation',
                required: true
            }
        ]
    };

    constructor(private parent: Bot) {
        super(parent);
    }

    async handleCommand(interaction: CommandInteraction) {
        console.log('Balance', interaction.options.data);
        let options: any = {
            user: undefined,
            operation: undefined,
            amount: 0
        }
        let username: string = 'undefined';

        for ( let option of interaction.options.data) {
            if(option.value != undefined) {
                switch(option.name) {
                    case 'user':
                        options.user = option.value;
                        if(option.user) username = option.user.username;

                        break;
                    case 'operation':
                        options.operation = option.value;
                        break;
                    case 'amount':
                        options.amount = +option.value;
                        break;
                }
            }
        }

        if(options.user && options.operation && options.amount != undefined) {

            let user = await this.parent.users.getUser(options.user);
            let before = user.balance;

            switch(options.operation) {
                case 'add':
                    user.balance += options.amount;
                    break;
                case 'subtract':
                    user.balance -= options.amount;
                    break;
                case 'set':
                    user.balance = options.amount;
                    break;
                default:
                    console.log('Unknown Operation');
            }

            this.parent.users.saveUser(user);

            interaction.reply({
                ephemeral: true,
                embeds: [
                    {
                        title: 'Success!',
                        description: `${username}'s Balance Updated`,
                        fields: [
                            {
                                name: 'From',
                                value: `${before} ₽`,
                                inline: true
                            },
                            {
                                name: 'To',
                                value: `${user.balance} ₽`,
                                inline: true
                            }
                        ]
                    }
                ]
            })

        } else {
            interaction.reply({
                content: 'Missing options',
                ephemeral: true
            });
        }
    }
}