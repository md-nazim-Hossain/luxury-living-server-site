const express = require('express');
const cors = require('cors');
const app = express();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const port = process.env.PORT || 5000;

//Midleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pbvyd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  
    try {
        await client.connect();
        console.log("db connected")
        const database = client.db("luxuryLiving");
        const reviewsCollection = database.collection("reviewsCustomer");
        const usersCollection = database.collection("users");
        const servicesCollection = database.collection('services');
        const orderListCollection = database.collection("orderList");
        const projectsCollection = database.collection("projects");
        

        /// GET CUSTOMER REVIEWS API
        app.get('/reviews' , async (req,res) =>{
            const reviews = reviewsCollection.find({});
            const result = await reviews.toArray();
            res.json(result);
        });

        /// GET CUSTOMER REVIEWS API
        app.get('/orderList' , async (req,res) =>{
            const cursor = orderListCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let orderList;
            const count = await cursor.count();

            if(page){
                orderList = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                orderList = await cursor.toArray();
            }
            res.json({count,orderList});
        });

        /// GET CUSTOMER REVIEWS API
        app.get('/orderList/:email' , async (req,res) =>{
            const email = req.params.email;
            const orderList = orderListCollection.find({email});
            const result = await orderList.toArray();
            res.json(result);
        });

        //SERVICES GET API
        app.get('/services', async (req, res) =>{
            const services = servicesCollection.find({});
            const  result = await services.toArray();
            res.json(result);
        });

        //GET SERVICE BY ID
        app.get('/services/:serviceId', async (req, res) =>{
            const id = req.params.serviceId;
            const query = { _id:ObjectId(id)};
            const result = await servicesCollection.findOne(query);
            res.json(result);
        });
        
        //PROJECTS GET API
        app.get('/projects', async (req, res) =>{
            const projects = projectsCollection.find({});
            const  result = await projects.toArray();
            res.json(result);
        });

        //GET API USER ROLE
        app.get('/users/:email', async (req, res) =>{
            const email = req.params.email;
            const query = {email};
            const result = await usersCollection.findOne(query);
            let isAdmin;
            if(result?.role === "admin"){
                isAdmin = true;
            }else{
                isAdmin = false
            }
            res.json({admin:isAdmin});
        });
        
        //ADD SERVICE CLIENT TO DB 
        app.post('/services', async (req ,res) =>{
            const service = req.body;
            const result = await servicesCollection.insertOne(service);
            res.json(result);
        });

        // CUSTOMER OrderList Info
        app.post('/orderList', async (req, res) =>{
            const orderInfo = req.body;
            const result = await orderListCollection.insertOne(orderInfo);
            res.json(result);
        });

        //POST REVIEWS FROM CLIENT SIDE TO DB API
        app.post('/reviews', async (req, res) =>{
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });

        //POST USERS FROM CLIENT TO DB
        app.post('/users', async (req,res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.json(result);
        });

        ///PAYMENT INTREGRATION
        app.post("/create-payment-intent", async (req, res) => {
        const  {serviceCost}  = req.body;
        const amount = serviceCost * 100;
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types:['card'],
            
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
        });

        //PUT USERS FROM CLIENT TO DB
        app.put('/users', async (req,res) =>{
            const user = req.body;
            const filter = {email:user.email}
            const options = { upsert: true };
            const updateUser = {$set:user}
            const result = await usersCollection.updateMany(filter, updateUser, options);
            res.json(result)
        });

        /// GET CUSTOMER Order API
        app.put('/orderList/:id' , async (req,res) =>{
            const getInfo = req.body;
            const id = req.params.id;
            const filter = { _id:ObjectId(id)}
            const doc ={$set:getInfo}
            const result = await orderListCollection.updateOne(filter,doc);
            res.json(result);
        });

        //Make Admin
        app.put('/users/admin', async (req,res) =>{
            const {email} = req.body;
            const filter = {email};
            const options = { upsert: true };
            const role = 'admin';
            const updateUserAdmin = {$set:{role}};
            const result = await usersCollection.updateOne(filter, updateUserAdmin, options);
            res.json(result)
        });

         /// Delete CUSTOMER Order API
         app.delete('/orderList/:id' , async (req,res) =>{
            const id = req.params.id;
            const filter = { _id:ObjectId(id)}
            const result = await orderListCollection.deleteOne(filter);
            res.json(result);
        });

         /// Delete Service API
         app.delete('/services/:id' , async (req,res) =>{
            const id = req.params.id;
            const filter = { _id:ObjectId(id)}
            const result = await servicesCollection.deleteOne(filter);
            res.json(result);
        });


    } finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


app.get('/',(req,res) =>{
    res.send("Web Projects Server is Running");
});

app.listen(port,()=>{
    console.log('Listenning Port is',port);
})