const max = require('max-api');
const fs = require("fs");
// const http = require("http");
// const path = require("path");
// const url = require("url");
const axios = require('axios');

//const sdapiurl = "http://127.0.0.1";
const SDAPIURL = "http://192.168.0.61";
const SDAPIPORT = "7860";
const VERBOSE = true;

max.post("hello sdweb-max");

let payload = { };
init();

function init() {
	payload = {
		"prompt" : "two cats",
		"steps" : 5,
		"width" : 512,
		"height" : 512
	}
}

function writeBinaryImagesToDisk(base64_images) {
	let img = Buffer.from(base64_images[0], 'base64');
	fs.writeFile(`temp.png`, img, err => {
		if (err) max.post(err)

		max.outlet("write", "saved")
	});
}

const handlers = {

reset: () => {
	init();
	if(VERBOSE) max.post(payload);
},

[max.MESSAGE_TYPES.BANG]: () => {
	axios
		.post(`${SDAPIURL}:${SDAPIPORT}/sdapi/v1/txt2img`, payload)
		.then((response) => {
			writeBinaryImagesToDisk(response.data.images);
			//max.post(response.data.parameters);
		})
		.catch((error) => {
			max.post(error);
		});
},

[max.MESSAGE_TYPES.ALL]: (handled, ...args) => {
	//max.post(`The following inlet event was ${!handled ? "not " : "" }handled`);
	//max.post(args);
	if(!handled && args.length == 2) {
		payload[args[0]] = args[1];
		if(VERBOSE) max.post(payload);
	}
}

};

max.addHandlers(handlers);
