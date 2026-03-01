const express = require('express')
const {
    createIncident,
    getAllIncidents,
    updateIncidentStatus
} = require('./incident_controller')

const router = express.Router()

router.post('/', createIncident)
router.get('/', getAllIncidents)
router.put('/:id/status', updateIncidentStatus)
router.patch('/:id/status', updateIncidentStatus)

module.exports = router
