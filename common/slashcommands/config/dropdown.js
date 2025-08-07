const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'dropdown',
			description: 'Configure custom dropdown options for form responses',
			ephemeral: true,
			options: [
				{
					name: 'action',
					description: 'Action to perform',
					type: 3,
					required: true,
					choices: [
						{
							name: 'view',
							value: 'view'
						},
						{
							name: 'reset',
							value: 'reset'
						},
						{
							name: 'add-accept',
							value: 'add_accept'
						},
						{
							name: 'add-deny',
							value: 'add_deny'
						},
						{
							name: 'edit',
							value: 'edit'
						},
						{
							name: 'reorder',
							value: 'reorder'
						},
						{
							name: 'remove',
							value: 'remove'
						}
					]
				}
			],
			usage: [
				'view - View current dropdown configuration',
				'reset - Reset to default dropdown options',
				'add-accept - Add a new accept option',
				'add-deny - Add a new deny option',
				'edit - Edit an existing option',
				'reorder - Reorder existing options',
				'remove - Remove an existing option'
			],
			extra: 'Customize the dropdown options that appear when moderators accept/deny form responses. ' +
				   'You can create custom acceptance and denial reasons that fit your server\'s needs.',
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_CONFIG'],
			guildOnly: true
		});
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var action = ctx.options.getString('action');
		var cfg = await this.#stores.configs.get(ctx.guild.id);

		switch(action) {
			case 'view':
				return await this.viewConfig(cfg);
			case 'reset':
				return await this.resetConfig(ctx, cfg);
			case 'add_accept':
				return await this.addOption(ctx, cfg, 'accept');
			case 'add_deny':
				return await this.addOption(ctx, cfg, 'deny');
			case 'edit':
				return await this.editOption(ctx, cfg);
			case 'reorder':
				return await this.reorderOptions(ctx, cfg);
			case 'remove':
				return await this.removeOption(ctx, cfg);
		}
	}

	async viewConfig(cfg) {
		var dropdownOptions = cfg.dropdown_options || this.getDefaultOptions();
		
		var acceptOptions = dropdownOptions.filter(opt => opt.value.startsWith('accept_'));
		var denyOptions = dropdownOptions.filter(opt => opt.value.startsWith('deny_'));

		var content = '# Current Dropdown Configuration\n\n';
		
		content += '## Accept Options\n';
		acceptOptions.forEach(opt => {
			content += `**${opt.label}** ${opt.emoji?.name || ''}\n`;
			content += `- Value: \`${opt.value}\`\n`;
			content += `- Description: ${opt.description}\n\n`;
		});

		content += '## Deny Options\n';
		denyOptions.forEach(opt => {
			content += `**${opt.label}** ${opt.emoji?.name || ''}\n`;
			content += `- Value: \`${opt.value}\`\n`;
			content += `- Description: ${opt.description}\n\n`;
		});

		if(!cfg.dropdown_options) {
			content += '\n*These are the default options. Use `/config dropdown set` to customize them.*';
		}

		return {
			embeds: [{
				color: 0x55aa55,
				description: content
			}]
		};
	}

	async resetConfig(ctx, cfg) {
		cfg.dropdown_options = null;
		await cfg.save();
		
		return 'Dropdown options reset to defaults! Use `/config dropdown view` to see the default options.';
	}

	async addOption(ctx, cfg, optionType) {
		// Get current options or defaults
		var currentOptions = cfg.dropdown_options || this.getDefaultOptions();
		
		// Show modal to create new option
		var modal = {
			title: `Add New ${optionType.charAt(0).toUpperCase() + optionType.slice(1)} Option`,
			custom_id: 'add_option_modal',
			components: [
				{
					type: 1,
					components: [{
						type: 4,
						custom_id: 'label',
						style: 1,
						label: 'Option Label',
						min_length: 1,
						max_length: 80,
						required: true,
						placeholder: `e.g., ${optionType === 'accept' ? 'Accept - Example' : 'Deny - Not Ready'}`
					}]
				},
				{
					type: 1,
					components: [{
						type: 4,
						custom_id: 'description',
						style: 1,
						label: 'Option Description',
						min_length: 1,
						max_length: 100,
						required: true,
						placeholder: 'Brief description of this option'
					}]
				},
				{
					type: 1,
					components: [{
						type: 4,
						custom_id: 'value_suffix',
						style: 1,
						label: 'Value Suffix (no spaces, lowercase)',
						min_length: 1,
						max_length: 20,
						required: true,
						placeholder: `e.g., ${optionType === 'accept' ? 'example' : 'not_ready'}`
					}]
				},
				{
					type: 1,
					components: [{
						type: 4,
						custom_id: 'emoji',
						style: 1,
						label: 'Emoji (optional)',
						min_length: 0,
						max_length: 10,
						required: false,
						placeholder: '✅ or leave empty'
					}]
				}
			]
		};

		try {
			var modalResponse = await this.#bot.utils.awaitModal(ctx, modal, ctx.user, true, 5 * 60_000);
			if(!modalResponse) return 'No input received, operation cancelled.';

			var label = modalResponse.fields.getTextInputValue('label');
			var description = modalResponse.fields.getTextInputValue('description');
			var valueSuffix = modalResponse.fields.getTextInputValue('value_suffix').toLowerCase().replace(/\s+/g, '_');
			var emoji = modalResponse.fields.getTextInputValue('emoji') || null;

			// Create new option
			var newOption = {
				label: label,
				value: `${optionType}_${valueSuffix}`,
				description: description
			};
			
			// Only add emoji if it exists
			if(emoji) {
				newOption.emoji = {name: emoji};
			}

			// Add to current options
			currentOptions.push(newOption);
			
			// Save to config
			cfg.dropdown_options = currentOptions;
			await cfg.save();

			await modalResponse.followUp({
				content: `✅ Added new ${optionType} option: **${label}**`,
				ephemeral: true
			});

			return `Option added successfully! Use \`/config dropdown view\` to see all options.`;

		} catch(error) {
			return 'Operation was cancelled or timed out.';
		}
	}

	async editOption(ctx, cfg) {
		// Get current options
		var currentOptions = cfg.dropdown_options || this.getDefaultOptions();
		
		// Check if there are any options to edit
		if(currentOptions.length === 0) {
			return 'No options available to edit. Use `/config dropdown add-accept` or `/config dropdown add-deny` to create options first.';
		}
		
		// Create choices for all current options
		var optionChoices = currentOptions.map((opt, index) => ({
			label: opt.label,
			value: index.toString(),
			description: opt.description
		}));
		
		try {
			// Create a select menu message
			const selectMenu = {
				content: 'Select the option you want to edit:',
				components: [{
					type: 1,
					components: [{
						type: 3,
						custom_id: 'edit_option_select',
						placeholder: 'Choose option to edit...',
						min_values: 1,
						max_values: 1,
						options: optionChoices
					}]
				}],
				ephemeral: true
			};

			const reply = await ctx.reply(selectMenu);
			
			// Wait for the selection
			const filter = (interaction) => {
				return interaction.customId === 'edit_option_select' && interaction.user.id === ctx.user.id;
			};

			const collector = reply.createMessageComponentCollector({
				filter,
				time: 30000,
				max: 1
			});

			return new Promise((resolve) => {
				collector.on('collect', async (selectInteraction) => {
					const optionIndex = parseInt(selectInteraction.values[0]);
					const optionToEdit = currentOptions[optionIndex];
					
					if (!optionToEdit) {
						await selectInteraction.update({
							content: 'Invalid option selected.',
							components: []
						});
						resolve('Invalid option selected.');
						return;
					}

					// Show modal with current values pre-filled
					const modal = {
						title: `Edit Option: ${optionToEdit.label}`,
						custom_id: 'edit_option_modal',
						components: [
							{
								type: 1,
								components: [{
									type: 4,
									custom_id: 'label',
									style: 1,
									label: 'Option Label',
									min_length: 1,
									max_length: 80,
									required: true,
									value: optionToEdit.label
								}]
							},
							{
								type: 1,
								components: [{
									type: 4,
									custom_id: 'description',
									style: 1,
									label: 'Option Description',
									min_length: 1,
									max_length: 100,
									required: true,
									value: optionToEdit.description
								}]
							},
							{
								type: 1,
								components: [{
									type: 4,
									custom_id: 'value_suffix',
									style: 1,
									label: 'Value Suffix (no spaces, lowercase)',
									min_length: 1,
									max_length: 20,
									required: true,
									value: optionToEdit.value.split('_').slice(1).join('_')
								}]
							},
							{
								type: 1,
								components: [{
									type: 4,
									custom_id: 'emoji',
									style: 1,
									label: 'Emoji (optional)',
									min_length: 0,
									max_length: 10,
									required: false,
									value: optionToEdit.emoji?.name || ''
								}]
							}
						]
					};

					try {
						await selectInteraction.showModal(modal);
						
						// Wait for modal submission
						const modalFilter = (interaction) => {
							return interaction.customId === 'edit_option_modal' && interaction.user.id === ctx.user.id;
						};

						const modalInteraction = await selectInteraction.awaitModalSubmit({
							filter: modalFilter,
							time: 5 * 60_000
						});

						const label = modalInteraction.fields.getTextInputValue('label');
						const description = modalInteraction.fields.getTextInputValue('description');
						const valueSuffix = modalInteraction.fields.getTextInputValue('value_suffix').toLowerCase().replace(/\s+/g, '_');
						const emoji = modalInteraction.fields.getTextInputValue('emoji') || null;

						// Determine if this is an accept or deny option based on current value
						const optionType = optionToEdit.value.startsWith('accept_') ? 'accept' : 'deny';

						// Update the option
						currentOptions[optionIndex] = {
							label: label,
							value: `${optionType}_${valueSuffix}`,
							description: description
						};
						
						// Only add emoji if it exists
						if (emoji) {
							currentOptions[optionIndex].emoji = {name: emoji};
						}
						
						// Save to config
						cfg.dropdown_options = currentOptions;
						await cfg.save();

						await modalInteraction.reply({
							content: `✅ Updated option: **${label}**\n\nUse \`/config dropdown view\` to see all options.`,
							ephemeral: true
						});

						resolve(`Option updated successfully! Use \`/config dropdown view\` to see all options.`);

					} catch (modalError) {
						await selectInteraction.followUp({
							content: 'Modal timed out or was cancelled.',
							ephemeral: true
						});
						resolve('Operation was cancelled or timed out.');
					}
				});

				collector.on('end', (collected) => {
					if (collected.size === 0) {
						resolve('Selection timed out.');
					}
				});
			});

		} catch(error) {
			return 'Operation was cancelled or timed out.';
		}
	}

	async reorderOptions(ctx, cfg) {
		// Get current options
		var currentOptions = cfg.dropdown_options || this.getDefaultOptions();
		
		// Check if there are enough options to reorder
		if(currentOptions.length < 2) {
			return 'You need at least 2 options to reorder them. Use `/config dropdown add-accept` or `/config dropdown add-deny` to create more options.';
		}
		
		// Create numbered choices for current options
		var optionChoices = currentOptions.map((opt, index) => ({
			label: `${index + 1}. ${opt.label}`,
			value: index.toString(),
			description: opt.description
		}));
		
		try {
			// Create initial message showing current order
			var orderContent = '**Current Order:**\n';
			currentOptions.forEach((opt, index) => {
				orderContent += `${index + 1}. **${opt.label}** ${opt.emoji?.name || ''}\n`;
			});
			orderContent += '\nSelect options **in the order you want them to appear** in the dropdown:';

			const selectMenu = {
				content: orderContent,
				components: [{
					type: 1,
					components: [{
						type: 3,
						custom_id: 'reorder_options_select',
						placeholder: 'Select options in your desired order...',
						min_values: currentOptions.length,
						max_values: currentOptions.length,
						options: optionChoices
					}]
				}],
				ephemeral: true
			};

			const reply = await ctx.reply(selectMenu);
			
			// Wait for the selection
			const filter = (interaction) => {
				return interaction.customId === 'reorder_options_select' && interaction.user.id === ctx.user.id;
			};

			const collector = reply.createMessageComponentCollector({
				filter,
				time: 60000, // 1 minute to make selection
				max: 1
			});

			return new Promise((resolve) => {
				collector.on('collect', async (selectInteraction) => {
					const selectedIndices = selectInteraction.values.map(val => parseInt(val));
					
					// Validate that all options were selected
					if (selectedIndices.length !== currentOptions.length) {
						await selectInteraction.update({
							content: 'Error: You must select all options to reorder them.',
							components: []
						});
						resolve('Error: You must select all options to reorder them.');
						return;
					}

					// Create new ordered array based on selection
					const reorderedOptions = selectedIndices.map(index => currentOptions[index]);
					
					// Show preview of new order
					var previewContent = '**New Order Preview:**\n';
					reorderedOptions.forEach((opt, index) => {
						previewContent += `${index + 1}. **${opt.label}** ${opt.emoji?.name || ''}\n`;
					});
					previewContent += '\nConfirm this new order?';

					const confirmButtons = [{
						type: 1,
						components: [
							{
								type: 2,
								style: 3,
								label: 'Confirm',
								custom_id: 'confirm_reorder',
								emoji: { name: '✅' }
							},
							{
								type: 2,
								style: 4,
								label: 'Cancel',
								custom_id: 'cancel_reorder',
								emoji: { name: '❌' }
							}
						]
					}];

					await selectInteraction.update({
						content: previewContent,
						components: confirmButtons
					});

					// Wait for confirmation
					const confirmFilter = (interaction) => {
						return ['confirm_reorder', 'cancel_reorder'].includes(interaction.customId) && 
							   interaction.user.id === ctx.user.id;
					};

					const confirmCollector = reply.createMessageComponentCollector({
						filter: confirmFilter,
						time: 30000,
						max: 1
					});

					confirmCollector.on('collect', async (confirmInteraction) => {
						if (confirmInteraction.customId === 'confirm_reorder') {
							// Save the new order
							cfg.dropdown_options = reorderedOptions;
							await cfg.save();

							await confirmInteraction.update({
								content: `✅ **Options reordered successfully!**\n\n${previewContent.split('\nConfirm')[0]}\n\nUse \`/config dropdown view\` to see the updated configuration.`,
								components: []
							});

							resolve('Options reordered successfully! Use `/config dropdown view` to see the updated configuration.');
						} else {
							await confirmInteraction.update({
								content: 'Reorder cancelled. No changes were made.',
								components: []
							});
							resolve('Reorder cancelled. No changes were made.');
						}
					});

					confirmCollector.on('end', (collected) => {
						if (collected.size === 0) {
							resolve('Confirmation timed out. No changes were made.');
						}
					});
				});

				collector.on('end', (collected) => {
					if (collected.size === 0) {
						resolve('Selection timed out. No changes were made.');
					}
				});
			});

		} catch(error) {
			return 'Operation was cancelled or timed out.';
		}
	}

	async removeOption(ctx, cfg) {
		// Get current options
		var currentOptions = cfg.dropdown_options || this.getDefaultOptions();
		
		// Check if there are any custom options to remove
		if(!cfg.dropdown_options || currentOptions.length <= 2) {
			return 'No custom options to remove. Use `/config dropdown view` to see current options.';
		}
		
		// Create choices for all current options
		var optionChoices = currentOptions.map((opt, index) => ({
			label: opt.label,
			value: index.toString(),
			description: opt.description
		}));
		
		try {
			var selectedOptions = await this.#bot.utils.awaitSelection(ctx, optionChoices, 
				'Select the option(s) to remove:', {
				min_values: 1,
				max_values: Math.min(optionChoices.length, 10), // Allow multiple selections
				placeholder: 'Choose option(s) to remove...'
			});

			if(!Array.isArray(selectedOptions)) {
				return selectedOptions; // Error message
			}

			// Get indices to remove (sort in descending order to remove from end first)
			var indicesToRemove = selectedOptions.map(val => parseInt(val)).sort((a, b) => b - a);
			var removedOptions = [];
			
			// Remove selected options
			for(var index of indicesToRemove) {
				if(index >= 0 && index < currentOptions.length) {
					removedOptions.push(currentOptions[index].label);
					currentOptions.splice(index, 1);
				}
			}
			
			// Save updated options
			cfg.dropdown_options = currentOptions.length > 0 ? currentOptions : null;
			await cfg.save();
			
			var removedList = removedOptions.map(label => `• ${label}`).join('\n');
			return `✅ Removed ${removedOptions.length} option(s):\n${removedList}\n\nUse \`/config dropdown view\` to see remaining options.`;

		} catch(error) {
			return 'Operation was cancelled or timed out.';
		}
	}




	getDefaultOptions() {
		return [
			{
				label: 'Accept',
				value: 'accept_approved',
				description: 'Accept the response',
				emoji: {name: '✅'}
			},
			{
				label: 'Deny',
				value: 'deny_rejected',
				description: 'Deny the response',
				emoji: {name: '❌'}
			}
		];
	}
}

module.exports = (bot, stores) => new Command(bot, stores);