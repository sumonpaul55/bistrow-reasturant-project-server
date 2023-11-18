const express = require("express")
const app = express();
const cors = require("cors")
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
//middilware
app.use(cors({
    origin: ["http://localhost:5173", "https://api.imgbb.com"],
    credentials: true
}))
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nrfwsc1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const menuCollections = client.db("bistrowBoss").collection("menus")
        const usersCollections = client.db("bistrowBoss").collection("users")
        const reviewCollection = client.db("bistrowBoss").collection("reviews")
        const cartCollections = client.db("bistrowBoss").collection("carts")
        // users related apis
        // jwt related api
        app.post("/jwt", async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" })
            res.send({ token })
        })
        // middleware
        // verify token middlewares
        const verifyToken = (req, res, next) => {
            // console.log("inside verify token", req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: `Unauthorized access` })
            }
            const token = req.headers.authorization.split(" ")[1];
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: `Unauthorized access` })
                }
                req.decoded = decoded;
                next()
            })
        }
        // use verify admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollections.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            next();
        }

        // user role related apis
        app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await usersCollections.updateOne(query, updatedDoc)
            res.send(result)
        })

        // delete user api
        app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollections.deleteOne(query)
            res.send(result)
        })
        // get users for admin dashboard
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollections.find().toArray();
            res.send(result)
        })
        // users admin related apis
        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            const query = { email: email }
            const user = await usersCollections.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }
            res.send({ admin })
        })

        // stor user database
        app.post("/users", async (req, res) => {
            const user = req.body;
            // insert email is it doesn't exist
            // You can do this many ways(1. email uniqe, 2. upsert, 3. simple checking)
            const query = { email: user.email }
            const existingUser = await usersCollections.findOne(query)
            if (existingUser) {
                return res.send({ message: "User already axist", insertedId: null })
            }
            const result = await usersCollections.insertOne(user)
            res.send(result)
        })

        // getting data specific users cartdata
        app.get("/carts", async (req, res) => {
            const userEmail = req.query.email
            const query = { userEmail: userEmail }
            const result = await cartCollections.find(query).toArray();
            res.send(result)
        })
        // get menus api
        app.get("/menu", async (req, res) => {
            const result = await menuCollections.find().toArray();
            res.send(result)
        })
        // adding menu items to the menu

        // adding menu items 
        app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
            const menuitems = req.body;
            const result = await menuCollections.insertOne(menuitems)
            res.send(result)
        })
        // reviews related api
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        // post method carts collections
        app.post("/carts", async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollections.insertOne(cartItem)
            res.send(result)
        })

        // delete from cart apis
        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollections.deleteOne(query);
            res.send(result)
        })










        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`bistrow boss is runnig from port (${port})`)
})