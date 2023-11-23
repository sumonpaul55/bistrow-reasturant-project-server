const express = require("express")
const app = express();
const cors = require("cors")
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
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
        const paymentCollections = client.db("bistrowBoss").collection("payments")
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
        // get menu for update
        app.get("/updateItems/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollections.findOne(query);
            res.send(result)
        })
        // menu update apis
        app.patch("/menu/:id", async (req, res) => {
            const id = req.params.id;
            const items = req.body;
            const filter = { _id: new ObjectId(id) }
            const updateableData = {
                name: items.name,
                category: items.category,
                price: items.price,
                recipe: items.recipe,
            }
            if (items.image) {
                updateableData.image = items.image
            }
            const updateDocs = {
                $set: updateableData
            }
            // console.log(updateDocs)
            const result = await menuCollections.updateOne(filter, updateDocs)
            res.send(result)
        })

        // adding menu items 
        app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
            const menuitems = req.body;
            const result = await menuCollections.insertOne(menuitems)
            res.send(result)
        })
        // delete menu api
        app.delete("/menu/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollections.deleteOne(query)
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
        // payment history apis
        app.get("/payment/:email", verifyToken, async (req, res) => {
            const query = { email: req.params.email }

            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            const result = await paymentCollections.find(query).toArray();
            res.send(result)
        })
        // pament intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            // console.log(price)
            const amount = parseInt(price * 100);
            if (!price || price < 1) return;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.post("/payment", async (req, res) => {
            const payment = req.body;
            payment.menuItemIds = payment.menuItemIds.map((item) => new ObjectId(item))
            // console.log(payment)
            const paymentResult = await paymentCollections.insertOne(payment)
            // carefully delete each items from the cart
            // console.log("payment info", payment)
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            }
            const deleteResult = await cartCollections.deleteMany(query)
            res.send({ paymentResult, deleteResult })
        })
        //stats or analytics
        app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
            try {
                const user = await usersCollections.estimatedDocumentCount();
                const menuItems = await menuCollections.estimatedDocumentCount();
                // this is the not best // we should query with payment confirm and not possibility for refund
                const payments = await paymentCollections.find().toArray();
                // const revenue = payments.reduce((accomulated, items) => accomulated + parseFloat(items.price), 0)
                const result = await paymentCollections.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: "$price"
                            }
                        }
                    }
                ]).toArray();

                const revenue = result.length > 0 ? result[0].totalRevenue : 0;

                const orders = await cartCollections.estimatedDocumentCount();
                res.send({
                    user, menuItems, orders, revenue
                })
            } catch (err) {
                res.status(500).send({ message: `${err}` })
            }
        })

        // using aggrate pipeline
        app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
            const result = await paymentCollections.aggregate([
                {
                    $unwind: "$menuItemIds"
                },
                {
                    $lookup: {
                        from: "menus",
                        localField: "menuItemIds",
                        foreignField: "_id",
                        as: "sumon"
                    }
                },
                {
                    $unwind: "$sumon"
                },
                {
                    $group: {
                        _id: "$sumon.category",
                        quantity: { $sum: 1 },
                        revenue: { $sum: "$sumon.price" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id",
                        quantity: "$quantity",
                        revenue: "$revenue"
                    }
                }
            ]).toArray()
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