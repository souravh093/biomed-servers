//external imports
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const nodemailer = require("nodemailer");

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const sendMail = (emailData, emailAddress) => {
  // send main function
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: emailAddress,
    subject: emailData.subject,
    html: `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            body: {
                color: black;
            }
        </style>
    </head>
    <body>
        <div style="border: 1px solid black;  width: 100%">
            <div style="padding:30px;">
                <h1>Congratulation to successfully payment<h1>
                <p>Hi, ${emailData?.name}</p>
                <br>
                <p style="font-weight: 100; font-size: 16px ; line-height: 37px;  font-family: Verdana; color: #1C1E3A; font-family: Verdana;">${emailData?.subject}</p>
                <br>
                <div style="background: transparent linear-gradient(90deg, #2BAD90 0%, #00489A 100%) 0% 0% no-repeat padding-box;
                            background: transparent linear-gradient(90deg, #2BAD90 0%, #00489A 100%) 0% 0% no-repeat padding-box;
                            width: 497px; height: 133px; color: white; padding: 1px 0 10px 0;">
                        <p style="text-align: center; font-weight: 100; font-size: 20px ; line-height: 57px;  font-family: Verdana; margin: 0px;">${emailData?.message}</p>
                </div>
                <br>
                <br>
            </div>
        </div>
    </body>
    </html>`,
    // html: `<p>${emailData?.message}</p>`,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      // do something useful
    }
  });
};

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
    const evaluateCollection = client.db("biomedDB").collection("evaluate");
    const applidejobsCollection = client
      .db("biomedDB")
      .collection("appliedjobs");
    const SocialMediaCollection = client
      .db("biomedDB")
      .collection("social-media");
    const applicantsCollection = client.db("biomedDB").collection("applicants");
    const TrendingTasksDataCollection = client
      .db("biomedDB")
      .collection("TrendingTasksData");
    const categorysDataCollection = client
      .db("biomedDB")
      .collection("categorysData");
    const recentJobDataCollection = client
      .db("biomedDB")
      .collection("recentJobData");
    const testimonialsCollection = client
      .db("biomedDB")
      .collection("testimonials");
    const postsCollection = client.db("biomedDB").collection("posts");
    const aboutCollection = client.db("biomedDB").collection("about");

    const teamMembersCollection = client
      .db("biomedDB")
      .collection("teamMembers");
    const bookMarkJob = client.db("biomedDB").collection("bookMarkJob");
    const paymentCollection = client.db("biomedDB").collection("payment");

    // generate client secret
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;
      if (price) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

    // store payment data
    // payment information save in database
    app.post("/payment", verifyJWT, async (req, res) => {
      const paymentInfo = req.body;
      const result = await paymentCollection.insertOne(paymentInfo);
      // send confirmation email to the instructor
      sendMail(
        {
          subject: "Payment Successful!",
          message: `Payment Id: ${result.insertedId}, TransitionId: ${paymentInfo?.transactionId}`,
          name: paymentInfo?.name,
        },
        paymentInfo.email
      );
      res.send(result);
    });

    // create jwt token
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    // verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user?.admin) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      next();
    };

    // verifyInstructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user?.instructor) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      next();
    };

    // get all payment users
    app.get("/payment", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // get payment history in database
    app.get("/payment/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

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

    // user post count increment
    app.put("/user-post-increment/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const incrementPostCount = 1;
      const options = { upsert: true };
      const updateInfo = {
        $inc: { postCount: incrementPostCount },
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
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Search Job
    app.get("/jobSearchByTitle/:text/:industry", async (req, res) => {
      const searchText = req.params.text;
      const searchIndustry = req.params.industry;
      console.log("Search Industry:", searchIndustry);
      const textQuery = {
        $or: [{ title: { $regex: searchText, $options: "i" } }],
      };
      const categoryQuery =
        searchIndustry !== "industry" ? { industry: searchIndustry } : {};

      const result = await jobsCollection
        .find({
          $and: [textQuery, categoryQuery],
        })
        .toArray();
      res.send(result);
    });

    // post a job
    app.post("/jobs", verifyJWT, async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    app.get("/categoryJobs", async (req, res) => {
      let query = {};
      if (req.query.industry) {
        query = { industry: req.query.industry };
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // Main content don't change
    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // recent application showing in the instructor dashboard
    app.get("/recentApplications/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "appliedjobdata.instructorEmail": email };
      const result = await applidejobsCollection
        .find(query)
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get all applidejobs
    app.get("/applidejobs", async (req, res) => {
      const result = await applidejobsCollection.find().toArray();
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

    app.post("/evaluateTask", verifyJWT, verifyInstructor, async (req, res) => {
      const evaluateData = req.body;
      const result = await evaluateCollection.insertOne(evaluateData);
      res.send(result);
    });

    app.get("/getapplicantemail/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "appliedjobdata.instructorEmail": email };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/applyTaskInstructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "appliedjobdata.taskId": id };
      const result = await applidejobsCollection.find(query).toArray();
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
    app.get("/evaluateTasks/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        "appliedjobdata.isEvaluate": true,
        "appliedjobdata.instructorEmail": email,
      };
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

    // search for blogs
    app.get("/blogSearch/:text", async (req, res) => {
      const searchText = req.params.text;
      const result = await blogsCollection
        .find({
          $or: [
            { title: { $regex: searchText, $options: "i" } },
            { writer: { $regex: searchText, $options: "i" } },
          ],
        })
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

    // Community Features API's
    // posting share post

    app.post("/communityPosts", async (req, res) => {
      const postData = req.body;
      const result = await postsCollection.insertOne(postData);
      res.send(result);
    });

    // getting all post data
    app.get("/posts", async (req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result);
    });

    // getting single post data
    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    });

    // delete single post
    app.delete("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    });

    // update single post
    app.patch("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatePost = {
        $set: {
          photo: body.photo,
          title: body.title,
          desc: body.desc,
        },
      };
      const result = await postsCollection.updateOne(filter, updatePost);
      res.send(result);
    });

    // Favourite Posts API
    app.post("/favouritePosts", async (req, res) => {
      const postData = req.body;
      const result = await favouritePostsCollection.insertOne(postData);
      res.send(result);
    });

    // Getting Favourite Posts
    app.get("/favouritePosts/:userEmail", async (req, res) => {
      const userEmail = req.params.userEmail;

      try {
        const userFavorites = await favouritePostsCollection
          .find({ userEmail: userEmail })
          .toArray();

        res.json(userFavorites);
      } catch (error) {
        console.error("Error fetching user favorites:", error);
        res.status(500).json({ error: "Failed to fetch user favorites" });
      }
    });

    // // Delete a favorited post
    app.delete("/favouritePosts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { "post._id": id };
      const result = await favouritePostsCollection.deleteOne(query);
      res.send(result);
    });

    // store apply job
    app.post("/appliedjob", async (req, res) => {
      const appliedjobdata = req.body;

      const result = await applidejobsCollection.insertOne({ appliedjobdata });
      res.send(result);
    });

    // admin dashboard
    // get all client
    app.get("/clients", verifyJWT, verifyAdmin, async (req, res) => {
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

    app.get("/allusers", verifyJWT, verifyAdmin, async (req, res) => {
      const allUsers = await usersCollection.find().toArray();

      const filterUsers = allUsers.filter(
        (user) => !(user.client || user.moderator || user.admin)
      );
      res.send(filterUsers);
    });

    app.get("/allappliedtask", async (req, res) => {
      const result = await applidejobsCollection.find().toArray();
      res.send(result);
    });

    app.put("/put/appliedtask/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };

      try {
        const result = await applidejobsCollection.updateOne(
          query,
          {
            $push: {
              "appliedjobdata.message": data,
            },
          },
          options
        );

        if (result.modifiedCount === 1) {
          return res
            .status(200)
            .json({ message: "Message added successfully" });
        } else {
          return res.status(404).json({ error: "Document not found" });
        }
      } catch (error) {
        console.error("Error adding message:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // message routes
    app.get("/get/appliedtask/:email", async (req, res) => {
      let email = req.params.email;
      const query = { "appliedjobdata.instrucurEmail": email };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/get/appliedtask/:email", async (req, res) => {
      let email = req.params.email;
      const query = { email: email };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
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
    // About details update API
    app.put("/aboutDetails", async (req, res) => {
      const data = req.body;
      const query = {};
      const options = { upsert: false };
      const updateAbout = {
        $set: data,
      };
      const result = await aboutCollection.updateOne(
        query,
        updateAbout,
        options
      );
      res.send(result);
    });

    // getting about us data
    app.get("/aboutDetails", async (req, res) => {
      const result = await aboutCollection.find().toArray();
      res.send(result);
    });

    // delete Task history route
    // applicants
    app.get("/applicants", async (req, res) => {
      const result = await applicantsCollection.find().toArray();
      res.send(result);
    });

    // Treading Task
    app.get("/trendingtask", async (req, res) => {
      const result = await jobsCollection
        .find()
        .sort({ appliedCount: -1 })
        .limit(7)
        .toArray();
      res.send(result);
    });

    app.get("/recenttask", async (req, res) => {
      const result = await jobsCollection
        .find()
        .sort({ _id: -1 })
        .limit(8)
        .toArray();
      res.send(result);
    });

    // categorysData
    app.get("/categorysData", async (req, res) => {
      const result = await categorysDataCollection.find().toArray();
      res.send(result);
    });

    // recentJobData
    app.get("/recentJobData", async (req, res) => {
      const result = await recentJobDataCollection.find().toArray();
      res.send(result);
    });

    // post collection insert
    app.put("/communityPosts/:email", async (req, res) => {
      const email = req.params.email;
      const postData = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updatePost = {
        $set: postData,
      };

      const result = await postsCollection.updateOne(
        query,
        updatePost,
        options
      );
      res.send(result);
    });

    // posting team member
    app.post("/teamMembers", async (req, res) => {
      const body = req.body;
      const result = await teamMembersCollection.insertOne(body);
      res.send(result);
    });

    // getting all team members
    app.get("/teamMembers", async (req, res) => {
      const result = await teamMembersCollection.find().toArray();
      res.send(result);
    });

    // bookmark the task
    app.post("/bookmark", async (req, res) => {
      const data = req.body;
      const result = await bookMarkJob.insertOne(data);
      res.send(result);
    });

    // appliedtask by user
    app.get("/user/appliedtask/:email", async (req, res) => {
      let email = req.params.email;
      const query = { "appliedjobdata.email": email };
      const result = await applidejobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/getAppliedById/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applidejobsCollection.findOne(query);
      res.send(result);
    });

    // search community posts
    app.get("/postSearch/:text", async (req, res) => {
      const searchText = req.params.text;
      const result = await postsCollection
        .find({
          $or: [
            { title: { $regex: searchText, $options: "i" } },
            { name: { $regex: searchText, $options: "i" } },
          ],
        })
        .toArray();
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
