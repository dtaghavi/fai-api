import { Bot } from "../bot";
import { Command, CommandDescription, CommandOptionTypes } from "./command";
import { CommandInteraction } from "discord.js";
import { DiscordGuildRole } from '../../../../types/discord';
import { Discord } from "../../discord";

export class StartCommand extends Command {
    description: CommandDescription = {
        name: 'start',
        description: 'Takes you through a linear story that introduces you to the world in which this game takes place and provides the backdrop.',
        defaultPermission: true,
    }

    textOne = [
        "In the tomb of a nameless king",
        "In a crypt of forgotten sinners",
        "In a desecrated burial chamber",
        "In a pit of martyrs",
        "On a pyre in an unknown land" 
    ]
    textTwo = [
        "Brimstone",
        "Rosewater",
        "Ichor",
        "Incense",
        "Blood",
        "Flayed skin"

    ]
    textThree = [
        "Wetted ashes",
        "Cinders",
        "Hellebore",
        "Hemlock",
        "Vitriol",
        "Saltpeter"
    ]
    textFour = [
        "The Dogheaded Angel",
        "The Adversary's harp tongue and biting teeth",
        "How the earth cracked open to swallow you whole",
        "Her loving embrace",
        "Burning Alive"
    ]

    constructor(private parent: Bot) {
        super(parent);
    }
    //  ********** CHECK WHETHER A USER HAS COMPLETED THIS ONCE DON"T ALLOW REPEAT ************
    async handleCommand(interaction: CommandInteraction) {
        let user = await this.parent.users.getUser(interaction.user.id);
        
        let hasRole = false;
        let disc = new Discord();
        await disc.getUserRoles(user.id).then((roles: Array<DiscordGuildRole>) => {
            // Check if user has Souls role
            for(let role of roles) {
                if(role.name == 'Souls') hasRole = true;
            }
        }).catch((err) => {
            console.log(`Error retrieving roles of ${user.id} `, err);
        });
        
        if(!hasRole) {
            // IF the user DOESN'T have Souls --> Direct to #verify channel

        } else {
            // ELSE the user HAS Souls 
            // Something happens depending on response? ** Question **
            interaction.reply({
                embeds: [
                    {
                        title: "Your journey has begun. Adventure awaits!",
                        description: `You wake up ${this.textOne[0]}, the scent of ${this.textTwo[0]} and ${this.textThree[0]} still ripe in the air. You remember ${this.textFour[0]}, but little more.\n\n The land you're in is strange and full of dangers, and the war still rages beyond your borders. Who will you side with? And what will you fight to protect? \n\n Type !explore to venture out.`
                    }
                ],
                ephemeral: true
            })

            // Intro quest done grant loot to inventory

            // Display all commands to the user !help    
        }
    }
}