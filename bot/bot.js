require('dotenv').config();

const {
	Client,
	GatewayIntentBits: Intents,
	Partials,
	Options
} = require("discord.js");
const {
	FrameClient,
	Utilities,
	Handlers
} = require('frame');
const fs = require("fs");
const path = require("path");
const logger = require('../common/logger');

const bot = new FrameClient({
	intents: [
		Intents.Guilds,
		Intents.GuildMessages,
		Intents.GuildMessageReactions,
		Intents.GuildMembers,
		Intents.DirectMessages,
		Intents.DirectMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Reaction
	],
	makeCache: Options.cacheWithLimits({
		MessageManager: 0,
		ThreadManager: 0
	})
}, {
	invite: process.env.INVITE,
	owner: process.env.OWNER,
	statuses: [
		(bot) => ({ name: `Slashcommands | in ${bot.guilds.cache.size} guilds!`, type: 2 }),
		//(bot) => ({ name: `Slashcommands | serving ${bot.users.cache.size} users!`, type: 2 })
	]
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/../common/stores');
	bot.db = db;
	bot.stores = stores;

	files = fs.readdirSync(__dirname + "/events");
	files.forEach(f => bot.on(f.slice(0,-3), (...args) => require(__dirname + "/events/"+f)(...args,bot)));

	bot.handlers = {};
	files = fs.readdirSync(__dirname + "/handlers");
	for(var f of files) {
		var n = f.slice(0, -3);
		if(n === 'interaction') {
			// Use custom interaction handler that supports ephemeral config
			bot.handlers[n] = require(__dirname + "/handlers/"+f)(bot, __dirname + '/../common/slashcommands')
		} else {
			bot.handlers[n] = require(__dirname + "/handlers/"+f)(bot)
		}
	}

	bot.utils = Utilities;
	var ut = require('./utils');
	bot.utils = Object.assign(bot.utils, ut);
}

bot.on("ready", async ()=> {
	logger.info(`Logged in as ${bot.user.tag} (${bot.user.id})`);
})

bot.on('error', (err)=> {
	logger.error(`Discord.js error: ${err.stack}`);
})

setup()
.then(async () => {
	try {
		await bot.login(process.env.TOKEN);
		logger.info('Bot setup completed successfully');
	} catch(e) {
		logger.error(`Trouble connecting: ${e}`);
	}
})
.catch(e => logger.error(`Setup error: ${e}`));