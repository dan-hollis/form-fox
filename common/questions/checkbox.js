const {
	numbers
} = require('../extras');
const logger = require('../logger');

module.exports = {
	description: 'allows the user to choose several options from multiple choices',
	alias: ['checkbox', 'check', 'cb'],

	embed(data) {
		let comps = [ ];
		let options = data.options.choices.map((c, i) => {
			return {
				label: c,
				value: `${i}`
			}
		})
		if(data.options.other) options.push({
			label: 'Other',
			description: 'Enter a custom response',
			value: 'OTHER'
		})

		comps.push(
			{
				type: 1,
				components: [{
					type: 3,
					custom_id: 'option-select',
					options,
					min_values: 1,
					max_values: options.length
				}]
			},
			{
				type: 9,
				components: [{
					type: 10,
					content: `Select an option above`
				}],
				accessory: {
					type: 2,
					style: 3,
					custom_id: 'finish-select',
					label: 'Finish Selection',
					emoji: { name: '✅' }
				}
			}
		)

		return comps;
	},

	setup: true,

	async handle({ prompt, response, question, data }) {
		var d = {}
		var embed = prompt.components[0].toJSON();
		if(['finish-select', 'finish'].includes(data)) {
			logger.debug(`Checkbox selection: ${response.selection}`);
			if(!response.selection?.length && question.required) {
				await msg.channel.send('Select something first!');
				return { response, send: false }
			}

			let answer = response.selection.join('\n');
			embed.components = embed.components.slice(0, embed.components.length - 2);
			embed.components.push({
				type: 10,
				content: `**Selected:**\n` + answer
			})

			response.answers.push(answer);
			await response.save();
			return {response, embed, send: true}
		} else {
			if(!Array.isArray(data)) data = [data];
			let vals = data.map(x => parseInt(x));
			let choices = vals.map(x => {
				if(isNaN(x)) return 'OTHER';
				else return question.options.choices[x]
			})

			if(choices.includes('OTHER')) {
				await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
				data.menu = true;
			}

			if(!response.selection) response.selection = [];
            response.selection = choices;
            logger.debug(`Checkbox choices: ${choices}, selection: ${response.selection}`);
            await response.save();

            return {response, menu: data.menu, send: false}
		}
	},

	async roleSetup({ctx, question, role}) {
		var choice = await ctx.client.utils.awaitSelection(ctx, question.options.choices.map((e, i) => {
			return {label: e.slice(0, 100), value: `${i}`}
		}), "What choice do you want to attach this to?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select choice'
		})
		if(typeof choice == 'string') return choice;

		var c = parseInt(choice[0]);
		choice = question.options.choices[c];

		return { choice };
	}
}