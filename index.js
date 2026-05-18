const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const NewTutors = database.collection("NewTutors");
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

    // book sessions details
    app.get("/tutors/:id",  async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // limited tutors
    app.get("/tutors/limited", async (req, res) => {
      const cursor = usersCollection.find({}).limit(6);
      const tutors = await cursor.toArray();
      res.send(tutors);
    });

    // add new tutor
    app.post("/tutors/newTutors", async (req, res) => {
      const tutor = req.body;

      const result = await NewTutors.insertOne({ ...tutor });

      if (tutor._id) {
        delete tutor._id;
      }

      const result2 = await usersCollection.insertOne(tutor);
      res.send({ result, result2 });
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
