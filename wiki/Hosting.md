Under construction!

## Self-Hosting

### Local Network

Local network connection is currently the default assumption of these docs.

### Remote Access

In order to allow players and even other DMs to remotely access to your installation, you need to enable additional outside services. The easiest two approaches to this are either using a Virtual Private Network (VPN), or a combination of Dynamic DNS (DDNS) and local port forwarding:

- **VPN:** Many modern routers feature built-in VPN configuration. See your router's docs for more details.
- **DDNS:** A number of [free and paid online DDNS services](https://www.google.com/search?q=dynamic+dns&oq=dynamic+dns) exist that can forward a custom hostname to your home internet network. Using port forwarding (see your router's docs) it's easy to then forward a remote port to the host port of your Dungeon Revealer installation.

### Hosting on a Server

- [Install Dungeon Revealer on a Digital Ocean Droplet](https://www.ehrenpforte.com/technical-2/943/)

### Usage with Reverse Proxy

#### Basic Usage

You can configure the base url dungeon-revealer uses with the `PUBLIC_URL` environment variable.
This can be helpful for use-cases in which you want to expose dungeon-revealer under a non root path such as `https://my-site.com/dungeon-revealer`.

```bash
PUBLIC_URL=https://my-site.com/dungeon-revealer dungeon-revealer
```

#### Example NGINX Configuration

For this example we assume that dungeon-revealer is listening on `127.0.0.1`.

```conf
upstream dungeon-revealer {
    server 127.0.0.1:3000;
}

server {
    listen       80;
    server_name  my-site.com;

    location /dungeon-revealer {
        # rewrite the url to point to 127.0.0.1/dm instead of 127.0.0.1/dungeon-revealer/dm
        rewrite ^/dungeon-revealer(/.*)$ $1 break;
        proxy_pass http://dungeon-revealer/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

```

#### Example Apache HTTPD Configuration

For this example we assume that dungeon-revealer is listening on `127.0.0.1`.

```
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so

<VirtualHost *:80>

  RewriteEngine On

  RewriteCond %{HTTP:Upgrade} websocket               [NC]
  RewriteRule /dungeon-revealer/(.*)           ws://127.0.0.1:3000/$1  [P]

  ProxyPass /dungeon-revealer http://127.0.0.1:3000
  ProxyPassReverse /dungeon-revealer http://127.0.0.1:3000
</VirtualHost>
```
