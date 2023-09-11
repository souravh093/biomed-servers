//external imports
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
// const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res.status(401).send({ error: true, message: 'unauthorized access' });
//   }
//   // bearer token
//   const token = authorization.split(' ')[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ error: true, message: 'unauthorized access' })
//     }
//     req.decoded = decoded;
//     next();
//   })
// }

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.2sex9a1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("biomedDB").collection("users");

    const jobsCollection = client.db("biomedDB").collection("jobs");

    const evaluateCollection = client.db("biomedDB").collection("evaluate");

    const applidejobsCollection = client
      .db("biomedDB")
      .collection("appliedjobs");

    const blogsCollection = client.db("biomedDB").collection("blogs");

    const SocialMediaCollection = client
      .db("biomedDB")
      .collection("social-media");

    const applicantsCollection = client.db("biomedDB").collection("applicants");

    const testimonialsCollection = client
      .db("biomedDB")
      .collection("testimonials");

    const bookMarkJob = client.db("biomedDB").collection("bookMarkJob");

    // app.post('/jwt', (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    //   res.send({ token })
    // })

    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email }
    //   const user = await usersCollection.findOne(query);
    //   if (user?.admin !== true && user?.moderator !== true) {
    //       return res.status(403).send({ error: true, message: 'forbidden message' });
    //   }
    //   next();
    // }

    // save user in database with email and role
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };

      const updateInfo = {
        $set: user,
      };

      const result = await usersCollection.updateOne(
        query,
        updateInfo,
        options
      );
      res.send(result);
    });

    // get role
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // update task when apply this task
    app.put("/jobs/:id/apply", async (req, res) => {
      const taskId = req.params.id;

      try {
        const job = await jobsCollection.findOne({ _id: new ObjectId(taskId) });

        if (!job) {
          return res.status(404).json({ error: "Task not found" });
        }

        const appliedCount = (job.appliedCount || 0) + 1;

        const result = await jobsCollection.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: { appliedCount } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // post a job
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });


    app.get("/categoryJobs", async (req, res) => {
      let query = {};
      if (req.query.industry) {
        query = { industry: req.query.industry };
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    })





    // get all applidejobs
    app.get("/applidejobs", async (req, res) => {
      const result = await applidejobsCollection.find().toArray();
      res.send(result);
    });

    // store apply job
    app.post("/appliedjob", async (req, res) => {
      const appliedjobdata = req.body;

      const result = await applidejobsCollection.insertOne({ appliedjobdata });
      res.send(result);
    });

    app.post("/evaluateTask", async (req, res) => {
      const evaluateData = req.body;
      const result = await evaluateCollection.insertOne(evaluateData);
      res.send(result);
    });

    //get all allApplyJob by user email
    app.get("/allApplyJob", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { "appliedjobdata.email": req.query.email };
      }
      const result = await applidejobsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // Upload and applied and submit job

    app.put("/appliedjob/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        // Ensure you have a valid ObjectId for the query
        const query = { _id: new ObjectId(id) };

        const options = { upsert: true };

        const updateFields = {};

        if (updateData.hasOwnProperty("isApplied")) {
          updateFields["appliedjobdata.isApplied"] = updateData.isApplied;
        }
        if (updateData.hasOwnProperty("coverLetter")) {
          updateFields["appliedjobdata.coverLetter"] = updateData.coverLetter;
        }
        if (updateData.hasOwnProperty("downloadPdf")) {
          updateFields["appliedjobdata.downloadPdf"] = updateData.downloadPdf;
        }
        if (updateData.hasOwnProperty("downloadEvaluate")) {
          updateFields["appliedjobdata.downloadEvaluate"] =
            updateData.downloadEvaluate;
        }
        if (updateData.hasOwnProperty("feedback")) {
          updateFields["appliedjobdata.feedback"] = updateData.feedback;
        }
        if (updateData.hasOwnProperty("point")) {
          updateFields["appliedjobdata.point"] = updateData.point;
        }
        if (updateData.hasOwnProperty("isEvaluate")) {
          updateFields["appliedjobdata.isEvaluate"] = updateData.isEvaluate;
        }

        const updateDoc = {
          $set: updateFields,
        };

        const result = await applidejobsCollection.updateOne(
          query,
          updateDoc,
          options
        );

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Data updated successfully" });
        } else {
          res.status(404).json({ message: "Job not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // TODO only particular instructor data show his dashboard
    app.get("/evaluateTasks", async (req, res) => {
      const query = { "appliedjobdata.isEvaluate": true };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
    });

    // update applied job
    // app.put("/appliedjob/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updateData = req.body;
    //   const query = { _id: new ObjectId(id) };
    //   const option = { upsert: true };
    //   const updateDoc = {
    //     $set: updateData,
    //   };

    //   const result = await applidejobsCollection.updateOne(
    //     query,
    //     updateDoc,
    //     option
    //   );

    //   res.send(result);
    // });

    // app.get("/applyTaskInstructor/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updateData = req.body;

    //   const query = { _id: new ObjectId(id) };
    //   const option = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       "appliedjobdata.isApplied": updateData.isApplied,
    //       "appliedjobdata.coverLetter": updateData.coverLetter,
    //       "appliedjobdata.downloadPdf:": updateData.downloadPdf,
    //     },
    //   };

    //   const result = await applidejobsCollection.updateOne(
    //     query,
    //     updateDoc,
    //     option
    //   );

    //   res.send(result);
    // });

    app.get("/applyTaskInstructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "appliedjobdata.taskId": id };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
    });

    // get single job
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // get all bookmar job by use email
    app.get("/bookmark", async (req, res) => {
      const email = req.query.email;

      const query = { BookMarkUserEmail: email };
      const result = await bookMarkJob.find(query).sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // bookMark jbos by user
    app.post("/bookmark", async (req, res) => {
      const data = req.body;
      const result = await bookMarkJob.insertOne(data);
      res.send(result);
    });

    // delete bookMark jbos by user
    app.delete("/bookmark/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "task._id": id };

      const result = await bookMarkJob.deleteOne(query);
      res.send(result);
    });

    // post a blog
    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });
    // getting all blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // getting single blog
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    // latest blog
    app.get("/blogslatest", async (req, res) => {
      const result = await blogsCollection
        .find()
        .sort({ _id: -1 })
        .limit(5)
        .toArray();
      res.send(result);
    });

    // posting testimonials feedback
    app.post("/postFeedback", async (req, res) => {
      const body = req.body;
      const result = await testimonialsCollection.insertOne(body);
      res.send(result);
      console.log(result);
    });

    // getting testimonials data
    app.get("/testimonials", async (req, res) => {
      const result = await testimonialsCollection
        .find()
        .sort({ _id: -1 })
        .limit(7)
        .toArray();
      res.send(result);
    });

    // admin dashboard
    // get all client
    app.get("/clients", async (req, res) => {
      try {
        const query = { client: true };
        const result = await usersCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching client users:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/moderators", async (req, res) => {
      try {
        const query = { moderator: true };
        const result = await usersCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching moderator users:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // get all users
    app.get("/allusers", async (req, res) => {
      const allUsers = await usersCollection.find().toArray();

      const filterUsers = allUsers.filter(
        (user) => !(user.client || user.moderator || user.admin)
      );
      res.send(filterUsers);
    });

    // delete all users

    app.delete("/allusers/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };

      const deleteUser = await usersCollection.deleteOne(query);
      res.send(deleteUser);
    });

    // social media'
    app.get("/social-media", async (req, res) => {
      const result = await SocialMediaCollection.find().toArray();
      res.send(result);
    });
    app.get("/social-media/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await SocialMediaCollection.findOne(query);
      res.send(result);
    });
    app.put("/social-media/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedSocialMedia = req.body;
      const SocialMedia = {
        $set: {
          facebook: updatedSocialMedia.facebook,
          linkedin: updatedSocialMedia.linkedin,
          instagram: updatedSocialMedia.instagram,
          twitter: updatedSocialMedia.twitter,
        },
      };
      const result = await SocialMediaCollection.updateOne(
        filter,
        SocialMedia,
        options
      );
      res.send(result);
    });

    // delete Taskhnistory route

    app.delete("/taskdelete/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };

      const result = await applidejobsCollection.deleteOne(query);
      res.send(result);
    });
    // applicants
    app.get("/applicants", async (req, res) => {
      const result = await applicantsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.json("biomed server is on");
});

app.listen(port, () => {
  console.log(`Sports is  on Port ${port}`);
});
