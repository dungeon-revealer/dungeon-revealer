# dungeon-revealer [![Build Status](https://travis-ci.org/apclary/dungeon-revealer.svg?branch=master)](https://travis-ci.org/apclary/dungeon-revealer)

![alt text](https://user-images.githubusercontent.com/14338007/57970988-634cc700-7988-11e9-8cae-dfcc685cc848.png "Preview Image")

A web app for tabletop gaming to allow the game master to reveal areas of the game map to players.

## What the DM Sees

![alt text](http://apclary.github.io/dungeon-revealer/img/example_dm_1.jpeg "DM's view")

You can protect the DM area by setting a password.

## What the players see

![alt text](https://apclary.github.io/dungeon-revealer/img/example_player_1.jpeg "Player's view")

## Getting Started

### Getting the app

The easiest way to use dungeon-revealer is to download the app from the [releases](https://github.com/apclary/dungeon-revealer/releases) page here on github. There is also a [docker image](https://hub.docker.com/r/apclary/dungeon-revealer) that is kept up to date with the releases in this repository.

#### Prebuilt app 

**Download the app for your system from the [releases page](https://github.com/apclary/dungeon-revealer/releases).**
We provide builds for Windows, Linux, and OSX.

Either double click the app or open a command prompt in the same directory as the app and run from there. 
Running from the command prompt will present connection information and some debugging.
Optionally, you may set a password for the dungeon master page by setting the environmental variable `DM_PASSWORD` when starting the app. e.g. for linux `DM_PASSWORD='password' ./dungeon-revealer-linux`



#### Docker

To create an instance, run the following:

```
docker pull apclary/dungeon-revealer:latest
docker run -e DM_PASSWORD=<password> -p <PORT>:3000 -v <DATA_DIR>:/usr/src/app/data -d apclary/dungeon-revealer:latest
```

- Replace `<password>` with your chosen DM password
- Replace `<PORT>` with your preferred port. 
- `<DATA_DIR>` is the directory on the host filesystem in which you want to store the maps and settings. `<DATA_DIR>` **must be an absolute path.** One way to achieve this in linux is to navigate to the directory you want in the terminal and then use `$PWD/data` as `<DATA_DIR>`.


In your browser, go to `<YOUR_IPADDRESS>:<PORT>`.

### Using the app

#### Dungeon Master

To use dungeon-revealer, the game master and the players must be on the same local network (usually a wifi network). The game master will start the server, navigate to the server's URL in a browser like Chrome, click on the Dungeon Master link, and then enter a password if set. At this point, they will be prompted to upload an image file of the map to share with the other players. The other players will navigate to the server using their own browsers (laptop, tablet, or phone) and will remain at the home page. The connection information is displayed in command prompt for convenience.

To clear areas of the map, click and draw on the map. If you clear too much, you can switch the brush to the "shadow brush" and restore some of the fog. Alternatively, you can select an area to clear or shroud by clicking the "Brush Tool" button to. Whenever the game master clears some of the fog of war from the map and it is ready to share with the players, they will click "Send" and the revealed areas of the map will appear in the players' browsers. What appears as a shadow to the DM will appear as pure blackness to players, thus only revealing the cleared sections of the map to them.

To switch to a different map, click "Load map", and then select one of the maps you have already uploaded and click "Load". The "LIVE" indicator in the lower right indicates if the map currently on the dungeon master page is being presented on the player page. the "Hide Live Map" button will blank the player page in preparation for a new map to be loaded.



#### Players

Navigate to the server using a web browser and wait at the home page. (The connection information is displayed in command prompt for convenience.) When the dungeon master is ready, they will push a map to your webpage. You will see either a black screen or a partially covered image. You can zoom in/out and pan the map. On a long click you will place a "point of interest" on the map that will show as a red circle.

## Contributing

See the [CONTRIBUTING.md](CONTRIBUTING.md).





