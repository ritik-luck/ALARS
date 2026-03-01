require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const incidentRoutes = require('./routes/incidentRoutes')

const app = express()
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err))

app.use('/api/incidents', incidentRoutes)

const PORT = process.env.PORT || 5001
app.listen(PORT, () => console.log(`Incident Service running on ${PORT}`))