dungeon-revealer
================

A web app for tabletop gaming to allow the game master to reveal areas of the game map to players.

Installation
------------
(This is the simplest way I know to install. If you know a better way, please shoot me a message.)

1. Go to https://nodejs.org/download/ and download and install Node. Node is the runtime for this software, which basically means you need it to make the software work. 
2. Once Node is installed, open a command prompt. 
  * For Mac users, press Command + Space and type "terminal" into Spotlight. Press enter and a prompt should open. 
  * For Windows users, press the Windows key and type "command prompt" or "cmd" into the search box and then press enter.
  * For Linux users, you already know how to open the command prompt.
3. Using the command prompt, change to whatever directory you want to keep this program in. 
4. Once you are in that directory, type "npm install apclary/dungeon-revealer" (without quotes) into the command prompt and press enter.
5. Wait a little bit while it installs.
6. Once it's done, a directory named node_modules should appear. Using the prompt, navigate to node_modules/dungeon-revealer/bin.
7. Type "node dungeon-revealer" into the prompt. Some messages should appear. This likely means the server is now running. 
  * On some Windows machines, a firewall prompt will appear. Check all of the checkboxes and click OK.

Use
---

To use dungeon-revealer, the game master and the players must be on the same local network (usually a wifi network). The game master will start the server, navigate to the server's URL in a browser like Chrome, and then click on the Dungeon Master link. At this point, he will be prompted to upload a PNG file of the map to share with the other players. The other players will navigate to the server using their own browsers and will remain at the home page. Whenever the DM clears some of the fog of war from the map and is ready to share with the players, she will click "Send" and the revealed areas of the map will appear in the player's browsers.

