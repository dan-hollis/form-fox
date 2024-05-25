const { confBtns } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'delete',
			description: "Deletes a form",
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"[form_id] - Delete a form"
			],
			permissions: ['ManageMessages'],
			opPerms: ['DELETE_FORMS'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id')?.value.toLowerCase().trim();
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
		if(!forms?.length) return "No forms to delete!";
		if(id) forms = forms.filter(x => x.hid == id);
		if(!forms[0]?.id) return 'Form not found!';

		var content = (
			forms.length > 1 ?
			"Are you **sure** you want to delete **ALL** forms?\n**WARNING:** All response data stored for these forms will be lost! **This can't be undone!**" :
			"Are you **sure** you want to delete this form?\n**WARNING:** All response data stored for this form will be lost! **This can't be undone!**"
		)

		var rdata = {
			content,
			components: [
				{
					type: 1,
					components: confBtns
				}
			]
		}
		await ctx.reply(rdata);

		var reply = await ctx.fetchReply();
		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		if(conf.msg) return conf.msg;

		for(var f of forms) {
			await f.delete()
		}

		return `Form${forms.length == 1 ? '' : 's'} deleted!`;
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