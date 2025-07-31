const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'msgephemeral',
			description: 'Sets whether all bot command responses should be ephemeral (only visible to you)',
			ephemeral: true,
			options: [
				{
					name: 'value',
					description: 'The value to set',
					type: 5
				}
			],
			usage: [
				'- View the current ephemeral message status',
				'[value] - Set whether to make all bot responses ephemeral'
			],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_CONFIG'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		var val = ctx.options.getBoolean('value');

		if(val == null || val == undefined) {
			return `Ephemeral messages are currently **${cfg?.msg_ephemeral ? 'enabled' : 'disabled'}**.`
		}

		cfg.msg_ephemeral = val;
		await cfg.save();
		return 'Config updated! All bot command responses will now be ' + (val ? 'ephemeral (only visible to you)' : 'visible to everyone') + '.';
	}
}

module.exports = (bot, stores) => new Command(bot, stores);