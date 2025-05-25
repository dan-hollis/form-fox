const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: "View a form's existing hooks",
			type: 1,
			options: [{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			}],
			usage: [
				"[form_id] - View hooks on a form"
			],
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var hooks = await this.#stores.hooks.getByForm(ctx.guildId, form.hid);
		if(!hooks?.[0]) return "No hooks for that form!";

		return hooks.map(h => {
			return {
				components: [{
					type: 17,
					components: [
						{
							type: 10,
							content: `## Hook ${h.hid}\nBelongs to form ${form.hid}`
						},
						{
							type: 10,
							content:
								`**URL:** ${h.url}\n` +
								`**Events:** ${h.events.join(', ')}`
						},
					]
				}]
			}
		})
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