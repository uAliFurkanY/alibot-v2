# alibot-v2

alibot-mc but much better. also uses chat instead of messages.

## Commands

##### Default prefix is ':'

#### help

Forwards you to this page.

#### kill

Kills the bot. (public mode only)

#### mode [mode]

Tells you the mode or changes it. (operators only)

#### say

Makes the bot say something. (public mode only)

#### sudo

Like `say` but says _exactly_ what you said. (operators only)

#### discord

Sends you the Discord link. (its https://discord.gg/gr8y8hY btw)

#### github

Same as `help`.

#### op [person]

Lists the operators or makes someone an operator. (operators only)

#### deop \<person\>

Opposite of `op`. (operators only)

Note: People that has been made an operator with `op` can't deop operators in the configurator or the bot itself.

#### ignore [person]

Tells you the list of ignored people, ignores, unignores all messages by a person. (operators only)

Note: Doesn't use `/ignore`.

#### ping [person]

Tells you your ping or the ping of the specified person.

#### tps

Tells you the calculated TPS of the server.

#### coords

Tells you the coordinates of the bot. (public mode only)

#### goto [<x> <y> <z>]

Navigates to the specified coordinates. (operators only)

Note: The coordinates default to `0 5 0`.

#### stopGoto

Stops the current navigation. (operators only)

Note: Currently broken. `mineflayer-navigate` devs have to fix it.

## Configuration

The configuration is stored in JSON format and in the `config.json` format.

#### HOST

Specifies the HOST to connect to.

#### USERNAME

Email address (or username if offline mode) of the account you want to use.

#### PASSWORD

Password of the Minecraft account.

Note: Leave blank if you want to use offline mode.

#### OP

List of operators seperated with `,`.

#### MODE

`public` or `private`. Self explanatory.

#### DELAYS

Specifies the delays between actions.

Values:

0. "End: 5s, Error: 5m, Message: 0.5s"
1. "End: 10s, Error: 10m, Message: 1.5s"
2. "End: 20s, Error: 20m, Message: 2.5s"
3. "End: 40s, Error: 40m, Message: 5s"
4. "End: 15s, Error: 30m, Message: 2s (Recommended)"

#### IGNORED

List of ignored people seperated with `,`.

#### LOGLEVEL

Specifies the loglevel.

Values:

0. "Nothing"
1. "Errors / Status"
2. "Inits"
3. "End / Kick (+TPS)"
4. "Sent MSGs / Commands (recommended)"
5. "Chat / Sleep / Wakeup"
