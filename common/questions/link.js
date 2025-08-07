module.exports = {
	description: 'requires the user to provide a valid URL link',
	text: 'valid URL required.',
	alias: ['link', 'url', 'website'],

	embed(data) {
		var content = '-# Requires a valid URL link';
		if(data.options?.requiredDomain) {
			content += ` from ${data.options.requiredDomain}`;
		}
		return [{
			type: 10,
			content: content
		}];
	},

	async handle({ prompt, response, data, question }) {
		var answer = data.content?.trim() || '';
		
		if (!answer) {
			await prompt.channel.send('Invalid response! Please provide a URL');
			return;
		}



		// Validate URL format first
		let url;
		let originalAnswer = answer;
		
		try {
			// Try to create URL object
			if (!answer.startsWith('http://') && !answer.startsWith('https://')) {
				url = new URL('https://' + answer);
				answer = 'https://' + answer; // Update the answer with the protocol
			} else {
				url = new URL(answer);
			}
			
			// Basic validation - must have valid protocol and hostname
			if (!(url.protocol === 'http:' || url.protocol === 'https:') || !url.hostname) {
				throw new Error('Invalid URL format');
			}
		} catch (e) {
			if(question.options?.requiredDomain) {
				await prompt.channel.send(`Invalid response! Please provide a valid URL from ${question.options.requiredDomain} (e.g., https://${question.options.requiredDomain}/something)`);
			} else {
				await prompt.channel.send('Invalid response! Please provide a valid URL (e.g., https://example.com or example.com)');
			}
			return;
		}

		// Check domain restriction if specified
		if(question.options?.requiredDomain) {
			const hostname = url.hostname.toLowerCase();
			const requiredDomain = question.options.requiredDomain.toLowerCase();
			
			// Check if hostname matches required domain or is a subdomain of it
			const isValidDomain = hostname === requiredDomain || hostname.endsWith('.' + requiredDomain);
			
			if (!isValidDomain) {
				await prompt.channel.send(`Invalid response! The URL must be from ${requiredDomain} (e.g., https://${requiredDomain}/something)`);
				return;
			}
		}

		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: answer
		};

		response.answers.push(answer);
		return {response, send: true, embed};
	}
}
