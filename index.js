const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

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
    const blogsCollection = client.db("biomedDB").collection("blogs");
    const applidejobsCollection= client.db("biomedDB").collection("appliedjobs");
    const SocialMediaCollection = client.db("biomedDB").collection("social-media");
    const applicantsCollection = client.db("biomedDB").collection("applicants");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.admin !== true && user?.moderator !== true) {
          return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

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

    // get all applidejobs
    app.get("/applidejobs", async (req, res) => {
      const result = await applidejobsCollection.find().toArray();
      res.send(result);
    });

    // get single job
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await jobsCollection.findOne(query);
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
    app.get('/blogs/:id', async (req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await blogsCollection.findOne(query);
      res.send(result)
    })

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
    app.put('/social-media/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert : true};
      const updatedSocialMedia = req.body;
      const SocialMedia = {
          $set: {
            facebook: updatedSocialMedia.facebook,
            linkedin: updatedSocialMedia.linkedin,
            instagram: updatedSocialMedia.instagram,
            twitter: updatedSocialMedia.twitter
          }
      }
      const result = await SocialMediaCollection.updateOne(filter,SocialMedia,options);
      res.send(result);
  })

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
  res.send("biomed server is on");
});

app.listen(port, () => {
  console.log(`Sports is  on Port ${port}`);
});
