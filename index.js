const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECKRET_KE);
const app = express();

//middlewere
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.m6hhp6r.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }, });

function veryfyjwt(req, res, next) {
    const authorizition = req.headers.authorizition;
    if (!authorizition) {
        return res.status(401).send("unauthorizition access");
    }
    const token = authorizition.split(" ")[1];

    jwt.verify(token, process.env.TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {

        const appointnmentoptioncullection = client.db("doctors-portal").collection("appointnmentoption");
        const bookingscullection = client.db("doctors-portal").collection("bookings");
        const userscullection = client.db("doctors-portal").collection("users");
        const doctorscullection = client.db("doctors-portal").collection("doctors");
        const paymentcullection = client.db("doctors-portal").collection("payment");



        app.get("/appointnmentoption", async (req, res) => {
            const query = {};
            const date = req.query.date;
            const option = await appointnmentoptioncullection.find(query).toArray();
            const bookingquery = { appointmentdate: date };
            const alradybooked = await bookingscullection.find(bookingquery).toArray();
            option.forEach((option) => {
                const optionbooked = alradybooked.filter(
                    (book) => book.tretnmentname === option.name
                );
                const boolslot = optionbooked.map((book) => book.time);
                const remaningslot = option.slots.filter(
                    (slot) => !boolslot.includes(slot)
                );
                option.slots = remaningslot;
            });
            console.log(query);
            res.send(option);
        });

        app.get("/appointnmenspecialty", async (req, res) => {
            const query = {};
            const resualt = await appointnmentoptioncullection.find(query).project({ name: 1 }).toArray();
            res.send(resualt);
          });

          app.get("/bookings", veryfyjwt, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userscullection.findOne(query);
            if (!user?.role) {
              const resualt = await bookingscullection.find(query).toArray();
              res.send(resualt);
            } else {
              const querys = {};
              const resualt = await bookingscullection.find(querys).toArray();
              res.send(resualt);
            }
          });
      
          app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const resualt = await bookingscullection.findOne(query);
            res.send(resualt);
          });
          app.post("/bookings", async (req, res) => {
            const booking = req.body;
            const query = {
              appointmentdate: booking.appointmentdate,
              tretnmentname: booking.tretnmentname,
              email: booking.email,
            };
            const alradybooked = await bookingscullection.find(query).toArray();
            console.log(alradybooked);
            if (alradybooked.length) {
              const message = `You already have a booking on ${booking.appointmentdate}`;
              return res.send({ acknowledged: false, message });
            }
      
            const resualt = await bookingscullection.insertOne(booking);
            res.send(resualt);
          });
      
          app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: "usd",
              automatic_payment_methods: {
                enabled: true,
              },
            });
            res.send({
              clientSecret: paymentIntent.client_secret,
            });
          });
      
          app.post("/payments", async (req, res) => {
            const payment = req.body
            console.log(payment);
            const resualt = await paymentcullection.insertOne(payment)
            const id = payment.bookingId
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
            const updatedResult = await bookingscullection.updateOne(filter, updatedDoc)
            res.send(resualt)
          })
      
          app.get("/jwt", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userscullection.findOne(query);
            if (user) {
              const token = jwt.sign({ email }, process.env.TOKEN, {
                expiresIn: "1h",
              });
              return res.send({ accessToken: token });
            }
            console.log(user);
            res.status(403).send({ accessToken: "" });
          });
      
          app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userscullection.findOne(query);
            res.send({ isAdmin: user?.role === "admin" });
          });
      
          app.put("/users/admin/:id", veryfyjwt, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userscullection.findOne(query);
            console.log(user, decodedEmail);
            if (user?.role !== "admin") {
              return res.status(401).send({ message: "forbiden access" });
            }
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updatedoc = {
              $set: {
                role: "admin",
              },
            };
            const resualt = await userscullection.updateOne(
              filter,
              updatedoc,
              option
            );
            res.send(resualt);
          });
      
          //adfadf
      
          app.post("/users", async (req, res) => {
            const user = req.body;
            const resualt = await userscullection.insertOne(user);
            console.log(resualt);
            res.send(resualt);
          });
          app.get("/users", async (req, res) => {
            const query = {};
            const resualt = await userscullection.find(query).toArray();
            res.send(resualt);
          });
      
          app.post("/doctors", async (req, res) => {
            const doctor = req.body;
            const resualt = await doctorscullection.insertOne(doctor);
            res.send(resualt);
          });
          app.get("/doctors", async (req, res) => {
            const query = {};
            const resualt = await doctorscullection.find(query).toArray();
            res.send(resualt);
          });
          app.delete("/doctors/:id", veryfyjwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const resualt = await doctorscullection.deleteOne(filter);
            res.send(resualt);
          });


    } finally {

    }

}
run().catch(console.dir);

app.get("/", async (req, res) => {
    res.send("Doctor portal server site is rinning ..............");
});

app.listen(port, () => console.log(`Doctor portal rinning is ${port}`));