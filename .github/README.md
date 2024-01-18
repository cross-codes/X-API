<div align="center">
<h1>🐦 X API </h1>

An API for managing several users and their tweets

Current version : 1.0

</div>

---

For a brief overview on the process of creating the API, check out
`📁notes/notes.md`

# Usage

After cloning the repository, run the following command in
the same directory that has the `package.json` file in it:

```bash
corepack enable
yarn install
```

The API uses [MongoDB](https://www.mongodb.com/)
for storing user data, tokens and tweet
data. Hence, it is necessary to have a
MongoDB server running either locally, or hosted on any platform
like [Atlas](https://www.mongodb.com/cloud/atlas/register).
To test out the API, you can use a [docker](https://www.docker.com/)
container as

```bash
docker pull mongo:latest
docker run -it -v mongodata:/data/db -p 27017:27017 --name MongoDB -d mongo:latest
```

and then start the container.

## Note

You will have to create a `.env` file inside with the following contents:

```env
PORT=<number>
JWT_SECRET=<string>
MONGODB_URI=<example URL>
```

(All the terms enclosed in <> must be replaced with their respective values,
and the "<>" must be removed. No quotes must be used)

An example `.env` file is:

```env
PORT=3000
JWT_SECRET=generateAuth
MONGODB_URL=mongodb://0.0.0.0:27017/x-api
```

Once your server is up and running, you can use the following command:

```bash
yarn run serverDev
```

To use the API. It is recommended to use an application like
[Postman](https://www.postman.com/) to
send requests back and forth to the server.

The contents of the database can by accessed using
[MongoDB Compass](https://www.mongodb.com/products/compass), or
the MongoShell, which can be accessed via the terminal (in the case of
a docker container, first `exec` the container and use the `mongo` command)

---

Project started on: 24/12/2023

(v1.0) First functional version completed on: 02/01/2024
