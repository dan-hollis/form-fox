// Add ticket_roles column to forms and configs tables

module.exports = async (bot, db) => {
	// Check if ticket_roles column already exists in forms table
	var formsColumns = await db.query(`
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = 'forms' AND column_name = 'ticket_roles'
	`);
	
	if(formsColumns.rows.length === 0) {
		await db.query(`
			ALTER TABLE forms 
			ADD COLUMN ticket_roles JSONB DEFAULT '[]'::jsonb
		`);
		console.log('Added ticket_roles column to forms table');
	}

	// Check if ticket_roles column already exists in configs table  
	var configsColumns = await db.query(`
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = 'configs' AND column_name = 'ticket_roles'
	`);
	
	if(configsColumns.rows.length === 0) {
		await db.query(`
			ALTER TABLE configs 
			ADD COLUMN ticket_roles JSONB DEFAULT '[]'::jsonb
		`);
		console.log('Added ticket_roles column to configs table');
	}
}; 