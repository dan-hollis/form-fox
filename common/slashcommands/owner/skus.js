const { Models: { SlashCommand } } = require('frame');
const logger = require('../../logger');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'skus',
			description: "List SKUs for entitlements",
			usage: [
				'- List current SKUs'
			]
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		if(ctx.user.id !== this.#bot.owner) return "Only the bot owner can use this!";

		var app = await ctx.client.application.fetch();
		logger.debug(`App data: ${JSON.stringify(app)}`);
		var skus = await app.fetchSKUs();
		if(!skus) return "No SKUs registered :(";

		var formatted = skus.map(s => {
			return (
				`${s.name} (${s.id}) - ${s.flags.toArray().join(", ")}`
			)
		})

		logger.debug(`Formatted SKUs: ${JSON.stringify(formatted)}`);

		return formatted.join("\n")
	}
}

module.exports = (bot, stores) => new Command(bot, stores);