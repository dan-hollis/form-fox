const { Models: { DataStore, DataObject } } = require('frame');
const logger = require('../logger');

const KEYS = {
	id: { },
	server_id: { },
	response_channel: { patch: true },
	message: { patch: true },
	reacts: { patch: true },
	embed: { patch: true },
	opped: { patch: true },
	ticket_category: { patch: true },
	ticket_message: { patch: true },
	ticket_roles: { patch: true },
	autodm: { patch: true },
	autothread: { patch: true },
	msg_ephemeral: { patch: true }
}

class Config extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		
		// Parse JSONB fields that come as strings from the database
		if(this.ticket_roles && typeof this.ticket_roles === 'string') {
			try {
				this.ticket_roles = JSON.parse(this.ticket_roles);
			} catch(e) {
				this.ticket_roles = [];
			}
		}
		
		if(this.opped && typeof this.opped === 'string') {
			try {
				this.opped = JSON.parse(this.opped);
			} catch(e) {
				this.opped = { users: [], roles: [] };
			}
		}
	}
}

class ConfigStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS configs (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			response_channel 	TEXT,
			message 			TEXT,
			reacts 				BOOLEAN,
			embed 				BOOLEAN,
			opped 				JSONB,
			ticket_category 	TEXT,
			ticket_message		TEXT,
			ticket_roles		JSONB,
			autodm 				TEXT,
			autothread			BOOLEAN,
			msg_ephemeral		BOOLEAN
		)`)
		
		// Add msg_ephemeral column if it doesn't exist (for existing databases)
		try {
			await this.db.query('ALTER TABLE configs ADD COLUMN IF NOT EXISTS msg_ephemeral BOOLEAN')
		} catch(e) {
			// Column likely already exists, ignore error
		}
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO configs (
				server_id,
				response_channel,
				message,
				reacts,
				embed,
				opped,
				ticket_category,
				ticket_message,
				autodm,
				autothread,
				msg_ephemeral
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			RETURNING id`,
			[data.server_id, data.response_channel,
			 data.message, data.reacts ?? true,
			 data.embed ?? true, data.opped ?? {roles: [], users: []}, data.ticket_category,
			 data.ticket_message, data.autodm, data.autothread, data.msg_ephemeral]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, data = {}) {
		try {
			await this.db.query(`INSERT INTO configs (
				server_id,
				response_channel,
				message,
				reacts,
				embed,
				opped,
				ticket_category,
				ticket_message,
				autodm,
				autothread,
				msg_ephemeral
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			[server, data.response_channel,
			 data.message, data.reacts ?? true,
			 data.embed ?? true, data.opped ?? {roles: [], users: []}, data.ticket_category,
			 data.ticket_message, data.autodm, data.autothread, data.msg_ephemeral]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE server_id = $1`,[server]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE id = $1`,[id]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			// Handle JSONB fields by stringifying them
			var processedData = {};
			for(let [key, value] of Object.entries(data)) {
				if(key === 'ticket_roles' || key === 'opped') {
					processedData[key] = JSON.stringify(value);
				} else {
					processedData[key] = value;
				}
			}
			
			await this.db.query(`UPDATE configs SET ${Object.keys(processedData).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(processedData)]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM configs WHERE id = $1`, [id]);
		} catch(e) {
			logger.error(`config store error: ${e.message}`);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new ConfigStore(bot, db);