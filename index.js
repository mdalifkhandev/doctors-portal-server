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


    } finally {

    }

}
run().catch(console.dir);

app.get("/", async (req, res) => {
    res.send("Doctor portal server site is rinning ..............");
});

app.listen(port, () => console.log(`Doctor portal rinning is ${port}`));