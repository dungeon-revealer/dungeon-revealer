FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Copy app source
COPY . .


RUN npm set unsafe-perm true
# Docker runs the app as root inside the container, 
# so it needs elevated permissions.
RUN npm install

CMD [ "npm", "start" ]

