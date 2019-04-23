dungeon-revealer
================

A web app for tabletop gaming to allow the game master to reveal areas of the game map to players.

What the DM Sees
----------------
![alt text](http://apclary.github.io/dungeon-revealer/img/example_dm_1.jpeg "DM's view")

You can protect the DM area by setting a password.

What the players see
--------------------
![alt text](https://apclary.github.io/dungeon-revealer/img/example_player_1.jpeg "Player's view")


Installation
------------

### Docker

A docker image is kept up to date with master branch of this repository.

To create an instance run the following:

`docker run -e DM_PASSWORD=<password> -p <PORT>:3000 -d apclary/dungeon-revealer`

Replace `<password>` with your chosen DM password, and `<PORT>` with your prefered port.
In your browser, go to `<YOUR_IPADDRESS>:<PORT>`. 
If you are the DM, click on Dungeon Master and enter the specified password with no user.
If you are a player, just wait until the DM pushes a map.

### Node

(This is the simplest way I know to install. If you know a better way, please shoot me a message.)

1. Install git. On Windows, I believe if you install the Github version of git it should add git automatically to your path.
1. Go to https://nodejs.org/download/ and download and install Node. Node is the runtime for this software, which basically means you need it to make the software work. Only one person needs Node (assumed to be the DM). 
1. Once Node is installed, open a command prompt. 
   * For Mac users, press Command + Space and type "terminal" into Spotlight. Press enter and a prompt should open. 
   * For Windows users, press the Windows key and type "command prompt" or "cmd" into the search box and then press enter.
   * For Linux users, you already know how to open the command prompt.
1. Using the command prompt, change to whatever directory you want to keep this program in. 
1. Once you are in that directory, type `npm install apclary/dungeon-revealer` (without quotes) into the command prompt and press enter.
1. Wait a little bit while it installs.
1. Once it's done, a directory named node_modules should appear. Using the prompt, navigate to node_modules/dungeon-revealer/bin.
1. Type `node dungeon-revealer` into the prompt. Some messages should appear. This likely means the server is now running. 
   * On some Windows machines, a firewall prompt will appear. Check all of the checkboxes and click OK.

If you want to protect the DM endpoint you should set the `DM_PASSWORD` environment variable (e.g. `DM_PASSWORD=test123 node dungeon-revealer`)

Use
---

To use dungeon-revealer, the game master and the players must be on the same local network (usually a wifi network). The game master will start the server, navigate to the server's URL in a browser like Chrome, and then click on the Dungeon Master link. At this point, she will be prompted to upload an image file of the map to share with the other players. The other players will navigate to the server using their own browsers (laptop, tablet, or phone) and will remain at the home page. The connection information is displayed in command prompt for convenience.

To clear areas of the map, click and draw on the map. If you clear too much, you can switch the brush to the "shadow brush" and restore some of the fog. Whenever you clear some of the fog of war from the map and is ready to share with the players, she will click "Send" and the revealed areas of the map will appear in the player's browsers. What appears as a shadow to the DM will appear as pure blackness to players, thus only revealing the cleared sections of the map to them.

To replace the existing map with a new image file, click "New Map".


