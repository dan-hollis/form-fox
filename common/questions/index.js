const attachment = require('./attachment');
const checkbox = require('./checkbox');
const date = require('./date');
const image = require('./image');
const link = require('./link');
const multipleChoice = require('./multipleChoice');
const number = require('./number');
const text = require('./text');

module.exports = {
	att: attachment,
	cb: checkbox,
	dt: date,
	img: image,
	link: link,
	mc: multipleChoice,
	num: number,
	text
}