FROM node:12-alpine as base

# add build tools for other architectures
# subsequent builds should cache this layer
RUN apk add make g++ python


FROM base as dependency-builder

WORKDIR /usr/src/build

RUN echo "unsafe-perm = true" > .npmrc

COPY . .

RUN npm install


FROM dependency-builder as application-builder

RUN TERSER_PARALLEL_TASKS=2 npm run build


FROM dependency-builder as production-dependency-builder

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

EXPOSE 3000

CMD [ "node", "server-build/index.js" ]
