const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();
const app = express();
const uri = process.env.MONGO_URI;
const cors = require("cors");
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("mentorify");
    const usersCollection = database.collection("users");
    // all tutors
    app.get("/tutors", async (req, res) => {
      const cursor = usersCollection.find({});
      const tutors = await cursor.toArray();
      res.send(tutors);
    });

    // add tutors
    app.post("/tutors", async (req, res) => {
      const tutor = req.body;
      const result = await usersCollection.insertOne(tutor);
      res.send(result);
    });

    // limited tutors
    app.get("/tutors/limited", async (req, res) => {
      const cursor = usersCollection.find({}).limit(6);
      const tutors = await cursor.toArray();
      res.send(tutors);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
