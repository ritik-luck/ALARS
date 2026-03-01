const mongoose = require('mongoose')

const IncidentSchema = new mongoose.Schema({
    title: String,
    description: String,
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    },
    status: {
        type: String,
        enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
        default: 'OPEN'
    },
    reportedBy: String
}, { timestamps: true })

module.exports = mongoose.model('Incident', IncidentSchema)