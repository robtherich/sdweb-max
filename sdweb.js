const max = require('max-api');
const fs = require("fs");
const axios = require('axios');
const resolve = require('path').resolve

const SDURL = "http://127.0.0.1";
//const SDURL = "http://192.168.0.61";
const SDPORT = "7860";
const VERBOSE = false;

max.post("hello sdweb-max");

let payload = { };
let frameindex = 0;
let savepath = "./output";
let saveprefix = "sdwebframe";

let sendimage = false;

init();

function init() {
	payload = {
		"prompt" : "two cats",
		"steps" : 5,
		"width" : 512,
		"height" : 512
	};
	sendimage = false;
}

function writeBinaryImageToDisk(base64_image) {
	let img = Buffer.from(base64_image, 'base64');
	let fullpath = resolve(`${savepath}/${saveprefix}_${frameindex++}.png`)
	fs.writeFile(fullpath, img, err => {
		if (err) max.post(err)
		max.outlet("write", fullpath, (err ? 0 : 1));
	});
}

function sendPayload() {
	let apipath = (sendimage ? "sdapi/v1/img2img" : "sdapi/v1/txt2img");
	axios
		.post(`${SDURL}:${SDPORT}/${apipath}`, payload)
		.then((response) => {
			writeBinaryImageToDisk(response.data.images[0]);
			//max.post(response.data.parameters);
		})
		.catch((error) => {
			max.post(error);
		});

}

function scriptArgsExample () {
	//is_enabled, codec, interpolation, duration, skip_steps, debug, run_incomplete, tmp_delete, out_create, tmp_path, out_path
	if(true) {
		let scriptargs = {
			"Steps animation" : { "args" : [
			true,
			"x264",
			"mci",
			5,
			0,
			false, 
			false,
			false,
			true,
			"intermediate",
			"animation"
			]}
		};
		payload["alwayson_scripts"] = scriptargs;
	}
	else {
		payload["alwayson_scripts"] = {};
	}
	if(VERBOSE) max.post(payload);
}

const handlers = {

reset: () => {
	init();
	if(VERBOSE) max.post(payload);
},

pnginfo: (path) => {
	var b64img = "data:image/png;base64," + fs.readFileSync(path, 'base64');
	//max.post(b64img);
	let pngpayload = {
		"image" : b64img
	};
	axios
		.post(`${SDURL}:${SDPORT}/sdapi/v1/png-info`, pngpayload)
		.then((response) => {
			if(VERBOSE) max.post(response.data.info);
			max.outlet("pnginfo", response.data.info);
		})
		.catch((error) => {
			max.post(error);
		});
},

progress: () => {
	axios
		.get(`${SDURL}:${SDPORT}/sdapi/v1/progress`)
		.then(function (response) {
			//console.log(response.data);
			if(response.data.current_image) {
				writeBinaryImageToDisk(response.data.current_image);
			}
		})
		.catch(function (error) {
			max.post(error);
		})
		.finally(function () {
			//max.post("finally");
		});
},

upscale: (path, factor) => {
	var b64img = "data:image/png;base64," + fs.readFileSync(path, 'base64');
	let pngpayload = {
		"image" : b64img,
		"resize_mode" : 0,
		"upscaling_resize" : Math.min(Math.max(factor, 1), 8)
	};
	max.post(pngpayload);

	axios
		.post(`${SDURL}:${SDPORT}/sdapi/v1/extra-single-image`, pngpayload)
		.then((response) => {
			if(response.data.image) {
				max.post("recieved upscale response");
				writeBinaryImageToDisk(response.data.image);
			}
		})
		.catch((error) => {
			max.post(error);
		});	
},

img: (path ) => {
	var b64img = "data:image/png;base64," + fs.readFileSync(path, 'base64');
	payload["init_images"] = [ b64img ];
	sendimage = true;
},

clearimg: () => {
	sendimage = false;
	payload["init_images"] = {};
},

[max.MESSAGE_TYPES.BANG]: () => {
	sendPayload();
	max.outlet("payload", payload);
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
