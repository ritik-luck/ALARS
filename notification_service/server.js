require('dotenv').config()
const express = require('express')
const notificationRoutes = require('./routes/notificationRoutes')

const app = express()
app.use(express.json())

app.use('/api/notify', notificationRoutes)

const PORT = process.env.PORT || 5002
app.listen(PORT, () => console.log(`Notification Service running on ${PORT}`))