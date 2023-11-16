const express = require("express")
const app = express();
const cors = require("cors")
require('dotenv').config();
const port = process.env.PORT || 5000;
//middilware
app.use(cors({
    origin: ["http://localhost:5173"],
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