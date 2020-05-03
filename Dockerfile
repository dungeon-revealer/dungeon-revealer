FROM node:12-alpine as dependency-builder

# add build tools for other architectures
# subsequent builds should cache this layer
RUN apk add make g++ python

WORKDIR /usr/src/build

COPY package.json .
COPY package-lock.json .

RUN npm install

FROM node:12-alpine as application-builder

WORKDIR /usr/src/build

COPY --from=dependency-builder /usr/src/build/package.json /usr/src/build/package.json
COPY --from=dependency-builder /usr/src/build/package-lock.json /usr/src/build/package-lock.json
COPY --from=dependency-builder /usr/src/build/node_modules /usr/src/build/node_modules

COPY tsconfig.json /usr/src/build/tsconfig.json
COPY tsconfig.server.json /usr/src/build/tsconfig.server.json

COPY server /usr/src/build/server
COPY src /usr/src/build/src
COPY public /usr/src/build/public

RUN npm run build

FROM node:12-alpine as production-dependency-builder

WORKDIR /usr/src/build

COPY --from=dependency-builder /usr/src/build/package.json /usr/src/build/package.json
COPY --from=dependency-builder /usr/src/build/package-lock.json /usr/src/build/package-lock.json
COPY --from=dependency-builder /usr/src/build/node_modules /usr/src/build/node_modules

# then we remove all dependencies we no longer need
RUN npm prune --production

FROM node:12-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy app source
COPY --from=application-builder /usr/src/build/build /usr/src/app/build
COPY --from=application-builder /usr/src/build/server-build /usr/src/app/server-build
COPY --from=production-dependency-builder /usr/src/build/node_modules /usr/src/app/node_modules
COPY --from=production-dependency-builder  /usr/src/build/package.json /usr/src/app/package.json
COPY --from=production-dependency-builder  /usr/src/build/package-lock.json /usr/src/app/package-lock.json

ARG NODE_ENV="production"
ENV NODE_ENV="production"

CMD [ "node", "server-build/index.js" ]
