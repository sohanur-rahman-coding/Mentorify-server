const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const app = express();
const uri = process.env.MONGO_URI;
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.ISSUER_URL}/api/auth/jwks`),
);
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = header.split(" ")[1];
  if (!token) {
    return res.status(403).send({ message: "Forbidden" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    return res.status(403).send({ message: "Forbidden" });
  }
};

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
    app.post("/tutors", verifyToken, async (req, res) => {
      const tutor = req.body;
      const result = await usersCollection.insertOne(tutor);
      res.send(result);
    });

    // my tutors

    app.get("/my-tutors", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { createdBy: email };
      const cursor = usersCollection.find(query);
      const myTutors = await cursor.toArray();
      res.send(myTutors);
    });

    // delete tutors
    app.delete("/tutors/:id", async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // update tutors
    app.patch("/tutors/:id", async (req, res) => {
      const id = req.params.id;
      const updatedTutor = req.body;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedTutor },
      );
      res.send(result);
    });

    // book sessions details
    app.get("/tutors/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // limited tutors
    app.get("/limited-tutors", async (req, res) => {
      const cursor = usersCollection.find({}).limit(6);
      const tutors = await cursor.toArray();
      res.send(tutors);
    });

    // book session modal data here,,,
    app.post("/my-booked-sessions", async (req, res) => {
      const session = req.body;

      const tutorId = session.tutorId;

      if (!tutorId) {
        return res.status(400).send({ message: "Tutor ID is required" });
      }

      try {
        const tutor = await usersCollection.findOne({
          _id: new ObjectId(tutorId),
        });

        if (!tutor) {
          return res.status(404).send({ message: "Tutor not found" });
        }

        const currentDate = new Date();
        const sessionStartDate = new Date(tutor.sessionStartDate);

        if (currentDate >= sessionStartDate) {
          return res.status(400).send({
            message: "This session has already started. Booking is now closed.",
          });
        }

        const slotsLeft = parseInt(tutor.totalSlot) || 0;
        if (slotsLeft <= 0) {
          return res.status(400).send({
            message: "Enrollment capacity has been reached for this tutor.",
          });
        }

        session.status = "Confirmed";
        session.bookedAt = new Date();
        const bookingResult = await bookedSessionsCollection.insertOne(session);

        const updatedResult = await usersCollection.findOneAndUpdate(
          { _id: new ObjectId(tutorId) },
          [
            {
              $set: {
                totalSlot: {
                  $subtract: [{ $toInt: "$totalSlot" }, 1],
                },
              },
            },
          ],
          { returnDocument: "after" },
        );

        const updatedTutorDoc = updatedResult.value || updatedResult;

        if (updatedTutorDoc && updatedTutorDoc.totalSlot === 0) {
          return res.send({
            success: true,
            bookingResult,
            message: "Booking Confirmed! This session is now fully booked.",
          });
        }

        res.send({
          success: true,
          bookingResult,
          message: "Booking Confirmed Successfully!",
        });
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
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
    app.get("/my-booked-sessions", verifyToken, async (req, res) => {
      const email = req.query.email;
      const cursor = bookedSessionsCollection.find({ email: email });
      const sessions = await cursor.toArray();
      res.send(sessions);
    });

    // await client.db("admin").command({ ping: 1 });
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
