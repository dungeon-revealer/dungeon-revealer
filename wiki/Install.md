The easiest way to use dungeon-revealer is to download the app from the [releases](https://github.com/dungeon-revealer/dungeon-revealer/releases) page here on github. There is also a [docker image](https://ghcr.io/dungeon-revealer/dungeon-revealer) that is kept up to date with the releases in this repository.

Running from the command prompt will present connection information and some debugging.
Optionally, you may set a password for the dungeon master and/or players by setting the environmental variables `DM_PASSWORD` and `PC_PASSWORD` when starting the app. e.g. for linux `PC_PASSWORD='password1' DM_PASSWORD='password2' ./dungeon-revealer-linux`
Leaving a variable undefined will disable authentication and allow public access for that section of the map.

### Windows

Double click the app. A command prompt will open with useful information.
Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the command prompt window.

### OSX

Open the zip file and extract the files to your preferred location.

Double click the app. A terminal will open with useful information.
Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the terminal window.

### Linux

Open the zip file and extract the files to your preferred location.

Then you can run the app directly in the terminal.

```bash
./dungeon-revealer-linux
```

Then go to `localhost:3000` in your browser and point your players to `<YOUR_IPADDRESS>:3000`.
This information is also present in the terminal window.

There is also a community maintained [AUR package](https://aur.archlinux.org/packages/dungeon-revealer-bin/).

### Docker

We provide docker images for x64 and arm architectures.
An up to date version of docker is required to make sure the correct image architecture is pulled for your host machine.
To create an instance, run the following:

```bash
docker pull ghcr.io/dungeon-revealer/dungeon-revealer:latest
docker run -e DM_PASSWORD=<password> -e PC_PASSWORD=<password> -p <PORT>:3000 -v <DATA_DIR>:/usr/src/app/data -d ghcr.io/dungeon-revealer/dungeon-revealer:latest
```

- Replace `<password>` with your chosen passwords.
- Replace `<PORT>` with your preferred port.
- `<DATA_DIR>` is the directory on the host filesystem in which you want to store the maps and settings. `<DATA_DIR>` **must be an absolute path.** One way to achieve this in linux is to navigate to the directory you want in the terminal and then use `$PWD/data` as `<DATA_DIR>`.

In your browser, go to `<YOUR_IPADDRESS>:<PORT>/dm`. If your players are on the local network, have them go to `<YOUR_IPADDRESS>:<PORT>`.

Below is an example docker-compose.yml file.

```YAML
version: '3'
services:
  dungeon-revealer:
    image: ghcr.io/dungeon-revealer/dungeon-revealer:latest
    container_name: dungeon-revealer
    environment:
      - DM_PASSWORD=<password>
      - PC_PASSWORD=<password>
    volumes:
      - <DATA_DIR>:/usr/src/app/data
    ports:
      - <PORT>:3000
```
