FROM node:10-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy app source
COPY . .

# Docker runs the app as root inside the container, 
# so it needs elevated permissions.
# Remove binaries after install since we don't need them.
RUN yarn install && rm bin/dungeon-revealer-*

CMD [ "yarn", "start" ]
