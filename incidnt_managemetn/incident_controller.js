const Incident = require('../models/Incident')
const axios = require('axios')

exports.createIncident = async (req, res) => {
    try {
        const incident = await Incident.create(req.body)

        // Notify Notification Service
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notify`, {
            message: `New Incident Created: ${incident.title}`,
            severity: incident.severity
        })

        res.status(201).json(incident)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.getAllIncidents = async (req, res) => {
    try {
        const incidents = await Incident.find()
        res.json(incidents)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.updateIncidentStatus = async (req, res) => {
    try {
        const { status } = req.body
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )

        res.json(incident)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}