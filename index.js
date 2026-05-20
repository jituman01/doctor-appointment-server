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
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  // console.log("Token found:", token ? "YES (Token Found)" : "NO (Token Missing)");

  if (!token) {
    return res.status(401).json({ message: " Token missing" });
  }

  req.user = { email: "verified" }; 
  next();
};


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db('docappoint');
    const appointmentCollection = db.collection('doctor');


    const bookingCollection = db.collection('bookings');
    const userCollection = db.collection("user");


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
  
  let query = {};
  if (search) {
    query = { name: { $regex: search, $options: 'i' } };
  }

  const result = await appointmentCollection.find(query).toArray();
  
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

    
  app.delete("/bookings/:appointmentId",verifyToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const result = await bookingCollection.deleteOne({ _id: new ObjectId(appointmentId) });

    if (result.deletedCount > 0) {
      res.send({ success: true, message: 'Appointment deleted successfully!' });
    } else {
      res.status(404).send({ message: 'Appointment not found' });
    }
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
    
    
app.patch("/bookings/:appointmentId",verifyToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const bookingsData = req.body;

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const isExist = await bookingCollection.findOne({ _id: new ObjectId(appointmentId) });
    if (!isExist) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      {
        $set: {
          patientName: bookingsData.patientName,
          phone: bookingsData.phone,
          appointmentDate: bookingsData.appointmentDate,
          appointmentTime: bookingsData.appointmentTime,
          updatedAt: new Date() 
        }
      }
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      res.send({ success: true, message: 'Appointment updated successfully!' });
    } else {
      res.status(400).send({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

    
    

  app.patch("/users/:email",verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    const { name, photoURL } = req.body;
    if (!name || !photoURL) {
      return res.status(400).json({ success: false, message: "Name and Photo URL are required" });
    }
    const filter = { email: email };
    const updateDoc = {
      $set: {
        name: name,
        image: photoURL,
      },
    };

    const result = await userCollection.updateOne(filter, updateDoc);
    if (result.modifiedCount > 0 || result.matchedCount > 0){
    return res.send({ success: true, message: "Profile updated successfully!" });
    }
    else {
      return res.status(400).send({ success: false, message: "No changes made" });
    }
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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