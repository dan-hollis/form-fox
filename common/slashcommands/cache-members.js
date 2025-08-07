const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'cache-members',
			description: 'Force cache all server members (admin only)',
			permissions: ['Administrator'],
			guildOnly: true,
			ephemeral: true
		});
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		try {
			await ctx.deferReply();
			
			const guild = ctx.guild;
			const memberCount = guild.memberCount;
			
			// Force fetch all members
			const members = await guild.members.fetch();
			
			return `Successfully cached ${members.size}/${memberCount} members. User commands should now show all members.`;
		} catch (error) {
			console.error('Error caching members:', error);
			return 'Failed to cache members. Make sure the bot has proper permissions and the Server Members Intent is enabled.';
		}
	}
}

module.exports = (bot, stores) => new Command(bot, stores);