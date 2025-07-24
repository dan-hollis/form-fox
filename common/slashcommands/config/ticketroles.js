const { Models: { SlashCommand } } = require('frame');
const logger = require('../../logger');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'ticketroles',
			description: 'Set which roles can access ticket channels',
			ephemeral: true,
			options: [
				{
					name: 'roles',
					description: 'The roles that should have access to tickets (leave empty to view current)',
					type: 3,
					required: false
				},
				{
					name: 'form_id',
					description: "ID of a form to change (leave empty for server default)",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- View current ticket roles configuration",
				"[roles] - Set the default ticket roles for all forms (mention roles separated by spaces)",
				"[roles] [form_id] - Set the ticket roles for a specific form"
			],
			extra: "Roles should be mentioned like @Role1 @Role2 or you can use role IDs. " +
				   "These roles will be able to view and manage ticket channels created for form responses. " +
				   "Only these specified roles and the form submitter will have access to tickets.",
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var rolesInput = ctx.options.getString('roles');
		var farg = ctx.options.getString('form_id')?.toLowerCase().trim();
		
		if(farg) {
			// Form-specific configuration
			var form = await this.#stores.forms.get(ctx.guildId, farg);
			if(!form.id) return 'Form not found!';

			if(!rolesInput) {
				// Show current form ticket roles
				var currentRoles = form.ticket_roles || [];
				if(!currentRoles.length) {
					return `**${form.name}** has no specific ticket roles set. It will use the server default.`;
				}
				
				return `**${form.name}** ticket roles: ${currentRoles.map(r => `<@&${r}>`).join(', ')}`;
			}

			// Set form ticket roles
			var roleIds = this.extractRoleIds(rolesInput, ctx.guild);
			if(!roleIds.length) {
				form.ticket_roles = [];
				await form.save();
				return `Cleared ticket roles for **${form.name}**. It will now use the server default.`;
			}

			form.ticket_roles = roleIds;
			await form.save();
			return `Updated ticket roles for **${form.name}**: ${roleIds.map(r => `<@&${r}>`).join(', ')}`;
		} else {
			// Server-wide configuration
			var cfg = await this.#stores.configs.get(ctx.guildId);
			
			if(!rolesInput) {
				// Show current server ticket roles
				var currentRoles = cfg.ticket_roles || [];
				if(!currentRoles.length) {
					return 'No default ticket roles set. Only the form submitter will have access to tickets.';
				}
				
				return `Default ticket roles: ${currentRoles.map(r => `<@&${r}>`).join(', ')}`;
			}

			// Set server ticket roles
			var roleIds = this.extractRoleIds(rolesInput, ctx.guild);
			cfg.ticket_roles = roleIds;
			await cfg.save();
			
			if(!roleIds.length) {
				return 'Cleared default ticket roles. Only the form submitter will have access to tickets.';
			}
			
			return `Updated default ticket roles: ${roleIds.map(r => `<@&${r}>`).join(', ')}`;
		}
	}

	extractRoleIds(input, guild) {
		var roleIds = [];
		
		// Extract role mentions and IDs
		var matches = input.match(/<@&(\d+)>|\b(\d{17,19})\b/g);
		if(matches) {
			for(var match of matches) {
				var id = match.replace(/<@&|>/g, '');
				var role = guild.roles.cache.get(id);
				if(role && !roleIds.includes(id)) {
					roleIds.push(id);
				}
			}
		}
		
		return roleIds;
	}

	async auto(ctx) {
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores); 