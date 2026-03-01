const { sendEmail } = require('../services/emailService')

exports.sendNotification = async (req, res) => {
    try {
        const { message, severity } = req.body

        await sendEmail(
            `ALARS Alert - ${severity}`,
            message
        )

        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}