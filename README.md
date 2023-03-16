# dungeon-revealer

[![Build Status](https://img.shields.io/github/workflow/status/dungeon-revealer/dungeon-revealer/Node.js%20CI)](https://github.com/dungeon-revealer/dungeon-revealer/actions)
[![Downloads](https://img.shields.io/github/downloads/dungeon-revealer/dungeon-revealer/total.svg?logo=github)](https://github.com/dungeon-revealer/dungeon-revealer/releases)
[![Release](https://img.shields.io/github/v/release/dungeon-revealer/dungeon-revealer?logo=github&color=orange)](https://github.com/dungeon-revealer/dungeon-revealer/releases/latest)
[![Docker](https://img.shields.io/static/v1?label=docker&message=v1.17.1&color=blue&logo=Docker)](https://github.com/dungeon-revealer/dungeon-revealer/pkgs/container/dungeon-revealer/versions)
[![Discord](https://img.shields.io/discord/709687178422386708)](https://discord.gg/dS5khqk)

Dungeon Revealer is an open source self-hosted app for playing pen and paper such as Dungeon and Dragons or Cyberpunk or other tabletop games together.

The main features include revealing game maps to players, moving around tokens on a map, a dice roll chat and sharing notes and images.

Dungeon Revealer supports both desktop clients and mobile clients, such as tablets or phones. It can be used for in person gaming on a local network or for online gaming via the internet.

Join the [discord server](https://discord.gg/dS5khqk).
Check out the [wiki](https://github.com/dungeon-revealer/dungeon-revealer/wiki) for a detailed walkthrough!

## What the DM Sees

![alt text](https://user-images.githubusercontent.com/14338007/83942937-68312280-a7f8-11ea-9a63-8307f1c12d50.png "DM's View")

You can protect the DM area by setting a password.

## What the players see

![alt text](https://user-images.githubusercontent.com/14338007/83942940-6e270380-a7f8-11ea-9eb5-ec440ea57c83.png "Player's view")

## Getting Started

### Getting the app

The easiest way to use dungeon-revealer is to download the app from the [releases](https://github.com/dungeon-revealer/dungeon-revealer/releases) page here on github. There is also a [docker image](https://ghcr.io/dungeon-revealer/dungeon-revealer) that is kept up to date with the releases in this repository.

#### Prebuilt app

**Download the app for your system from the [releases page](https://github.com/dungeon-revealer/dungeon-revealer/releases).**
We provide builds for Windows, Linux, and OSX.

Running from the command prompt will present connection information and some debugging.
Optionally, you may set a password for the dungeon master and/or players by setting the environmental variables `DM_PASSWORD` and `PC_PASSWORD` when starting the app. e.g. for linux `PC_PASSWORD='password1' DM_PASSWORD='password2' ./dungeon-revealer-linux`
Leaving a variable undefined will disable authentication and allow public access for that section of the map.

##### Linux

Open the zip file and extract the files to your preferred location.

Then you can run the app directly in the terminal.

```
./dungeon-revealer-linux
```

Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the terminal window.

There is also a community maintained [AUR package](https://aur.archlinux.org/packages/dungeon-revealer-bin/).

##### OSX

Open the zip file and extract the files to your preferred location.

Double click the app. A terminal will open with useful information.
Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the terminal window.

##### Windows

Double click the app. A command prompt will open with useful information.
Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the command prompt window.

##### Docker

We provide docker images for x64 and arm architectures.
An up to date version of docker is required to make sure the correct image architecture is pulled for your host machine.
To create an instance, run the following:

```
docker pull ghcr.io/dungeon-revealer/dungeon-revealer:v1.17.1
docker run -e DM_PASSWORD=<password> -e PC_PASSWORD=<password> -p <PORT>:3000 -v <DATA_DIR>:/usr/src/app/data -d ghcr.io/dungeon-revealer/dungeon-revealer:latest
```

- Replace `<password>` with your chosen passwords.
- Replace `<PORT>` with your preferred port.
- `<DATA_DIR>` is the directory on the host filesystem in which you want to store the maps and settings. `<DATA_DIR>` **must be an absolute path.** One way to achieve this in linux is to navigate to the directory you want in the terminal and then use `$PWD/data` as `<DATA_DIR>`.

In your browser, go to `<YOUR_IPADDRESS>:<PORT>/dm`. If your players are on the local network, have them go to `<YOUR_IPADDRESS>:<PORT>`.

##### Heroku

Heroku is a platform supporting one-click deployments and includes a free usage tier. Sign up for a free account then click the button below. Give your app a unique name, set any required passwords, and click `Deploy App` to start the build process.

> **Note:** the Heroku deployment will not preserve user data over time (see [#405](https://github.com/dungeon-revealer/dungeon-revealer/issues/405)).

[![button](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/dungeon-revealer/dungeon-revealer/tree/v1.17.1)

### Using the app

The app is separated into two sections. One for the dungeon master and one for the players. Check out the [wiki](https://github.com/dungeon-revealer/dungeon-revealer/wiki) for a detailed walkthrough!

#### Dungeon Master

To use dungeon-revealer, the game master and the players must be on the same local network (usually a wifi network). The game master will start the server (see Installation), navigate to the server's URL in a web browser, click on the Dungeon Master link, and then enter a password if it is set. At this point, they will be prompted to upload an image file of the map to share with the other players. The other players will navigate to the server using their own browsers (laptop, tablet, or phone) and will remain at the home page. The connection information is displayed in command prompt for convenience.

To clear areas of the map, click and draw on the map. You can switch the brush mode by clicking the "Reveal" or "Shroud" button. Alternatively, you can select an area to clear or shroud by clicking the "Select Area" button. Whenever the game master clears some of the fog of war from the map and it is ready to share with the players, they will click "Send" and the revealed areas of the map will appear in the players' browsers. What appears as a shadow to the DM will appear as pure blackness to players, thus only revealing the cleared sections of the map to them. The "Mark" button will display a circle for a period of time to indicate a point of interest.

To switch to a different map, click "Map Library", and then select one of the maps you have already uploaded and click "Load". The "LIVE" indicator in the lower right indicates if the map currently on the dungeon master page is being presented on the player page. the "Stop Sharing" button will blank the player page in preparation for a new map to be loaded.

You can add token with the "Token" tool. Click anywhere on the map to place it. The token can be changed by opening the context menu trough right-clicking on a single token. You can alter it's label, color and size.

##### Shortcuts

| Key            | Functionality                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------- |
| `1`            | select move tool.                                                                             |
| `2`            | select area tool.                                                                             |
| `3`            | select brush tool.                                                                            |
| `4`            | select mark tool.                                                                             |
| `5`            | select token tool.                                                                            |
| `Shift`        | toggle between hide/reveal.                                                                   |
| `CMD/Ctrl + S` | push map to players.                                                                          |
| Hold `Alt`     | use move tool while `Alt` key is pressed and return to previous mode after `Alt` is released. |

#### Players

Navigate to the server using a web browser and wait at the home page. (The connection information is displayed in command prompt for convenience.) When the dungeon master is ready, they will push a map to your webpage. You will see either a black screen or a partially covered image. You can zoom in/out and pan the map. On a long click you will place a "point of interest" on the map that will show as a red circle.

## Contributing

See the [CONTRIBUTING.md](CONTRIBUTING.md).
