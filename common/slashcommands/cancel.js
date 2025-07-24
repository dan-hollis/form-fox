const { Models: { SlashCommand } } = require('frame');
const logger = require('../logger');
const { confBtns } = require('../extras');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'cancel',
			description: 'Cancel your own active form response',
			usage: [
				'- Cancel your current form response if you have one active'
			],
			permissions: [],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		// Check if user has an active response
		var dm;
		try {
			dm = await ctx.user.createDM();
		} catch(e) {
			return 'Unable to access your DMs to check for active responses!';
		}

		var response = await this.#stores.openResponses.get(dm.id);
		if(!response?.id) {
			return 'You don\'t have any active form responses to cancel!';
		}

		// Get the form info
		var form = response.form;
		if(!form) {
			// Response exists but form is invalid, clean it up
			await response.delete();
			return 'Found and cleaned up an invalid response. You can now start a new form!';
		}

		// Confirm cancellation
		var content = `Are you sure you want to cancel your response for **${form.name}**?\n` +
					  `**WARNING:** This will delete all your progress and you'll have to start over if you want to fill out this form again.`;

		var reply = await ctx.reply({
			content,
			components: [{
				type: 1,
				components: confBtns
			}],
			ephemeral: true,
			fetchReply: true
		});

		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		if(conf.msg) return conf.msg;

		// Cancel the response
		try {
			var prompt = await dm.messages.fetch(response.message_id);
			await response.delete();
			
			await prompt.edit({
				components: [{
					type: 17,
					accent_color: 0xaa5555,
					components: [{
						type: 10,
						content:
							`## Response cancelled\n` +
							`This response has been cancelled!\n` +
							`-# Cancelled <t:${Math.floor(new Date().getTime() / 1000)}:F>`
					}]
				}]
			});

			return `Successfully cancelled your response for **${form.name}**! You can now start a new form if needed.`;
		} catch(e) {
			                        logger.error(`Response cancellation error: ${e.message}`);
			// Try to delete the response even if message edit fails
			try {
				await response.delete();
			} catch(e2) {
				                                logger.error(`Failed to delete response: ${e2.message}`);
			}
			return 'Response cancelled, but there was an issue updating the form message. You should now be able to start a new form.';
		}
	}
}

module.exports = (bot, stores) => new Command(bot, stores); 