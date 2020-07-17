const arg = require("minimist")(process.argv.slice(2));
const path = require("path");
const fs = require("fs");

let config = arg;
let delays = [
	[0 * 1000, 5 * 1000, 5 * 60 * 1000, 0.5 * 1000],
	[5 * 1000, 10 * 1000, 10 * 60 * 1000, 1.5 * 1000],
	[10 * 1000, 20 * 1000, 20 * 60 * 1000, 2.5 * 1000],
	[20 * 1000, 40 * 1000, 40 * 60 * 1000, 5 * 1000],
	[5 * 1000, 15 * 1000, 30 * 60 * 1000, 2 * 1000],
];

try {
	// arg > env > conf
	let conf = require(path.resolve("./config.json"));
	config.WEBSITE =
		arg.w ||
		process.env.CONF_WEBSITE ||
		conf.WEBSITE ||
		"https://github.com/uAliFurkanY/alibot-mc/"; // You probably shouldn't change this.
	config.HOST = arg.h || process.env.CONF_HOST || conf.HOST || "0b0t.org";
	config.USERNAME = arg.u || process.env.CONF_USERNAME || conf.USERNAME;
	config.PASSWORD =
		arg.p || process.env.CONF_PASSWORD || conf.PASSWORD || false;
	config.OP = arg.o || process.env.CONF_OP || conf.OP || "";
	config.IGNORED =
		arg.i || process.env.CONF_IGNORED || conf.IGNORED || "";
	config.MODE = arg.m || process.env.CONF_MODE || conf.MODE || "public";
	config.ACTIVE =
		arg.a || process.env.CONF_ACTIVE || conf.ACTIVE || "true";
	config.DELAYS = +arg.d || +process.env.CONF_DELAYS || +conf.DELAYS || 4;
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

const delay = delays[config.DELAYS];
const LOG_ERR = config.LOGLEVEL >= 1;
const LOG_STAT = LOG_ERR;
const LOG_INIT = config.LOGLEVEL >= 2;
const LOG_END = config.LOGLEVEL >= 3;
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

let ignored = config.IGNORED.split(",");
let op = config.OP.split(",");
let realOp = config.OP.split(",");
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
	}, delay[3]),
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

	toSend = [];

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
		setTimeout(() => init("End"), delay[1]);
	});
	bot.on("error", (m) => {
		if (m.message.includes("Invalid session.")) {
			session = false;
			init("Reloading Session");
		} else if (m.message.includes("Invalid credentials.")) {
			setTimeout(() => init("Error"), delay[2]);
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
	bot.chatAddPattern(
		/^[a-zA-Z0-9_]{3,16} whispers:/,
		"msg",
		"received msg"
	);

	bot.on("tpa", (u, m) => {
		let user = m.extra[0].text;
		if (ignored.includes(user)) return 0;
		log("TPA " + user, LOG_CMD);
		if (op.includes(user) || mode !== "private") {
			send(`/tpy ${user}`);
		} else {
			send(`/tpn ${user}`);
		}
	});
	bot.on("msg", (u, cm) => {
		let m = cm.extra[0].text.trim();
		let realCmd = false;

		let mArr = m.split(" ");
		u = mArr.shift(); // username
		mArr.shift(); // whispers:
		let fullM = mArr.join(" ");

		if (ignored.includes(u)) return 0;

		let command = mArr.shift(); // command
		let args = mArr; // arg0 arg1 arg2

		realCmd = doCmd(command, args, u, (x) => send(`/msg ${u} ${x}`));

		if (realCmd) log(`CMD ${u} ${fullM}`);
		else if (LOG_CHAT) log(`MSG ${u} ${fullM}`);
	});
	bot.on("chat", (u, m, t, cm) => {
		m = m.trim();
		u = u.trim();
		let realCmd = false;

		if (ignored.includes(u)) return 0;
		if (
			m.startsWith(prefix) &&
			!(cm.extra[0].text === "<" && cm.extra[1].text === "dc") &&
			!(cm.extra.length === 1 && cm.extra[0].color === "light_purple")
		) {
			let cmd = m.replace(prefix, "").trim();
			let args = cmd.split(" ");
			let command = args.shift();

			realCmd = doCmd(command, args, u);
			if (realCmd) log(`CMD ${u} ${cmd}`, LOG_CMD);
		}
		if (LOG_CHAT && !realCmd) log(`CHAT <${u}> ${m}`, LOG_CHAT);
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

function doCmd(command = "", args = [], u, out = send) {
	let realCmd = true;
	switch (command) {
		case "say":
			if (op.includes(u) || mode !== "private") {
				let msg = args.join(" ");
				if (msg.length > 50)
					out(`: Message can't be longer than 50 characters.`);
				else send(`: ${u} » ${args.join(" ")}`);
			} else {
				out(`: Sorry, the mode is private.`);
			}
			break;
		case "sudo": // Makes the bot say something
			if (op.includes(u)) {
				send(args.join(" "));
			} else {
				out(`: Sorry, you're not an operator.`);
			}
			break;
		case "su": // parses a fake command as another person.
			if (realOp.includes(u) || u === (username || "alib0t")) {
				if (args.length >= 1) {
					if (args.length >= 2) {
						let targetUser = args.shift();
						let toDo = args.shift();
						let realCmd = doCmd(toDo, args, targetUser, out);
						if (realCmd) {
							out(`: Issued command ${toDo} as ${targetUser} with arguments '${args.join(" ")}'.`);
							log(`CMD ${u} ${cmd}`, LOG_CMD);
						}
					} else {
						out(`: Say a command.`);
					}
				} else {
					out(`: Say a name.`);
				}
			} else if (op.includes(u)) {
				out(`: Sorry, you're not allowed to use this command.`);
			} else {
				out(`: Sorry, you're not an operator.`);
			}
		case "kill":
			if (
				op.includes(u) ||
				(Date.now() >= lastkill + 15 * 1000 && mode !== "private")
			) {
				lastkill = Date.now();
				out(`/kill`);
			} else if (mode === "private") {
				out(`: Sorry, the mode is private.`);
			} else {
				out(`: Wait 15 seconds.`);
			}
			break;
		case "discord":
			out(": https://discord.gg/gr8y8hY");
			break;
		case "help":
		case "github":
			out(": https://github.com/uAliFurkanY/alibot-v2/");
			break;
		case "ping":
			if (args.length >= 1) {
				bot.players[args[0]]
					? out(
							`: ${args[0]}'s ping is ${
								bot.players[args[0]].ping
							}ms.`
					  )
					: out(`: Player not found.`);
			} else {
				out(`: Your ping is ${bot.players[u].ping}ms.`);
			}
			break;
		case "op":
			if (op.includes(u) && args.length >= 1) {
				if (op.includes(args[0])) {
					out(`: ${op.join(", ")} is already an operator.`);
				} else {
					op.push(args[0]);
					out(`: Opped ${args[0]}.`);
				}
			} else if (args.length >= 1) {
				out(`: Sorry, you're not an operator.`);
			} else {
				out(`: The operators are ${op.join(", ")}.`);
			}
			break;
		case "deop":
			if (op.includes(u) && args.length >= 1) {
				try {
					let idx = op.findIndex((name) => name === args[0]);
					if (idx > -1) {
						if (
							(realOp.includes(op[idx]) ||
								args[0] === username) &&
							!(realOp.includes(u) || u === username)
						)
							out(`: You can't deop ${args[0]}.`);
						else {
							op.splice(idx, 1);
							out(`: Deopped ${args[0]}.`);
						}
					} else out(`: ${args[0]} isn't an opeator.`);
				} catch (e) {
					out(`: Error.`);
					console.log(e);
				}
			} else if (args.length >= 1) {
				out(`: Sorry, you're not an operator.`);
			}
			break;
		case "ignore":
			if (op.includes(u) && args.length >= 1) {
				try {
					let idx = ignored.findIndex((name) => name === args[0]);
					if (idx > -1) {
						if (op.includes(args[0]))
							out(`: You can't ignore ${args[0]}.`);
						else {
							ignored.splice(idx, 1);
							out(`: Unignored ${args[0]}.`);
						}
					} else {
						ignored.push(args[0]);
						out(`: Ignored ${args[0]}.`);
					}
				} catch (e) {
					out(`: Error.`);
					console.log(e);
				}
			} else if (args.length >= 1) {
				out(`: Sorry, you're not an operator.`);
			} else {
				out(`: The ignored people are ${ignored.join(", ")}.`);
			}
			break;
		case "goto":
			if (op.includes(u)) {
				let coords = args.map(
					(x, i) => parseInt(x) || (i === 1 ? 5 : 0)
				);
				bot.navigate.to(new Vec3(coords[0], coords[1], coords[2]));
			} else {
				out(`: Sorry, you're not an operator.`);
			}
			break;
		case "stopGoto":
			if (op.includes(u)) {
				out(": Stopping...");
				bot.navigate.stop();
			} else {
				out(`: Sorry, you're not an operator.`);
			}
			break;
		case "tps":
			out(`: The current tick rate is ${bot.getTps()} TPS.`);
			break;
		case "mode":
			if (op.includes(u) && args.length >= 1) {
				out(`: Changing the mode to ${args[0]}.`);
				mode = args[0];
			} else {
				out(`: The current mode is ${mode}`);
			}
			break;
		case "coords":
			if (op.includes(u) || mode !== "private") {
				out(
					`: My coordinates are: ${bot.player.entity.position.x.toFixed(
						1
					)} ${bot.player.entity.position.y.toFixed(
						1
					)} ${bot.player.entity.position.z.toFixed(1)}.`
				);
			} else {
				out(`: Sorry, the mode is private.`);
			}
			break;
		case "prefix":
			if (op.includes(u) && args.length >= 1) {
				prefix = args[0];
				out(`: The prefix is set to '${prefix}'.`);
			} else {
				out(`: The prefix is '${prefix}'.`);
			}
			break;
		case "save":
			if (realOp.includes(u)) {
				try {
					config.OP = op.join(",");
					config.IGNORED = ignored.join(",");
					config.MODE = mode;
					config.PREFIX = prefix;
					fs.writeFileSync("config.json", JSON.stringify(config));
					out(`: Saved.`);
				} catch (e) {
					out(`: Error.`);
					console.log(e);
				}
			} else if (op.includes(u)) {
				out(`: Sorry, you're not allowed to use this command.`);
			} else {
				out(`: Sorry, you are not an operator.`);
			}
			break;
		default:
			realCmd = false;
			break;
	}
	return realCmd;
}

init("FIRST");

rl.on("line", (c) => {
	let args = c.split(" ");
	let command = args.shift();
	doCmd(command, args, username || "alib0t", (x) =>
		log("OUT " + x, LOG_CMD)
	);
});
