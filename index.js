const arg = require("minimist")(process.argv.slice(2));
const path = require("path");
const fs = require("fs");

let config = arg;
let envFile = path.join(__dirname, arg.e || arg.env || ".env");
let delays = [
	[0 * 1000, 5 * 1000, 5 * 60 * 1000, 0.5 * 1000],
	[5 * 1000, 10 * 1000, 10 * 60 * 1000, 1.5 * 1000],
	[10 * 1000, 20 * 1000, 20 * 60 * 1000, 2.5 * 1000],
	[20 * 1000, 40 * 1000, 40 * 60 * 1000, 5 * 1000],
	[5 * 1000, 15 * 1000, 30 * 60 * 1000, 2 * 1000],
];

try {
	require("dotenv").config({ path: envFile });
} catch {}

try {
	require("dotenv").config({ path: envFile });
} catch {}

try {
	// arg > env > conf
	let conf = require(path.join(__dirname, "config.json"));
	config.WEBSITE =
		arg.w ||
		process.env.CONF_WEBSITE ||
		conf.WEBSITE ||
		"https://github.com/uAliFurkanY/alibot-mc/"; // You probably shouldn't change this.
	config.HOST = arg.h || process.env.CONF_HOST || conf.HOST || "0b0t.org";
	config.USERNAME = arg.u || process.env.CONF_USERNAME || conf.USERNAME;
	config.PASSWORD = arg.p || process.env.CONF_PASSWORD || conf.PASSWORD;
	config.OP = arg.o || process.env.CONF_OP || conf.OP || "AliFurkan";
	config.MODE = arg.m || process.env.CONF_MODE || conf.MODE || "public";
	config.ACTIVE =
		arg.a || process.env.CONF_ACTIVE || conf.ACTIVE || "true";
	config.DELAYS =
		delays[+arg.d || +process.env.CONF_DELAYS || +conf.DELAYS || 4];
	config.LOGLEVEL =
		arg.l || process.env.CONF_LOGLEVEL || conf.LOGLEVEL || 4;
	config.PREFIX = arg.r || process.env.CONF_PREFIX || conf.PREFIX || ":";
} catch (e) {
	console.log(
		"This error should NEVER happen. If it did, you edited/deleted 'config.json'. If you didn't, create an Issue. If you did, just use setup.js."
	);
	console.log("Also provide this: ");
	console.log(e);
	process.exit(1);
}

const LOG_ERR = config.LOGLEVEL >= 1;
const LOG_STAT = LOG_ERR;
const LOG_INIT = config.LOGLEVEL >= 2;
const LOG_END = config.LOGLEVEL >= 3;
const LOG_KICK = LOG_END;
const LOG_SENT = config.LOGLEVEL >= 4;
const LOG_CMD = LOG_SENT;
const LOG_CHAT = config.LOGLEVEL >= 5;
const LOG_SLEEP = LOG_CHAT;

const isVarSet = () =>
	!!(
		config.HOST &&
		config.USERNAME &&
		config.OP &&
		config.MODE &&
		config.ACTIVE &&
		config.DELAYS
	);
if (!isVarSet()) {
	console.error("No configuration found, starting setup.");
	require("./setup");
	process.exit(0);
}
if (config.ACTIVE === "false") {
	process.exit(0);
}

const mineflayer = require("mineflayer");
const navigatePlugin = require("mineflayer-navigate")(mineflayer);
const tpsPlugin = require("mineflayer-tps")(mineflayer);
const readline = require("readline");
const Vec3 = require("vec3");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

let op = config.OP.split(",");
console.log("Operators: " + op);

let lastkill = Date.now();
let start = Date.now();
let username;
let bot;

let toSend = [];
let intervals = [
	setInterval(() => {
		if (toSend.length !== 0 && spawned) {
			bot.chat(toSend[0]);
			log("SENT " + toSend[0], LOG_SENT);
			toSend.shift();
		}
	}, config.DELAYS[3]),
];
let intervalNames = ["0: MAIN MESSAGE LOOP"];

let session = false;

let login = {
	host: config.HOST,
	username: config.USERNAME,
	password: config.PASSWORD,
	session: session,
};

let mode = config.MODE;
let prefix = config.PREFIX;
let spawned = false;

let logFile = fs.openSync("alibot-" + start + ".log", "w");
function log(message, logToFile, date = Date.now()) {
	let d1 = new Date(date);
	console.log(`[${d1.getHours()}:${d1.getMinutes()}] ` + message);

	if (logToFile) fs.writeSync(logFile, `${date} ` + message + "\n");
}

function send(msg = "/help") {
	toSend.push(msg);
}

function randStr(length) {
	let result = "";
	let characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength)
		);
	}
	return result;
}

function init(r) {
	spawned = false;
	log(`INIT ${r}`, LOG_INIT);
	bot = mineflayer.createBot(login);

	lastkill = Date.now();
	bot.once("spawn", () => main(bot));
	bot._client.once("session", () => {
		session = bot._client.session;
		login.session = session;
	});
	bot.on("end", () => {
		let tps;
		try {
			tps = bot.getTps();
		} catch {}
		log("END " + (tps !== undefined ? "TPS " + tps : ""), LOG_END);
		setTimeout(() => init("End"), config.DELAYS[1]);
	});
	bot.on("error", (m) => {
		if (m.message.includes("Invalid session.")) {
			session = false;
			init("Reloading Session");
		} else if (m.message.includes("Invalid credentials.")) {
			setTimeout(() => init("Error"), config.DELAYS[2]);
		} else {
			log("ERROR " + m.message, LOG_ERR);
		}
	});
}

function main(bot) {
	spawned = true;
	navigatePlugin(bot);
	tpsPlugin(bot);
	log("SPAWN", LOG_STAT);
	username = bot.player.username;
	if (!op.includes(username)) op.push(username);
	bot.chatAddPattern(
		/^[a-zA-Z0-9_]{3,16} wants to teleport to you\.$/,
		"tpa",
		"received tpa"
	);
	bot.on("tpa", (u, m) => {
		let user = m.extra[0].text;
		log("TPA " + user, LOG_CMD);
		if (op.includes(user) || mode !== "private") {
			send(`/tpy ${user}`);
		} else {
			send(`/tpn ${user}`);
		}
	});
	bot.on("chat", (u, m) => {
		m = m.trim();
		u = u.trim();
		//log(`CHAT <${u}> ${m}`, LOG_CHAT);
		if (m.startsWith(prefix)) {
			let cmd = m.substr(1).trim();
			let args = cmd.split(" ");
			let command = args.shift();
			let realCmd = true;

			switch (command) {
				case "say":
					if (op.includes(u) || mode !== "private") {
						send(`: ${u} » ${args.join(" ")}`);
					} else {
						send(`: Sorry, the mode is private.`);
					}
					break;
				case "sudo":
					if (op.includes(u)) {
						send(args.join(" "));
					} else {
						send(`: Sorry, you're not an operator.`);
					}
					break;
				case "kill":
					if (
						op.includes(u) ||
						(Date.now() >= lastkill + 15 * 1000 &&
							mode !== "private")
					) {
						send(`/kill`);
					} else if (mode === "private") {
						send(`: Sorry, the mode is private.`);
					} else {
						send(`: Wait 15 seconds.`);
					}
					break;
				case "disord":
					send(": https://discord.gg/gr8y8hY");
					break;
				case "help":
				case "github":
					send(": https://github.com/uAliFurkanY/alibot-v2/");
					break;
				case "ping":
					if (args.length >= 1) {
						bot.players[args[0]]
							? send(
									`: ${args[0]}'s ping is ${
										bot.players[args[0]].ping
									}ms.`
							  )
							: send(`: Player not found.`);
					} else {
						send(`: Your ping is ${bot.players[u].ping}ms.`);
					}
					break;
				case "op":
					if (op.includes(u) && args.length >= 1) {
						op.push(args[0]);
						send(`: Opped ${args[0]}.`);
					} else {
						send(`: The operators are ${op.join(", ")}.`);
					}
					break;
				case "goto":
					if (op.includes(u)) {
						let coords = args.map(
							(x, i) => parseInt(x) || (i === 1 ? 5 : 0)
						);
						bot.navigate.to(
							new Vec3(coords[0], coords[1], coords[2])
						);
						send(`: Going to ${coords.join(" ")}.`);
					} else {
						send(`: Sorry, you're not an operator.`);
					}
					break;
				case "stopGoto":
					if (op.includes(u)) {
						send(": Stopping...");
						bot.navigate.stop();
					} else {
						send(`: Sorry, you're not an operator.`);
					}
					break;
				case "tps":
					send(`: The current tick rate is ${bot.getTps()} TPS.`);
					break;
				case "mode":
					if (op.includes(u) && args.length >= 1) {
						send(`: Changing the mode to ${args[0]}.`);
						mode = args[0];
					} else {
						send(`: The current mode is ${mode}`);
					}
					break;
				case "coords":
					if (op.includes(u) || mode !== "private") {
						send(
							`: My coordinates are: ${bot.player.entity.position.x} ${bot.player.entity.position.y} ${bot.player.entity.position.z}.`
						);
					} else {
						send(`: Sorry, the mode is private.`);
					}
					break;
				default:
					realCmd = false;
					break;
			}
			if (realCmd) log(`CMD ${u} ${cmd}`, LOG_CMD);
		}
	});
	bot.navigate.on("pathFound", function () {
		send(`: Found path.`);
	});
	bot.navigate.on("cannotFind", function (closestPath) {
		send(`: Cannot find path. Getting as close as possible.`);
		bot.navigate.walk(closestPath);
	});
	bot.navigate.on("arrived", function () {
		send(": Arrived.");
	});
	bot.navigate.on("interrupted", function () {
		send(`: Got interrupted. Stopping...`);
	});
}

init("FIRST");

rl.on("line", send);
