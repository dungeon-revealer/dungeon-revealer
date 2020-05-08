# Using BuildKit is highly recommended
# DOCKER_BUILDKIT=1 docker build .

# CACHE = 'fresh' or 'cache' if you want a fresh build, or a cached sqlite3 build
ARG CACHE=fresh


FROM node:12-alpine as base

WORKDIR /usr/src/build

# add build tools for other architectures
RUN apk add --no-cache make g++ python


FROM base as sqlite3-builder

ARG SQLITE3_VERSION="latest"

RUN npm install sqlite3@${SQLITE3_VERSION}


FROM sqlite3-builder as cache-dependency-builder

COPY package.json .
COPY package-lock.json .

RUN npm install


FROM base as fresh-dependency-builder

COPY package.json .
COPY package-lock.json .

RUN npm install


FROM ${CACHE}-dependency-builder as application-builder

COPY tsconfig.json /usr/src/build/tsconfig.json

COPY server /usr/src/build/server
COPY src /usr/src/build/src
COPY public /usr/src/build/public

RUN npm run build


FROM ${CACHE}-dependency-builder as production-dependency-builder

# then we remove all dependencies we no longer need
RUN npm prune --production


FROM node:12-alpine as final

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
