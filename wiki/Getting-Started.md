The app is separated into two sections. One for the dungeon master and one for the players.

## Dungeon Master

To use dungeon-revealer, the game master and the players must be on the same local network (usually a wifi network). The game master will start the server (see [Installation](https://github.com/dungeon-revealer/dungeon-revealer/wiki/Install)), navigate to the server's URL (`your-ip:3000/dm`) in a web browser, and then enter a password if it is set. At this point, they will be prompted to upload an image file of the map to share with the other players. The other players will navigate to the server (`your-ip:3000`) using their own browsers (laptop, tablet, or phone) and will remain at the home page. The connection information is displayed in command prompt for convenience.

To clear areas of the map, click and draw on the map. You can switch the brush mode by clicking the "Reveal" or "Shroud" button. Alternatively, you can select an area to clear or shroud by clicking the "Select Area" button. Whenever the game master clears some of the fog of war from the map and it is ready to share with the players, they will click "Send" and the revealed areas of the map will appear in the players' browsers. What appears as a shadow to the DM will appear as pure blackness to players, thus only revealing the cleared sections of the map to them. The "Mark" button will display a circle for a period of time to indicate a point of interest.

To switch to a different map, click "Map Library", and then select one of the maps you have already uploaded and click "Load". The "LIVE" indicator in the lower right indicates if the map currently on the dungeon master page is being presented on the player page. The "Stop Sharing" button will blank the player page in preparation for a new map to be loaded.

You can add a [token](https://github.com/dungeon-revealer/dungeon-revealer/wiki/Tokens) with the "Token" tool. Click anywhere on the map to place it. The token can be changed by opening the context menu trough right-clicking on a single token. You can alter its label, color and size.

### Shortcuts

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

## Players

Navigate to the server using a web browser and wait at the home page. (The connection information is displayed in command prompt for convenience.) When the dungeon master is ready, they will push a map to your webpage. You will see either a black screen or a partially covered image. You can zoom in/out and pan the map. On a long click you will place a "point of interest" on the map that will show as a red circle.

### Hide Chat & Note UI

Append "?map_only" to the URL in order to hide chat & note UI. E.g. `http://localhost:3000/?map_only`. This could be useful in a setup where all players are around a table with a single monitor, for example.

This can also be used with the password parameter: `http://localhost:3000/?map_only&password=foobar123`.
