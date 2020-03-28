# Usage with Reverse Proxy

## Basic Usage

You can configure the base url dungeon-revealer uses with the `BASE_URL` environment variable.
This can be helpful for use-cases in which you want to expose dungeon-revealer under a non root path such as `https://my-site.com/dungeon-revealer`.

```bash
BASE_URL=https://my-site.com/dungeon-revealer dungeon-revealer
```

## Example NGINX Configuration

For this example we assume that dungeon-revealer is listening on `127.0.0.1`.

```conf
server {
    listen       80;
    server_name  my-site.com;

    location /dungeon-revealer {
        # rewrite the url to point to 127.0.0.1/dm instead of 127.0.0.1/dungeon-revealer/dm
        rewrite ^/dungeon-revealer(/.*)$ $1 break;
        proxy_pass http://127.0.0.01:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
