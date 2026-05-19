const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const express = require('express')
const dotenv = require('dotenv');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const app = express()
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 8080




const uri = process.env.MONGODB_URI

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
  
)
// console.log(JWKS, "JWKS");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const logger = (req, res, next) => {
  console.log(`${req.method} | ${req.url}`);
  next()
      
};

const verifyToken = async (req, res, next) => {
  const { authorization}=req.headers
  // console.log(req.headers,"from verify token");
  const token = authorization?.split(" ")[1];
  console.log(token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    const { payload } = await jwtVerify(token, JWKS);
    // return payload
    req.user = payload;
    console.log(req.user);
    next();
  }
  
  catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({ message: "Unauthorized" });
  }

  

  
  
}




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db('docappoint');
    const appointmentCollection = db.collection('doctor');


    const bookingCollection = db.collection('bookings');

    app.post('/bookings', async (req, res) => {
      try {
        const bookingData = req.body;
        
        if (!bookingData.userEmail || !bookingData.doctorName || !bookingData.patientName) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        const result = await bookingCollection.insertOne(bookingData);
        
        res.status(201).send({ 
          success: true, 
          message: "Appointment booked successfully!", 
          insertedId: result.insertedId 
        });
      } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });



    app.get('/appointments', async (req, res) => {
      const { search } = req.query;
      let cursor;
      if (!search) {
        
      }
      // console.log(req.query);
      
       cursor = appointmentCollection.find();
      const result = await cursor.toArray();
      // console.log(result);
      res.send(result);
    });

    app.get('/appointments/:appointmentId', logger, verifyToken,
      async (req, res,) => {
        console.log(req.user, "req");
        
        const { appointmentId } = req.params;
        // console.log(appointmentId);
        const query = { _id: new ObjectId(appointmentId) }
        const result = await appointmentCollection.findOne(query);
        res.send(result);
      
      });



  app.get('/bookings', async (req, res) => {
  try {
    const { email } = req.query;
    let query = {};
    
    if (email) {
      query = { userEmail: email };
    }

    const result = await bookingCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error("Somethings Error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
