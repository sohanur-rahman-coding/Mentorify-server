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
    const bookedSessionsCollection = database.collection("bookedSessions");

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

    // my tutors

    app.get("/my-tutors", async (req, res) => {
      const email = req.query.email;
      const query = { createdBy: email };
      const cursor = usersCollection.find(query);
      const myTutors = await cursor.toArray();
      res.send(myTutors);
    });

    // book sessions details
    app.get("/tutors/:id", async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // limited tutors
    app.get("/limited-tutors", async (req, res) => {
      const cursor = usersCollection.find({}).sort({ _id: -1 }).limit(6);
      const tutors = await cursor.toArray();
      res.send(tutors);
    });

    // booked seassion
    app.post("/my-booked-sessions", async (req, res) => {
      const session = req.body;
      session.status = "Confirmed";
      const result = await bookedSessionsCollection.insertOne(session);
      res.send(result);
    });
    // session delete
    app.patch("/my-booked-sessions/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookedSessionsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Cancelled" } },
      );
      res.send(result);
    });

    // get mybooking session
    app.get("/my-booked-sessions", async (req, res) => {
      const email = req.query.email;
      const cursor = bookedSessionsCollection.find({ email: email });
      const sessions = await cursor.toArray();
      res.send(sessions);
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
