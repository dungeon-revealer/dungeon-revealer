FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ./
COPY . .


RUN npm set unsafe-perm true
RUN npm i eslint-plugin-import eslint-plugin-flowtype 
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production


#RUN npm run eslint
#RUN npm run build

# Bundle app source
# COPY . .

#EXPOSE 3000
CMD [ "npm", "start" ]

