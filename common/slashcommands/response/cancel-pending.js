const { Models: { SlashCommand } } = require('frame');
const { clearBtns } = require('../../extras');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'cancel-pending',
			description: 'Cancel a pending response that failed to submit properly',
			options: [
				{
					name: 'user',
					description: 'The user whose pending response to cancel',
					type: 6,
					required: true
				},
				{
					name: 'form_id',
					description: 'The form ID (optional - if not provided, cancels all pending responses for user)',
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				'[user] - Cancel all pending responses for a user',
				'[user] [form_id] - Cancel a specific pending response'
			],
			permissions: ['ManageGuild']
		});
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		const user = ctx.options.getUser('user');
		const formId = ctx.options.getString('form_id')?.toLowerCase().trim();
		
		// Fetch the guild member to ensure we have member data
		let member;
		try {
			member = await ctx.guild.members.fetch(user.id);
		} catch (error) {
			return `Could not find member ${user.displayName || user.username} in this server.`;
		}

		try {
			// Get all pending responses for the user
			let pendingResponses = [];
			
			if (formId) {
				// Check for specific form
				const form = await this.#stores.forms.get(ctx.guildId, formId);
				if (!form.id) return 'Form not found!';
				
				const hasPending = await this.#stores.responses.hasPendingResponse(ctx.guildId, user.id, formId);
				if (!hasPending) {
					return `No pending responses found for ${user.displayName} on form **${form.name}**.`;
				}
				
				// Get the specific pending response
				const response = await this.#stores.responses.getPendingResponse(ctx.guildId, user.id, formId);
				if (response) {
					pendingResponses.push({ response, form });
				}
			} else {
				// Get all pending responses for user across all forms
				pendingResponses = await this.#stores.responses.getAllPendingByUser(ctx.guildId, user.id);
			}

			if (pendingResponses.length === 0) {
				return `No pending responses found for ${user.displayName}.`;
			}

			// Confirm cancellation
			const formsList = pendingResponses.map(({form}) => `• **${form.name}** (${form.hid})`).join('\n');
			const content = `Are you sure you want to cancel ${pendingResponses.length} pending response${pendingResponses.length > 1 ? 's' : ''} for ${user.displayName}?\n\n${formsList}\n\n**WARNING:** This will permanently delete the response data.`;

			const reply = await ctx.reply({
				content,
				components: [{
					type: 1,
					components: clearBtns
				}],
				ephemeral: true,
				fetchReply: true
			});

			const conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
			if (conf.msg) {
				return conf.msg;
			}

			// Delete the pending responses
			let deletedCount = 0;
			for (const {response} of pendingResponses) {
				try {
					await response.delete();
					deletedCount++;
				} catch (e) {
					console.error(`Failed to delete response ${response.hid}: ${e.message}`);
				}
			}

			if (deletedCount === pendingResponses.length) {
				return `Successfully cancelled ${deletedCount} pending response${deletedCount > 1 ? 's' : ''} for ${user.displayName}. They can now submit new applications.`;
			} else {
				return `Cancelled ${deletedCount}/${pendingResponses.length} pending responses for ${user.displayName}. Some responses may not have been deleted due to errors.`;
			}

		} catch (error) {
			console.error('Error cancelling pending response:', error);
			return 'An error occurred while cancelling the pending response. Please try again.';
		}
	}

	async auto(ctx) {
		const forms = await this.#stores.forms.getAll(ctx.guild.id);
		const foc = ctx.options.getFocused();
		if (!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		const focusedLower = foc.toLowerCase();

		if (!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(focusedLower) ||
			f.name.toLowerCase().includes(focusedLower) ||
			f.description.toLowerCase().includes(focusedLower)
		).map(f => ({
			name: f.name,
			value: f.hid
		}));
	}
}

module.exports = (bot, stores) => new Command(bot, stores);