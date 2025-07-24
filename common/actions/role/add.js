const { ChannelType } = require('discord.js');

module.exports = {
	name: 'add',
	description: 'Add roles to a member',
	events: ['APPLY', 'SUBMIT', 'ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { inter, client } = ctx;

		var select = await client.utils.awaitRoleSelection(inter, [], "Select the roles you want to add to the user", {
			min_values: 0,
			max_values: 5,
			placeholder: "Select roles..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		data.roles = select;
		console.log(data.roles);

		return { success: true, data}
	},

	async handler(ctx) {
		var { member, action, guild } = ctx;

		// Check bot permissions before attempting role assignment
		var botMember = await guild.members.fetch(guild.client.user.id);
		if(!botMember.permissions.has('ManageRoles')) {
			throw new Error('Bot missing "Manage Roles" permission');
		}

		// Check role hierarchy - bot's highest role must be above target roles
		var botHighestRole = botMember.roles.highest;
		for(var roleId of action.data.roles) {
			var targetRole = guild.roles.cache.get(roleId);
			if(!targetRole) continue;
			
			if(targetRole.position >= botHighestRole.position) {
				throw new Error(`Role "${targetRole.name}" is higher than or equal to bot's highest role in hierarchy`);
			}
		}

		await member.roles.add(action.data.roles);
	},

	transform(data, ctx) {
		data = {...data, ...data.data };

		var fields = [];
		fields.push({
			type: 10,
			content: `### Type\n${data.type}`
		})

		fields.push({
			type: 10,
			content: `### Event\n${data.event}`
		})

		fields.push({
			type: 10,
			content:
				`### Roles added\n` +
				data.roles.map(x => `<@&${x}>`).join(", ")
		})

		return fields;
	}
}