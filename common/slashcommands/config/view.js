const { Models: { SlashCommand } } = require('frame');
const logger = require('../../logger');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: 'View all current global configuration settings',
			usage: [
				'- Display all current global configuration settings'
			],
			guildOnly: true,
			permissions: ['ManageMessages'],
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		
		// Fetch additional details for display
		var responseChannel = cfg.response_channel ? 
			await ctx.guild.channels.fetch(cfg.response_channel).catch(() => null) : null;
		
		var autodmForm = cfg.autodm ? 
			await this.#stores.forms.get(ctx.guild.id, cfg.autodm).catch(() => null) : null;
		
		var ticketCategory = cfg.ticket_category ? 
			await ctx.guild.channels.fetch(cfg.ticket_category).catch(() => null) : null;

		// Build configuration display
		var configSections = [];
		
		// Basic Settings Section
		var responseChannelText = 'Not set';
		if(cfg.response_channel) {
			if(responseChannel) {
				responseChannelText = `<#${responseChannel.id}>`;
			} else {
				responseChannelText = `${cfg.response_channel} (channel may not exist)`;
			}
		}
		
		configSections.push({
			type: 10,
			content: 
				'## Basic Settings\n' +
				`**Response Channel:** ${responseChannelText}\n` +
				`**Default Accept Message:** ${cfg.message || 'Not set'}`
		});

		// Form Behavior Section  
		configSections.push({
			type: 10,
			content:
				'## Form Behavior\n' +
				`**Remove User Reactions:** ${cfg.reacts !== false ? 'Enabled' : 'Disabled'}\n` +
				`**Send Info Embed:** ${cfg.embed !== false ? 'Enabled' : 'Disabled'}\n` +
				`**Auto-threading:** ${cfg.autothread === true ? 'Enabled' : 'Disabled'}\n` +
				`**Ephemeral Messages:** ${cfg.msg_ephemeral === true ? 'Enabled' : 'Disabled'}\n` +
				`**Auto-DM Form:** ${autodmForm && autodmForm.id ? `${autodmForm.name} (${autodmForm.hid})` : cfg.autodm ? `${cfg.autodm} (form may not exist)` : 'Not set'}`
		});

		// Ticket Settings Section
		var ticketRolesText = 'Not set';
		if(cfg.ticket_roles && cfg.ticket_roles.length > 0) {
			ticketRolesText = cfg.ticket_roles.map(r => `<@&${r}>`).join(', ');
		}
		
		// Handle ticket category display
		var ticketCategoryText = 'Not set';
		if(cfg.ticket_category) {
			if(ticketCategory) {
				ticketCategoryText = `<#${ticketCategory.id}>`;
			} else {
				ticketCategoryText = `${cfg.ticket_category} (channel may not exist)`;
			}
		}
		
		configSections.push({
			type: 10, 
			content:
				'## Ticket Settings\n' +
				`**Ticket Category:** ${ticketCategoryText}\n` +
				`**Ticket Message:** ${cfg.ticket_message || 'Not set'}\n` +
				`**Ticket Roles:** ${ticketRolesText}`
		});

		// Permissions Section
		var opsText = 'None';
		if(cfg.opped && (cfg.opped.users?.length > 0 || cfg.opped.roles?.length > 0)) {
			var opsLines = [];
			if(cfg.opped.users?.length > 0) {
				opsLines.push(`**Users:** ${cfg.opped.users.map(u => `<@${u.id}>`).join(', ')}`);
			}
			if(cfg.opped.roles?.length > 0) {
				opsLines.push(`**Roles:** ${cfg.opped.roles.map(r => `<@&${r.id}>`).join(', ')}`);
			}
			opsText = opsLines.join('\n');
		}
		
		configSections.push({
			type: 10,
			content:
				'## Permissions\n' +
				`**Opped Users & Roles:**\n${opsText}`
		});

		return [{
			components: [{
				type: 17,
				accent_color: 0xee8833,
				components: [
					{
						type: 10,
						content: '# Global Configuration Settings'
					},
					...configSections,
					{
						type: 14,
						spacing: 2
					},
					{
						type: 10,
						content: 
							'*Use `/config <setting>` commands to modify these values*\n' +
							'*Use `/config perms view` for detailed permission information*'
					}
				]
			}]
		}];
	}
}

module.exports = (bot, stores) => new Command(bot, stores); 