const { Handlers } = require('frame');
const axios = require('axios');

// Create a wrapper around the original InteractionHandler
function createCustomInteractionHandler(bot, path, sharded) {
	// Create the original handler
	const originalHandler = Handlers.InteractionHandler(bot, path, sharded);
	
	// Store the original handleCommand method
	const originalHandleCommand = originalHandler.handleCommand.bind(originalHandler);

	// Override the handleCommand method to add ephemeral config support
	originalHandler.handleCommand = async function(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var cfg;
		var usages;
		if(ctx.guild && ctx.client.stores?.configs) cfg = await ctx.client.stores.configs.get(ctx.guild.id);
		if(ctx.guild && ctx.client.stores?.usages) usages = await ctx.client.stores.usages.get(ctx.guild.id);

		// Store original reply methods
		const originalReply = ctx.reply;
		const originalFollowUp = ctx.followUp;
		const originalEditReply = ctx.editReply;

		// Override reply methods to use flags instead of ephemeral property
		const shouldBeEphemeral = cfg?.msg_ephemeral === true || cmd.ephemeral;

		ctx.reply = function(options) {
			if(typeof options === 'string') {
				options = { content: options };
			}
			if(shouldBeEphemeral) {
				const { MessageFlags } = require('discord.js');
				options.flags = options.flags || [];
				if(Array.isArray(options.flags)) {
					if(!options.flags.includes('Ephemeral')) {
						options.flags.push('Ephemeral');
					}
				} else {
					options.flags = [options.flags, 'Ephemeral'];
				}
				delete options.ephemeral; // Remove deprecated property
			}
			return originalReply.call(this, options);
		};

		ctx.followUp = function(options) {
			if(typeof options === 'string') {
				options = { content: options };
			}
			if(shouldBeEphemeral) {
				const { MessageFlags } = require('discord.js');
				options.flags = options.flags || [];
				if(Array.isArray(options.flags)) {
					if(!options.flags.includes('Ephemeral')) {
						options.flags.push('Ephemeral');
					}
				} else {
					options.flags = [options.flags, 'Ephemeral'];
				}
				delete options.ephemeral; // Remove deprecated property
			}
			return originalFollowUp.call(this, options);
		};

		ctx.editReply = function(options) {
			if(typeof options === 'string') {
				options = { content: options };
			}
			// Note: editReply doesn't support ephemeral changes after initial reply
			return originalEditReply.call(this, options);
		};

		// Override ephemeral setting if config enabled (for frame's internal handling)
		if(cfg?.msg_ephemeral === true) {
			cmd.ephemeral = true;
		}

		// Call the original method with the modified command and context
		return originalHandleCommand.call(this, ctx);
	}.bind(originalHandler);

	return originalHandler;
}

module.exports = createCustomInteractionHandler;